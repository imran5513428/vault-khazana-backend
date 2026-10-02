import express from 'express';
import {
  createOrder,
  getOrderById,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
  getOrderStats,
  searchOrders
} from '../controllers/orderController.js';
import {
  protect,
  adminOnly,
  guestOrUser
} from '../middleware/auth.js';

const router = express.Router();

// ========================
// ORDER CREATION
// ========================

// Guest OR logged-in customer can create an order.
// createOrder() performs the full server-side validation,
// product lookup, MOQ/step validation, and price calculation.
router.post('/', guestOrUser, createOrder);

// ========================
// PROTECTED CUSTOMER ROUTES
// ========================

// Get logged-in user's orders
router.get('/my-orders/list', protect, getUserOrders);

// ========================
// PROTECTED ADMIN ROUTES
// ========================

// Get all orders (admin)
router.get(
  '/admin/all',
  protect,
  adminOnly,
  getAllOrders
);

// Search orders (admin)
router.get(
  '/admin/search',
  protect,
  adminOnly,
  searchOrders
);

// Get order statistics (admin)
router.get(
  '/admin/stats',
  protect,
  adminOnly,
  getOrderStats
);

// ========================
// ORDER-SPECIFIC ROUTES
// ========================

// Cancel order
router.put(
  '/:orderId/cancel',
  protect,
  cancelOrder
);

// Update order status (admin)
router.put(
  '/:orderId/status',
  protect,
  adminOnly,
  updateOrderStatus
);

// Get specific order
// Keep this route after all specific routes above.
router.get(
  '/:orderId',
  protect,
  getOrderById
);

export default router;