import Stripe from 'stripe';
import Payment from '../models/Payment.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { paymentLogger } from '../middleware/logger.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ========================
// CREATE STRIPE PAYMENT INTENT
// ========================

export const createStripePaymentIntent = asyncHandler(async (req, res, next) => {
  const { orderId, amount } = req.body;

  if (!orderId || !amount) {
    return next(new AppError('Please provide orderId and amount', 400));
  }

  // Verify order exists
  const order = await Order.findById(orderId);
  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  // Verify user owns order
  if (order.userId.toString() !== req.user._id.toString()) {
    return next(new AppError('You do not have permission to pay for this order', 403));
  }

  // Check if payment already completed
  if (order.paymentStatus === 'completed') {
    return next(new AppError('This order has already been paid', 400));
  }

  try {
    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'pkr',
      metadata: {
        orderId: orderId,
        userId: req.user._id.toString(),
        orderNumber: order.orderNumber
      }
    });

    // Create payment record
    const payment = await Payment.create({
      orderId,
      userId: req.user._id,
      amount,
      currency: 'PKR',
      paymentMethod: 'stripe',
      status: 'pending',
      stripe: {
        paymentIntentId: paymentIntent.id
      }
    });

    paymentLogger('Stripe Intent Created', {
      amount,
      method: 'stripe',
      orderId: order.orderNumber
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
      paymentId: payment._id
    });
  } catch (error) {
    paymentLogger('Stripe Intent Failed', {
      amount,
      method: 'stripe',
      error: error.message
    });

    return next(new AppError(`Stripe error: ${error.message}`, 400));
  }
});

// ========================
// VERIFY STRIPE PAYMENT
// ========================

export const verifyStripePayment = asyncHandler(async (req, res, next) => {
  const { paymentIntentId } = req.body;

  if (!paymentIntentId) {
    return next(new AppError('Please provide paymentIntentId', 400));
  }

  try {
    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Payment failed',
        status: paymentIntent.status
      });
    }

    // Find payment record
    const payment = await Payment.findOne({
      'stripe.paymentIntentId': paymentIntentId
    });

    if (!payment) {
      return next(new AppError('Payment record not found', 404));
    }

    // Update payment
    payment.status = 'completed';
    payment.stripe.chargeId = paymentIntent.charges.data[0].id;
    payment.stripe.cardBrand = paymentIntent.charges.data[0].payment_method_details.card.brand;
    payment.stripe.cardLast4 = paymentIntent.charges.data[0].payment_method_details.card.last4;
    payment.completedAt = new Date();
    await payment.save();

    // Update order
    const order = await Order.findById(payment.orderId);
    order.paymentStatus = 'completed';
    order.paidAt = new Date();
    order.orderStatus = 'confirmed';
    await order.updateStatus('confirmed', 'Payment completed');

    // Update user stats
    const user = await User.findById(req.user._id);
    user.totalSpent = (user.totalSpent || 0) + payment.amount;
    await user.save();

    paymentLogger('Stripe Payment Verified', {
      amount: payment.amount,
      method: 'stripe',
      status: 'completed',
      orderId: order.orderNumber
    });

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        paymentId: payment._id,
        orderNumber: order.orderNumber,
        amount: payment.amount,
        status: payment.status
      }
    });
  } catch (error) {
    return next(new AppError(`Stripe error: ${error.message}`, 400));
  }
});

// ========================
// INITIATE JAZZCASH PAYMENT (Pakistan)
// ========================

export const initiateJazzCashPayment = asyncHandler(async (req, res, next) => {
  const { orderId, phoneNumber } = req.body;

  if (!orderId || !phoneNumber) {
    return next(new AppError('Please provide orderId and phoneNumber', 400));
  }

  // Verify order exists
  const order = await Order.findById(orderId);
  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  // Verify user owns order
  if (order.userId.toString() !== req.user._id.toString()) {
    return next(new AppError('You do not have permission to pay for this order', 403));
  }

  // Create payment record
  const payment = await Payment.create({
    orderId,
    userId: req.user._id,
    amount: order.total,
    currency: 'PKR',
    paymentMethod: 'jazzcash',
    status: 'pending',
    jazzcash: {
      phoneNumber
    }
  });

  paymentLogger('JazzCash Initiated', {
    amount: order.total,
    method: 'jazzcash',
    orderId: order.orderNumber,
    phone: phoneNumber
  });

  res.status(200).json({
    success: true,
    message: 'JazzCash payment initiated',
    data: {
      paymentId: payment._id,
      orderNumber: order.orderNumber,
      amount: order.total,
      phoneNumber,
      instructions: 'A confirmation code will be sent to your JazzCash account'
    }
  });
});

// ========================
// VERIFY JAZZCASH PAYMENT
// ========================

export const verifyJazzCashPayment = asyncHandler(async (req, res, next) => {
  const { paymentId, transactionId, responseCode } = req.body;

  if (!paymentId || !transactionId) {
    return next(new AppError('Please provide paymentId and transactionId', 400));
  }

  // Find payment
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    return next(new AppError('Payment not found', 404));
  }

  // In real implementation, verify with JazzCash API
  // For now, we'll accept if responseCode indicates success
  if (responseCode !== '000') {
    payment.status = 'failed';
    payment.jazzcash.responseCode = responseCode;
    await payment.save();

    return res.status(400).json({
      success: false,
      message: 'JazzCash payment failed',
      responseCode
    });
  }

  // Update payment
  payment.status = 'completed';
  payment.jazzcash.transactionId = transactionId;
  payment.jazzcash.responseCode = responseCode;
  payment.completedAt = new Date();
  await payment.save();

  // Update order
  const order = await Order.findById(payment.orderId);
  order.paymentStatus = 'completed';
  order.paidAt = new Date();
  await order.updateStatus('confirmed', 'JazzCash payment completed');

  // Update user stats
  const user = await User.findById(req.user._id);
  user.totalSpent = (user.totalSpent || 0) + payment.amount;
  await user.save();

  paymentLogger('JazzCash Payment Verified', {
    amount: payment.amount,
    method: 'jazzcash',
    status: 'completed',
    orderId: order.orderNumber
  });

  res.status(200).json({
    success: true,
    message: 'JazzCash payment verified successfully',
    data: {
      paymentId: payment._id,
      orderNumber: order.orderNumber,
      amount: payment.amount,
      status: payment.status
    }
  });
});

// ========================
// STRIPE WEBHOOK
// ========================

export const handleStripeWebhook = asyncHandler(async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    return next(new AppError(`Webhook error: ${error.message}`, 400));
  }

  // Handle different event types
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    
    // Find and update payment
    const payment = await Payment.findOne({
      'stripe.paymentIntentId': paymentIntent.id
    });

    if (payment) {
      payment.status = 'completed';
      await payment.save();

      // Update order
      const order = await Order.findById(payment.orderId);
      if (order && order.paymentStatus !== 'completed') {
        order.paymentStatus = 'completed';
        await order.updateStatus('confirmed', 'Webhook payment confirmed');
      }
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object;
    
    const payment = await Payment.findOne({
      'stripe.paymentIntentId': paymentIntent.id
    });

    if (payment) {
      payment.status = 'failed';
      payment.errorMessage = paymentIntent.last_payment_error?.message;
      await payment.save();
    }
  }

  res.status(200).json({ received: true });
});

// ========================
// REFUND PAYMENT (Admin)
// ========================

export const refundPayment = asyncHandler(async (req, res, next) => {
  const { paymentId } = req.params;
  const { amount, reason } = req.body;

  const payment = await Payment.findById(paymentId);
  if (!payment) {
    return next(new AppError('Payment not found', 404));
  }

  if (!payment.canBeRefunded()) {
    return next(new AppError('This payment cannot be refunded', 400));
  }

  const refundAmount = amount || payment.amount;

  if (refundAmount > payment.amount) {
    return next(new AppError('Refund amount exceeds payment amount', 400));
  }

  try {
    if (payment.paymentMethod === 'stripe' && payment.stripe.chargeId) {
      // Process Stripe refund
      const refund = await stripe.refunds.create({
        charge: payment.stripe.chargeId,
        amount: Math.round(refundAmount * 100)
      });

      payment.refundTransactionId = refund.id;
    }

    // Update payment
    await payment.refund(refundAmount, reason);

    // Update order
    const order = await Order.findById(payment.orderId);
    await order.updateStatus('cancelled', `Refund processed: ${reason}`);

    paymentLogger('Payment Refunded', {
      amount: refundAmount,
      method: payment.paymentMethod,
      orderId: order.orderNumber
    });

    res.status(200).json({
      success: true,
      message: 'Payment refunded successfully',
      data: {
        paymentId: payment._id,
        refundAmount,
        refundId: payment.refundTransactionId
      }
    });
  } catch (error) {
    return next(new AppError(`Refund error: ${error.message}`, 400));
  }
});

// ========================
// GET PAYMENT HISTORY
// ========================

export const getPaymentHistory = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.max(1, Number(limit));
  const skip = (pageNum - 1) * limitNum;

  const payments = await Payment.find({ userId: req.user._id })
    .sort('-createdAt')
    .skip(skip)
    .limit(limitNum)
    .select('orderId amount paymentMethod status createdAt completedAt');

  const total = await Payment.countDocuments({ userId: req.user._id });

  res.status(200).json({
    success: true,
    data: payments,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalItems: total
    }
  });
});

// ========================
// GET PAYMENT DETAILS
// ========================

export const getPaymentDetails = asyncHandler(async (req, res, next) => {
  const { paymentId } = req.params;

  const payment = await Payment.findById(paymentId);
  if (!payment) {
    return next(new AppError('Payment not found', 404));
  }

  // Check authorization
  if (payment.userId.toString() !== req.user._id.toString() && !req.user.isAdmin) {
    return next(new AppError('You do not have permission to view this payment', 403));
  }

  res.status(200).json({
    success: true,
    data: payment
  });
});