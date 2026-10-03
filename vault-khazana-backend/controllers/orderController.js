import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

// ========================
// ORDER CONFIGURATION
// ========================

const ORDER_TAX_RATE = Number(
  process.env.ORDER_TAX_RATE || 0
);

const SHIPPING_COST = Number(
  process.env.SHIPPING_COST || 250
);

const FREE_SHIPPING_THRESHOLD = Number(
  process.env.FREE_SHIPPING_THRESHOLD || 5000
);

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

  const user = req.user || null;

  // ========================
  // BASIC VALIDATION
  // ========================

  if (
    !items ||
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return next(
      new AppError(
        'Please provide order items',
        400
      )
    );
  }

  if (!shippingAddress) {
    return next(
      new AppError(
        'Please provide shipping address',
        400
      )
    );
  }

  if (!shippingAddress.fullName && !user) {
    return next(
      new AppError(
        'Please provide your full name',
        400
      )
    );
  }

  if (!shippingAddress.phone && !user) {
    return next(
      new AppError(
        'Please provide your phone number',
        400
      )
    );
  }

  if (!shippingAddress.street) {
    return next(
      new AppError(
        'Please provide your delivery address',
        400
      )
    );
  }

  if (!shippingAddress.city) {
    return next(
      new AppError(
        'Please provide your city',
        400
      )
    );
  }

  if (!paymentMethod) {
    return next(
      new AppError(
        'Please select a payment method',
        400
      )
    );
  }

  // ========================
  // PAYMENT SAFETY
  // ========================

  // COD is the only payment method
  // activated for the first real
  // ordering milestone.

  if (paymentMethod !== 'cod') {
    return next(
      new AppError(
        'This payment method is not currently available',
        400
      )
    );
  }

  // ========================
  // VALIDATE ITEMS
  // ========================

  let subtotal = 0;

  const validatedItems = [];

  for (const item of items) {

    if (!item || !item.productId) {
      return next(
        new AppError(
          'Each order item must include a productId',
          400
        )
      );
    }

    if (
      item.quantity === undefined ||
      item.quantity === null
    ) {
      return next(
        new AppError(
          `Please provide a quantity for product ${item.productId}`,
          400
        )
      );
    }

    // Never trust the frontend price.
    const product = await Product.findOne({
      id: item.productId
    });

    if (!product) {
      return next(
        new AppError(
          `Product ${item.productId} not found`,
          404
        )
      );
    }

    // Check availability.
    if (!product.isAvailable()) {
      return next(
        new AppError(
          `${product.name} is out of stock`,
          400
        )
      );
    }

    // Validate MOQ and quantity step.
    const validation =
      product.validateQuantity(
        item.quantity
      );

    if (!validation.valid) {
      return next(
        new AppError(
          `${product.name}: ${validation.error}`,
          400
        )
      );
    }

    // Calculate pricing from the database.
    const pricing =
      product.calculateTotal(
        item.quantity
      );

    if (!pricing.valid) {
      return next(
        new AppError(
          `${product.name}: ${pricing.error}`,
          400
        )
      );
    }

    const itemTotal =
      pricing.finalPrice;

    subtotal += itemTotal;

    validatedItems.push({
      productId: product.id,
      productName: product.name,
      quantity: pricing.quantity,
      pricePerUnit: pricing.unitPrice,
      subtotal: itemTotal
    });
  }

  // ========================
  // CALCULATE TOTALS
  // ========================

  const shippingCost =
    subtotal >= FREE_SHIPPING_THRESHOLD
      ? 0
      : SHIPPING_COST;

  const tax =
    Math.round(
      subtotal *
      ORDER_TAX_RATE *
      100
    ) / 100;

  const total =
    subtotal +
    shippingCost +
    tax;

  // ========================
  // CUSTOMER INFORMATION
  // ========================

  const finalShippingAddress = {
    fullName:
      shippingAddress.fullName ||
      user?.name ||
      '',

    email:
      shippingAddress.email ||
      user?.email ||
      '',

    phone:
      shippingAddress.phone ||
      user?.phone ||
      '',

    street:
      shippingAddress.street,

    city:
      shippingAddress.city,

    province:
      shippingAddress.province || '',

    postalCode:
      shippingAddress.postalCode || '',

    country:
      shippingAddress.country ||
      'Pakistan'
  };

  // ========================
  // CREATE ORDER
  // ========================

  const order = await Order.create({

    userId:
      user?._id || null,

    items:
      validatedItems,

    shippingAddress:
      finalShippingAddress,

    billingAddress:
      billingAddress || {},

    subtotal,

    shippingCost,

    tax,

    discount: 0,

    total,

    paymentMethod,

    paymentStatus: 'pending',

    orderStatus: 'pending',

    guestCheckout:
      !user,

    notes:
      notes || '',

    ip:
      req.ip || '',

    userAgent:
      req.get('user-agent') || '',

    statusHistory: [{
      status: 'pending',
      timestamp: new Date(),
      notes: 'Order created'
    }]
  });

  // ========================
  // RESPONSE
  // ========================

  res.status(201).json({
    success: true,

    message:
      'Order created successfully',

    order: {
      id: order._id,
      orderNumber: order.orderNumber,
      items: order.items,
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      tax: order.tax,
      total: order.total,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      shippingAddress:
        order.shippingAddress,
      createdAt:
        order.createdAt
    }
  });
});

// ========================
// GET ORDER BY ID
// ========================

export const getOrderById = asyncHandler(
  async (req, res, next) => {

    const order =
      await Order.findById(
        req.params.orderId
      ).populate(
        'userId',
        'name email phone'
      );

    if (!order) {
      return next(
        new AppError(
          'Order not found',
          404
        )
      );
    }

    // Users may only access their own
    // orders. Admins can access all orders.

    if (
      req.user &&
      req.user.role !== 'admin' &&
      order.userId &&
      order.userId._id.toString() !==
        req.user._id.toString()
    ) {
      return next(
        new AppError(
          'You are not authorized to view this order',
          403
        )
      );
    }

    res.json({
      success: true,
      order
    });
  }
);

// ========================
// GET USER ORDERS
// ========================

export const getUserOrders = asyncHandler(
  async (req, res) => {

    const orders =
      await Order.find({
        userId: req.user._id
      })
      .sort({
        createdAt: -1
      });

    res.json({
      success: true,
      count: orders.length,
      orders
    });
  }
);

// ========================
// GET ALL ORDERS
// ========================

export const getAllOrders = asyncHandler(
  async (req, res) => {

    const orders =
      await Order.find()
        .populate(
          'userId',
          'name email phone'
        )
        .sort({
          createdAt: -1
        });

    res.json({
      success: true,
      count: orders.length,
      orders
    });
  }
);

// ========================
// UPDATE ORDER STATUS
// ========================

export const updateOrderStatus =
  asyncHandler(
    async (req, res, next) => {

      const {
        status,
        notes
      } = req.body;

      if (!status) {
        return next(
          new AppError(
            'Please provide an order status',
            400
          )
        );
      }

      const validStatuses = [
        'pending',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled'
      ];

      if (
        !validStatuses.includes(status)
      ) {
        return next(
          new AppError(
            'Invalid order status',
            400
          )
        );
      }

      const order =
        await Order.findById(
          req.params.orderId
        );

      if (!order) {
        return next(
          new AppError(
            'Order not found',
            404
          )
        );
      }

      order.updateStatus(
        status,
        notes || ''
      );

      await order.save();

      res.json({
        success: true,
        message:
          'Order status updated successfully',
        order
      });
    }
  );

// ========================
// CANCEL ORDER
// ========================

export const cancelOrder =
  asyncHandler(
    async (req, res, next) => {

      const order =
        await Order.findById(
          req.params.orderId
        );

      if (!order) {
        return next(
          new AppError(
            'Order not found',
            404
          )
        );
      }

      if (
        req.user &&
        req.user.role !== 'admin' &&
        order.userId &&
        order.userId.toString() !==
          req.user._id.toString()
      ) {
        return next(
          new AppError(
            'You are not authorized to cancel this order',
            403
          )
        );
      }

      if (
        [
          'shipped',
          'delivered',
          'cancelled'
        ].includes(order.orderStatus)
      ) {
        return next(
          new AppError(
            'This order cannot be cancelled',
            400
          )
        );
      }

      order.updateStatus(
        'cancelled',
        req.body.notes ||
          'Order cancelled'
      );

      await order.save();

      res.json({
        success: true,
        message:
          'Order cancelled successfully',
        order
      });
    }
  );

// ========================
// ORDER STATISTICS
// ========================

export const getOrderStats =
  asyncHandler(
    async (req, res) => {

      const totalOrders =
        await Order.countDocuments();

      const pendingOrders =
        await Order.countDocuments({
          orderStatus: 'pending'
        });

      const confirmedOrders =
        await Order.countDocuments({
          orderStatus: 'confirmed'
        });

      const processingOrders =
        await Order.countDocuments({
          orderStatus: 'processing'
        });

      const shippedOrders =
        await Order.countDocuments({
          orderStatus: 'shipped'
        });

      const deliveredOrders =
        await Order.countDocuments({
          orderStatus: 'delivered'
        });

      const cancelledOrders =
        await Order.countDocuments({
          orderStatus: 'cancelled'
        });

      const revenueResult =
        await Order.aggregate([
          {
            $match: {
              orderStatus: {
                $ne: 'cancelled'
              }
            }
          },
          {
            $group: {
              _id: null,
              totalRevenue: {
                $sum: '$total'
              }
            }
          }
        ]);

      const totalRevenue =
        revenueResult.length > 0
          ? revenueResult[0].totalRevenue
          : 0;

      res.json({
        success: true,
        stats: {
          totalOrders,
          pendingOrders,
          confirmedOrders,
          processingOrders,
          shippedOrders,
          deliveredOrders,
          cancelledOrders,
          totalRevenue
        }
      });
    }
  );