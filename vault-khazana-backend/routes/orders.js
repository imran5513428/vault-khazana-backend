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

// ========================
// PROTECTED ROUTES (Admin Only)
// ========================

// Get all orders (admin)
router.get('/admin/all', protect, adminOnly, getAllOrders);

// Search orders (admin)
router.get('/admin/search', protect, adminOnly, searchOrders);

// Get order statistics (admin)
router.get('/admin/stats', protect, adminOnly, getOrderStats);

// ========================
// ORDER-SPECIFIC ROUTES
// ========================

// Cancel order
router.put('/:orderId/cancel', protect, cancelOrder);

// Update order status (admin)
router.put('/:orderId/status', protect, adminOnly, updateOrderStatus);

// Get specific order
// Keep this route after all specific routes above.
router.get('/:orderId', protect, getOrderById);

export default router;