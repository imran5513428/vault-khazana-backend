import express from 'express';
import {
  createOrder,
  getOrderById,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
  getOrderStats
} from '../controllers/orderController.js';

import {
  protect,
  optionalAuth,
  adminOnly
} from '../middleware/auth.js';

const router = express.Router();

// ========================
// CREATE ORDER
// ========================

// Guest checkout and logged-in customers
router.post(
  '/',
  optionalAuth,
  createOrder
);

// ========================
// CUSTOMER ORDERS
// ========================

// Get logged-in customer's orders
router.get(
  '/my-orders',
  protect,
  getUserOrders
);

// ========================
// ADMIN ORDERS
// ========================

// Get order statistics
router.get(
  '/admin/stats',
  protect,
  adminOnly,
  getOrderStats
);

// Get all orders
router.get(
  '/admin/all',
  protect,
  adminOnly,
  getAllOrders
);

// ========================
// SINGLE ORDER
// ========================

// Get one order
router.get(
  '/:orderId',
  protect,
  getOrderById
);

// Update order status
router.patch(
  '/:orderId/status',
  protect,
  adminOnly,
  updateOrderStatus
);

// Cancel an order
router.delete(
  '/:orderId',
  protect,
  cancelOrder
);

export default router;