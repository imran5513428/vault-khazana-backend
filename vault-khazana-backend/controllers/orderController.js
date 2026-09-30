import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

// ========================
// CREATE ORDER
// ========================

export const createOrder = asyncHandler(async (req, res, next) => {
  const {
    items,
    shippingAddress,
    billingAddress,
    paymentMethod,
    notes
  } = req.body;

  // Validation
  if (!items || !Array.isArray(items) || items.length === 0) {
    return next(new AppError('Please provide order items', 400));
  }

  if (!shippingAddress) {
    return next(new AppError('Please provide shipping address', 400));
  }

  if (!paymentMethod) {
    return next(new AppError('Please select a payment method', 400));
  }

  // Validate items and calculate totals
  let subtotal = 0;
  const validatedItems = [];

  for (const item of items) {
    const product = await Product.findById(item.productId);

    if (!product) {
      return next(new AppError(`Product ${item.productId} not found`, 404));
    }

    if (!product.inStock) {
      return next(new AppError(`${product.name} is out of stock`, 400));
    }

    // Validate quantity
    const validation = product.validateQuantity(item.quantity);
    if (!validation.valid) {
      return next(new AppError(`${product.name}: ${validation.error}`, 400));
    }

    const itemTotal = product.pricePerUnit * item.quantity;
    subtotal += itemTotal;

    validatedItems.push({
      productId: product._id,
      productName: product.name,
      quantity: item.quantity,
      pricePerUnit: product.pricePerUnit,
      subtotal: itemTotal
    });
  }

  // Calculate totals
  const shippingCost = subtotal > 5000 ? 0 : 250; // Free shipping over 5000
  const tax = subtotal * 0.17; // 17% GST in Pakistan
  const total = subtotal + shippingCost + tax;

  // Create order
  const order = await Order.create({
    userId: req.user._id,
    items: validatedItems,
    shippingAddress: {
      fullName: shippingAddress.fullName || req.user.getFullName(),
      email: shippingAddress.email || req.user.email,
      phone: shippingAddress.phone || req.user.phone,
      street: shippingAddress.street,
      city: shippingAddress.city,
      province: shippingAddress.province,
      postalCode: shippingAddress.postalCode,
      country: shippingAddress.country || 'Pakistan'
    },
    billingAddress: billingAddress || shippingAddress,
    subtotal,
    shippingCost,
    tax,
    total,
    paymentMethod,
    notes,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Update user stats
  const user = await User.findById(req.user._id);
  user.totalOrders = (user.totalOrders || 0) + 1;
  await user.save();

  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      total: order.total,
      status: order.orderStatus,
      paymentStatus: order.paymentStatus
    }
  });
});

// ========================
// GET ORDER BY ID
// ========================

export const getOrderById = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;

  const order = await Order.findById(orderId).populate('userId', 'firstName lastName email phone');

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  // Check authorization (user can only see their own orders)
  if (order.userId._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
    return next(new AppError('You do not have permission to view this order', 403));
  }

  res.status(200).json({
    success: true,
    data: order
  });
});

// ========================
// GET USER'S ORDERS
// ========================

export const getUserOrders = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, status } = req.query;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.max(1, Number(limit));
  const skip = (pageNum - 1) * limitNum;

  const filter = { userId: req.user._id };

  if (status) {
    filter.orderStatus = status;
  }

  const orders = await Order.find(filter)
    .sort('-createdAt')
    .skip(skip)
    .limit(limitNum)
    .select('orderNumber total orderStatus paymentStatus createdAt items');

  const total = await Order.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: orders,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalItems: total
    }
  });
});

// ========================
// GET ALL ORDERS (Admin)
// ========================

export const getAllOrders = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20, status, paymentStatus, sortBy = '-createdAt' } = req.query;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.max(1, Number(limit));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};

  if (status) {
    filter.orderStatus = status;
  }

  if (paymentStatus) {
    filter.paymentStatus = paymentStatus;
  }

  const orders = await Order.find(filter)
    .sort(sortBy)
    .skip(skip)
    .limit(limitNum)
    .populate('userId', 'firstName lastName email');

  const total = await Order.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: orders,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalItems: total
    }
  });
});

// ========================
// SEARCH ORDERS (Admin)
// ========================

export const searchOrders = asyncHandler(async (req, res, next) => {
  const { q, page = 1, limit = 20 } = req.query;

  if (!q || q.trim().length < 2) {
    return next(new AppError('Please provide a search query', 400));
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.max(1, Number(limit));
  const skip = (pageNum - 1) * limitNum;

  const searchRegex = new RegExp(q, 'i');

  const orders = await Order.find({
    $or: [
      { orderNumber: searchRegex },
      { 'shippingAddress.email': searchRegex },
      { 'shippingAddress.phone': searchRegex }
    ]
  })
    .sort('-createdAt')
    .skip(skip)
    .limit(limitNum)
    .populate('userId', 'firstName lastName email');

  const total = await Order.countDocuments({
    $or: [
      { orderNumber: searchRegex },
      { 'shippingAddress.email': searchRegex },
      { 'shippingAddress.phone': searchRegex }
    ]
  });

  res.status(200).json({
    success: true,
    data: orders,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalItems: total
    }
  });
});

// ========================
// UPDATE ORDER STATUS (Admin)
// ========================

export const updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;
  const { status, notes, trackingNumber } = req.body;

  if (!status) {
    return next(new AppError('Please provide new status', 400));
  }

  const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return next(new AppError('Invalid status', 400));
  }

  const order = await Order.findById(orderId);

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  const oldStatus = order.orderStatus;

  // Update status
  await order.updateStatus(status, notes || '');

  if (trackingNumber) {
    order.trackingNumber = trackingNumber;
    await order.save();
  }

  res.status(200).json({
    success: true,
    message: `Order status updated from ${oldStatus} to ${status}`,
    data: {
      orderNumber: order.orderNumber,
      status: order.orderStatus,
      statusHistory: order.statusHistory
    }
  });
});

// ========================
// CANCEL ORDER
// ========================

export const cancelOrder = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;
  const { reason } = req.body;

  const order = await Order.findById(orderId);

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  // Check authorization
  if (order.userId.toString() !== req.user._id.toString() && !req.user.isAdmin) {
    return next(new AppError('You do not have permission to cancel this order', 403));
  }

  // Check if can be cancelled
  if (!order.canBeCancelled()) {
    return next(new AppError('This order cannot be cancelled in its current status', 400));
  }

  // Update status
  await order.updateStatus('cancelled', reason || 'Cancelled by customer');

  res.status(200).json({
    success: true,
    message: 'Order cancelled successfully',
    data: {
      orderNumber: order.orderNumber,
      status: order.orderStatus
    }
  });
});

// ========================
// GET ORDER STATISTICS (Admin)
// ========================

export const getOrderStats = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  const filter = {};

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const totalOrders = await Order.countDocuments(filter);
  const completedOrders = await Order.countDocuments({
    ...filter,
    orderStatus: 'delivered'
  });
  const pendingOrders = await Order.countDocuments({
    ...filter,
    orderStatus: { $in: ['pending', 'confirmed', 'processing'] }
  });
  const cancelledOrders = await Order.countDocuments({
    ...filter,
    orderStatus: 'cancelled'
  });

  const revenue = await Order.aggregate([
    { $match: { ...filter, orderStatus: 'delivered' } },
    { $group: { _id: null, total: { $sum: '$total' } } }
  ]);

  const avgOrderValue = await Order.aggregate([
    { $match: filter },
    { $group: { _id: null, avg: { $avg: '$total' } } }
  ]);

  const ordersByStatus = await Order.aggregate([
    { $match: filter },
    { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
  ]);

  const ordersByPaymentMethod = await Order.aggregate([
    { $match: filter },
    { $group: { _id: '$paymentMethod', count: { $sum: 1 } } }
  ]);

  res.status(200).json({
    success: true,
    data: {
      summary: {
        totalOrders,
        completedOrders,
        pendingOrders,
        cancelledOrders,
        totalRevenue: revenue[0]?.total || 0,
        averageOrderValue: avgOrderValue[0]?.avg || 0
      },
      ordersByStatus,
      ordersByPaymentMethod
    }
  });
});