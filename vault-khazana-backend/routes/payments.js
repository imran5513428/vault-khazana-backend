import express from 'express';
import {
  createStripePaymentIntent,
  verifyStripePayment,
  initiateJazzCashPayment,
  verifyJazzCashPayment,
  handleStripeWebhook,
  refundPayment,
  getPaymentHistory,
  getPaymentDetails
} from '../controllers/paymentController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// ========================
// STRIPE PAYMENT ROUTES
// ========================

// Create Stripe payment intent
router.post('/stripe/intent', protect, createStripePaymentIntent);

// Verify Stripe payment
router.post('/stripe/verify', protect, verifyStripePayment);

// Stripe webhook (for order confirmation)
router.post('/stripe/webhook', handleStripeWebhook);

// ========================
// JAZZCASH PAYMENT ROUTES (Pakistan)
// ========================

// Initiate JazzCash payment
router.post('/jazzcash/initiate', protect, initiateJazzCashPayment);

// Verify JazzCash payment
router.post('/jazzcash/verify', protect, verifyJazzCashPayment);

// ========================
// REFUND ROUTES
// ========================

// Refund payment (admin only)
router.post('/:paymentId/refund', protect, adminOnly, refundPayment);

// ========================
// PAYMENT HISTORY & DETAILS
// ========================

// Get user's payment history
router.get('/history/list', protect, getPaymentHistory);

// Get payment details
router.get('/:paymentId', protect, getPaymentDetails);

export default router;
