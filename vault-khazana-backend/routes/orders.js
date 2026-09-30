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
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// ========================
// PROTECTED ROUTES (Users)
// ========================

// Create new order
router.post('/', protect, createOrder);

// Get user's orders
router.get('/my-orders/list', protect, getUserOrders);

// Get specific order
router.get('/:orderId', protect, getOrderById);

// Cancel order
router.put('/:orderId/cancel', protect, cancelOrder);

// ========================
// PROTECTED ROUTES (Admin Only)
// ========================

// Get all orders (admin)
router.get('/admin/all', protect, adminOnly, getAllOrders);

// Search orders (admin)
router.get('/admin/search', protect, adminOnly, searchOrders);

// Get order statistics (admin)
router.get('/admin/stats', protect, adminOnly, getOrderStats);

// Update order status (admin)
router.put('/:orderId/status', protect, adminOnly, updateOrderStatus);

export default router;
