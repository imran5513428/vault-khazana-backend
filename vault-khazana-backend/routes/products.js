import express from 'express';
import {
getAllProducts,
getProductById,
getProductsByCategory,
searchProducts,
getFeaturedProducts,
getCustomPrintingProducts,
validateQuantity,
getProductReviews,
addProductReview,
getTopRatedProducts,
getProductSuggestions
} from '../controllers/productController.js';
import { optionalAuth, protect } from '../middleware/auth.js';

const router = express.Router();

// ========================
// PUBLIC PRODUCT ROUTES
// ========================

// Get all products with filters
router.get('/', optionalAuth, getAllProducts);

// Get featured products
router.get('/featured', optionalAuth, getFeaturedProducts);

// Get top-rated products
router.get('/top-rated', optionalAuth, getTopRatedProducts);

// Get products with custom printing support
router.get('/custom-printing', optionalAuth, getCustomPrintingProducts);

// Search products
router.get('/search', optionalAuth, searchProducts);

// Get products by category
router.get('/category/:categoryId', optionalAuth, getProductsByCategory);

// Validate product quantity
router.post('/validate/quantity', optionalAuth, validateQuantity);

// ========================
// PRODUCT SUGGESTIONS
// ========================

// Get product suggestions for cart/checkout
router.get('/suggestions/related', getProductSuggestions);

// ========================
// REVIEWS - PUBLIC
// ========================

// Get product reviews
router.get('/:productId/reviews', getProductReviews);

// ========================
// REVIEWS - PROTECTED
// ========================

// Add review (logged-in users only)
router.post('/:productId/reviews', protect, addProductReview);

// Get single product by ID
// Keep this route after all specific routes above.
router.get('/:id', optionalAuth, getProductById);

export default router;