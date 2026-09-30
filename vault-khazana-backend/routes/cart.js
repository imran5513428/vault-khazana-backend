import express from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  validateCart,
  getCartSummary
} from '../controllers/cartController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// ========================
// PROTECTED ROUTES (User Must Be Logged In)
// ========================

// Get current cart
router.get('/', protect, getCart);

// Get cart summary (total, items count, etc)
router.get('/summary', protect, getCartSummary);

// Add item to cart
router.post('/add', protect, addToCart);

// Update item in cart (change quantity)
router.put('/item/:itemId', protect, updateCartItem);

// Remove item from cart
router.delete('/item/:itemId', protect, removeFromCart);

// Clear entire cart
router.delete('/', protect, clearCart);

// Validate cart (check MOQ, prices, availability)
router.post('/validate', protect, validateCart);

export default router;
