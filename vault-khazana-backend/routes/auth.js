import express from 'express';
import {
  register,
  login,
  logout,
  getCurrentUser,
  updateProfile,
  changePassword,
  addAddress,
  updateAddress,
  deleteAddress,
  getAddresses
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// ========================
// PUBLIC ROUTES
// ========================

// Register new user
router.post('/register', register);

// Login user
router.post('/login', login);

// ========================
// PROTECTED ROUTES
// ========================

// Get current user profile
router.get('/me', protect, getCurrentUser);

// Update profile
router.put('/me', protect, updateProfile);

// Change password
router.put('/change-password', protect, changePassword);

// Logout
router.post('/logout', protect, logout);

// ========================
// ADDRESS ROUTES (Protected)
// ========================

// Get all addresses
router.get('/addresses', protect, getAddresses);

// Add new address
router.post('/addresses', protect, addAddress);

// Update address
router.put('/addresses/:addressId', protect, updateAddress);

// Delete address
router.delete('/addresses/:addressId', protect, deleteAddress);

export default router;
