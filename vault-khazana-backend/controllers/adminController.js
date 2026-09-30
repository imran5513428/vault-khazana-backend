import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

// ========================
// ADMIN DASHBOARD
// ========================

export const getDashboardStats = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  const filter = {};
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  // Get counts
  const totalUsers = await User.countDocuments();
  const totalProducts = await Product.countDocuments();
  const totalOrders = await Order.countDocuments(filter);
  const totalPayments = await Payment.countDocuments(filter);

  // Get revenue
  const revenueData = await Order.aggregate([
    { $match: { ...filter, orderStatus: 'delivered' } },
    { $group: { _id: null, total: { $sum: '$total' } } }
  ]);

  const totalRevenue = revenueData[0]?.total || 0;

  // Get order breakdown
  const orderBreakdown = await Order.aggregate([
    { $match: filter },
    { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
  ]);

  // Get payment breakdown
  const paymentBreakdown = await Payment.aggregate([
    { $match: filter },
    { $group: { _id: '$paymentMethod', count: { $sum: 1 } } }
  ]);

  // Get recent orders
  const recentOrders = await Order.find(filter)
    .sort('-createdAt')
    .limit(5)
    .select('orderNumber total orderStatus paymentStatus createdAt');

  // Get top products
  const topProducts = await Order.aggregate([
    { $match: filter },
    { $unwind: '$items' },
    { $group: {
      _id: '$items.productId',
      name: { $first: '$items.productName' },
      totalSold: { $sum: '$items.quantity' },
      revenue: { $sum: '$items.subtotal' }
    }},
    { $sort: { totalSold: -1 } },
    { $limit: 5 }
  ]);

  res.status(200).json({
    success: true,
    data: {
      summary: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalPayments,
        totalRevenue
      },
      orderBreakdown,
      paymentBreakdown,
      recentOrders,
      topProducts
    }
  });
});

// ========================
// MANAGE PRODUCTS (Admin)
// ========================

export const addProduct = asyncHandler(async (req, res, next) => {
  const { name, categoryId, categoryName, pricePerUnit, description } = req.body;

  if (!name || !categoryId || !pricePerUnit) {
    return next(new AppError('Please provide name, categoryId, and price', 400));
  }

  const product = await Product.create({
    id: `PROD-${Date.now()}`,
    name: name.trim(),
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    categoryId,
    categoryName,
    description,
    pricePerUnit: Number(pricePerUnit),
    ...req.body
  });

  res.status(201).json({
    success: true,
    message: 'Product added successfully',
    data: product
  });
});

export const updateProduct = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;

  const product = await Product.findByIdAndUpdate(
    productId,
    req.body,
    { new: true, runValidators: true }
  );

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Product updated successfully',
    data: product
  });
});

export const deleteProduct = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;

  const product = await Product.findByIdAndUpdate(
    productId,
    { isDiscontinued: true },
    { new: true }
  );

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Product discontinued successfully',
    data: product
  });
});

// ========================
// INVENTORY MANAGEMENT
// ========================

export const getInventory = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20, lowStock } = req.query;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.max(1, Number(limit));
  const skip = (pageNum - 1) * limitNum;

  const filter = { isDiscontinued: false };

  if (lowStock === 'true') {
    filter.stockQuantity = { $lt: 50 };
  }

  const products = await Product.find(filter)
    .sort('-stockQuantity')
    .skip(skip)
    .limit(limitNum)
    .select('name categoryName stockQuantity moq pricePerUnit');

  const total = await Product.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: products,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalItems: total
    }
  });
});

export const updateInventory = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;
  const { stockQuantity, inStock } = req.body;

  if (stockQuantity === undefined && inStock === undefined) {
    return next(new AppError('Please provide stockQuantity or inStock', 400));
  }

  const product = await Product.findByIdAndUpdate(
    productId,
    {
      stockQuantity: stockQuantity !== undefined ? Number(stockQuantity) : undefined,
      inStock: inStock !== undefined ? inStock : undefined,
      lastStockUpdate: new Date()
    },
    { new: true }
  );

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Inventory updated successfully',
    data: {
      productId: product._id,
      name: product.name,
      stockQuantity: product.stockQuantity,
      inStock: product.inStock
    }
  });
});

// ========================
// USER MANAGEMENT
// ========================

export const getAllUsers = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20, search } = req.query;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.max(1, Number(limit));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filter.$or = [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex }
    ];
  }

  const users = await User.find(filter)
    .skip(skip)
    .limit(limitNum)
    .select('firstName lastName email phone isAdmin isActive totalOrders totalSpent createdAt');

  const total = await User.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: users,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalItems: total
    }
  });
});

export const getUserDetails = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  const user = await User.findById(userId);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Get user's orders
  const orders = await Order.find({ userId }).select('orderNumber total orderStatus createdAt');

  res.status(200).json({
    success: true,
    data: {
      user,
      orders
    }
  });
});

export const updateUserStatus = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const { isActive, isAdmin } = req.body;

  if (isActive === undefined && isAdmin === undefined) {
    return next(new AppError('Please provide isActive or isAdmin', 400));
  }

  const user = await User.findByIdAndUpdate(
    userId,
    {
      isActive: isActive !== undefined ? isActive : undefined,
      isAdmin: isAdmin !== undefined ? isAdmin : undefined
    },
    { new: true }
  );

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'User status updated successfully',
    data: user
  });
});

// ========================
// ANALYTICS & REPORTS
// ========================

export const getSalesAnalytics = asyncHandler(async (req, res, next) => {
  const { period = 'month' } = req.query;

  let groupBy = '$createdAt';
  let dateFormat = '%Y-%m-%d';

  if (period === 'month') {
    dateFormat = '%Y-%m';
  } else if (period === 'year') {
    dateFormat = '%Y';
  }

  const salesData = await Order.aggregate([
    { $match: { orderStatus: 'delivered' } },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
        totalSales: { $sum: '$total' },
        orderCount: { $sum: 1 },
        avgOrderValue: { $avg: '$total' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  res.status(200).json({
    success: true,
    period,
    data: salesData
  });
});

export const getCustomerAnalytics = asyncHandler(async (req, res, next) => {
  // Total customers
  const totalCustomers = await User.countDocuments();

  // Active customers (with orders)
  const activeCustomers = await User.countDocuments({ totalOrders: { $gt: 0 } });

  // Customer by order count
  const customersByOrderCount = await User.aggregate([
    { $group: {
      _id: null,
      newCustomers: { $sum: { $cond: [{ $eq: ['$totalOrders', 0] }, 1, 0] } },
      oneTimeCustomers: { $sum: { $cond: [{ $eq: ['$totalOrders', 1] }, 1, 0] } },
      repeatCustomers: { $sum: { $cond: [{ $gt: ['$totalOrders', 1] }, 1, 0] } }
    }}
  ]);

  // Top customers
  const topCustomers = await User.find({ totalOrders: { $gt: 0 } })
    .sort('-totalSpent')
    .limit(10)
    .select('firstName lastName email totalOrders totalSpent');

  res.status(200).json({
    success: true,
    data: {
      summary: {
        totalCustomers,
        activeCustomers,
        inactiveCustomers: totalCustomers - activeCustomers
      },
      breakdown: customersByOrderCount[0] || {},
      topCustomers
    }
  });
});

export const getPaymentAnalytics = asyncHandler(async (req, res, next) => {
  // Payment methods breakdown
  const paymentMethods = await Payment.aggregate([
    { $match: { status: 'completed' } },
    { $group: {
      _id: '$paymentMethod',
      count: { $sum: 1 },
      totalAmount: { $sum: '$amount' },
      avgAmount: { $avg: '$amount' }
    }}
  ]);

  // Payment success rate
  const allPayments = await Payment.countDocuments();
  const successfulPayments = await Payment.countDocuments({ status: 'completed' });
  const failedPayments = await Payment.countDocuments({ status: 'failed' });

  const successRate = allPayments > 0 ? ((successfulPayments / allPayments) * 100).toFixed(2) : 0;

  res.status(200).json({
    success: true,
    data: {
      paymentMethods,
      summary: {
        totalPayments: allPayments,
        successfulPayments,
        failedPayments,
        successRate: `${successRate}%`
      }
    }
  });
});

// ========================
// SYSTEM MANAGEMENT
// ========================

export const getSystemStats = asyncHandler(async (req, res, next) => {
  const stats = {
    products: await Product.countDocuments(),
    productsActive: await Product.countDocuments({ isDiscontinued: false }),
    productsOutOfStock: await Product.countDocuments({ inStock: false }),
    users: await User.countDocuments(),
    usersActive: await User.countDocuments({ isActive: true }),
    usersAdmin: await User.countDocuments({ isAdmin: true }),
    orders: await Order.countDocuments(),
    ordersDelivered: await Order.countDocuments({ orderStatus: 'delivered' }),
    ordersPending: await Order.countDocuments({ orderStatus: { $in: ['pending', 'confirmed', 'processing'] } }),
    payments: await Payment.countDocuments(),
    paymentsCompleted: await Payment.countDocuments({ status: 'completed' }),
    paymentsFailed: await Payment.countDocuments({ status: 'failed' })
  };

  res.status(200).json({
    success: true,
    data: stats
  });
});

// ========================
// FEATURED PRODUCTS MANAGEMENT
// ========================

export const toggleFeatured = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;

  const product = await Product.findById(productId);
  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  product.isFeatured = !product.isFeatured;
  await product.save();

  res.status(200).json({
    success: true,
    message: `Product ${product.isFeatured ? 'added to' : 'removed from'} featured`,
    data: {
      productId: product._id,
      isFeatured: product.isFeatured
    }
  });
});

// ========================
// DISCOUNT MANAGEMENT
// ========================

export const applyDiscount = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;
  const { discount } = req.body;

  if (discount === undefined || discount < 0 || discount > 100) {
    return next(new AppError('Discount must be between 0 and 100', 400));
  }

  const product = await Product.findById(productId);
  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  product.discount = Number(discount);
  product.discountedPrice = product.pricePerUnit * (1 - discount / 100);
  await product.save();

  res.status(200).json({
    success: true,
    message: 'Discount applied successfully',
    data: {
      productId: product._id,
      originalPrice: product.pricePerUnit,
      discount: product.discount,
      discountedPrice: product.discountedPrice
    }
  });
});