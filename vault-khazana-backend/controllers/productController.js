import mongoose from 'mongoose';
import Product from '../models/Product.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

// ========================
// PRODUCT LOOKUP HELPER
// ========================

// The frontend uses stable catalog IDs such as:
// "f1-aluminum-container", "h3", "200ml-disposable", etc.
// MongoDB also has its own _id.
// This helper supports both without changing the frontend IDs.
const findProductByIdentifier = async (identifier) => {
  if (!identifier) {
    return null;
  }

  // First try the stable storefront catalog ID.
  const productByCatalogId = await Product.findOne({ id: identifier });

  if (productByCatalogId) {
    return productByCatalogId;
  }

  // Also support MongoDB ObjectId values for backend/admin compatibility.
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    return Product.findById(identifier);
  }

  return null;
};

// ========================
// GET ALL PRODUCTS
// ========================

export const getAllProducts = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 20,
    category,
    minPrice,
    maxPrice,
    inStock,
    sortBy = '-createdAt'
  } = req.query;

  const filter = {};

  if (category) {
    filter.categoryId = category;
  }

  if (minPrice || maxPrice) {
    filter.pricePerUnit = {};

    if (minPrice) {
      filter.pricePerUnit.$gte = Number(minPrice);
    }

    if (maxPrice) {
      filter.pricePerUnit.$lte = Number(maxPrice);
    }
  }

  // Inventory is not currently tracked for the storefront catalog.
  // Only products explicitly configured for inventory tracking must
  // have a positive stock quantity.
  if (inStock === 'true') {
    filter.$or = [
      {
        inStock: true,
        trackInventory: false
      },
      {
        inStock: true,
        trackInventory: true,
        stockQuantity: { $gt: 0 }
      }
    ];
  }

  filter.isDiscontinued = false;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.max(1, Number(limit));
  const skip = (pageNum - 1) * limitNum;

  const products = await Product.find(filter)
    .sort(sortBy)
    .skip(skip)
    .limit(limitNum);

  const total = await Product.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: products,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalItems: total,
      itemsPerPage: limitNum
    }
  });
});

// ========================
// GET FEATURED PRODUCTS
// ========================

export const getFeaturedProducts = asyncHandler(async (req, res, next) => {
  const products = await Product.find({
    isFeatured: true,
    isDiscontinued: false,
    $or: [
      { inStock: true, trackInventory: false },
      {
        inStock: true,
        trackInventory: true,
        stockQuantity: { $gt: 0 }
      }
    ]
  }).limit(12);

  res.status(200).json({
    success: true,
    data: products
  });
});

// ========================
// GET TOP RATED PRODUCTS
// ========================

export const getTopRatedProducts = asyncHandler(async (req, res, next) => {
  const products = await Product.find({
    isDiscontinued: false,
    totalRatings: { $gt: 0 },
    $or: [
      { inStock: true, trackInventory: false },
      {
        inStock: true,
        trackInventory: true,
        stockQuantity: { $gt: 0 }
      }
    ]
  })
    .sort('-averageRating -totalRatings')
    .limit(12);

  res.status(200).json({
    success: true,
    data: products
  });
});

// ========================
// GET CUSTOM PRINTING PRODUCTS
// ========================

export const getCustomPrintingProducts = asyncHandler(async (req, res, next) => {
  const products = await Product.find({
    supportsCustomPrinting: true,
    isDiscontinued: false,
    $or: [
      { inStock: true, trackInventory: false },
      {
        inStock: true,
        trackInventory: true,
        stockQuantity: { $gt: 0 }
      }
    ]
  });

  res.status(200).json({
    success: true,
    data: products
  });
});

// ========================
// SEARCH PRODUCTS
// ========================

export const searchProducts = asyncHandler(async (req, res, next) => {
  const { q, page = 1, limit = 20 } = req.query;

  if (!q || q.trim().length < 2) {
    return next(
      new AppError(
        'Please provide a search query (at least 2 characters)',
        400
      )
    );
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.max(1, Number(limit));
  const skip = (pageNum - 1) * limitNum;

  const searchRegex = new RegExp(q, 'i');

  const filter = {
    $or: [
      { name: searchRegex },
      { description: searchRegex },
      { tags: searchRegex },
      { categoryName: searchRegex }
    ],
    isDiscontinued: false
  };

  const products = await Product.find(filter)
    .skip(skip)
    .limit(limitNum);

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

// ========================
// GET PRODUCTS BY CATEGORY
// ========================

export const getProductsByCategory = asyncHandler(async (req, res, next) => {
  const { categoryId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.max(1, Number(limit));
  const skip = (pageNum - 1) * limitNum;

  const filter = {
    categoryId,
    isDiscontinued: false
  };

  const products = await Product.find(filter)
    .skip(skip)
    .limit(limitNum);

  const total = await Product.countDocuments(filter);

  if (products.length === 0) {
    return next(
      new AppError('No products found in this category', 404)
    );
  }

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

// ========================
// GET SINGLE PRODUCT BY ID
// ========================

export const getProductById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const product = await findProductByIdentifier(id);

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  res.status(200).json({
    success: true,
    data: product
  });
});

// ========================
// VALIDATE PRODUCT QUANTITY
// ========================

export const validateQuantity = asyncHandler(async (req, res, next) => {
  const { productId, quantity } = req.body;

  if (!productId || quantity === undefined || quantity === null) {
    return next(
      new AppError('Please provide productId and quantity', 400)
    );
  }

  const product = await findProductByIdentifier(productId);

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  if (!product.isAvailable()) {
    return res.status(400).json({
      valid: false,
      error: 'Product is out of stock'
    });
  }

  const validation = product.validateQuantity(quantity);

  if (!validation.valid) {
    return res.status(400).json({
      valid: false,
      error: validation.error,
      message: validation.error
    });
  }

  const pricing = product.calculateTotal(quantity);

  res.status(200).json({
    valid: true,
    error: null,
    message: 'Quantity is valid',
    data: {
      productId: product.id,
      quantity: pricing.quantity,
      unitPrice: pricing.unitPrice,
      subtotal: pricing.subtotal,
      finalPrice: pricing.finalPrice
    }
  });
});

// ========================
// GET PRODUCT REVIEWS
// ========================

export const getProductReviews = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const product = await findProductByIdentifier(productId);

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.max(1, Number(limit));
  const skip = (pageNum - 1) * limitNum;

  const reviews = product.reviews.slice(skip, skip + limitNum);

  res.status(200).json({
    success: true,
    data: {
      reviews,
      averageRating: product.averageRating,
      totalRatings: product.totalRatings,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(product.reviews.length / limitNum),
        totalItems: product.reviews.length
      }
    }
  });
});

// ========================
// ADD PRODUCT REVIEW
// ========================

export const addProductReview = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;
  const { rating, comment } = req.body;

  if (!rating) {
    return next(new AppError('Please provide a rating', 400));
  }

  if (rating < 1 || rating > 5) {
    return next(new AppError('Rating must be between 1 and 5', 400));
  }

  const product = await findProductByIdentifier(productId);

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  const existingReview = product.reviews.find(
    (review) =>
      review.userId.toString() === req.user._id.toString()
  );

  if (existingReview) {
    return next(
      new AppError('You have already reviewed this product', 400)
    );
  }

  const newReview = {
    userId: req.user._id,
    userName: req.user.getFullName(),
    rating: Number(rating),
    comment: comment?.trim() || ''
  };

  product.reviews.push(newReview);

  const totalRating = product.reviews.reduce(
    (sum, review) => sum + review.rating,
    0
  );

  product.averageRating = parseFloat(
    (totalRating / product.reviews.length).toFixed(2)
  );

  product.totalRatings = product.reviews.length;

  await product.save();

  res.status(201).json({
    success: true,
    message: 'Review added successfully',
    review: newReview,
    averageRating: product.averageRating
  });
});

// ========================
// GET PRODUCT SUGGESTIONS
// ========================

export const getProductSuggestions = asyncHandler(async (req, res, next) => {
  const { categoryId, limit = 5 } = req.query;

  const filter = {
    isDiscontinued: false,
    $or: [
      { inStock: true, trackInventory: false },
      {
        inStock: true,
        trackInventory: true,
        stockQuantity: { $gt: 0 }
      }
    ]
  };

  if (categoryId) {
    filter.categoryId = categoryId;
  }

  const products = await Product.find(filter)
    .sort('-isFeatured -averageRating -createdAt')
    .limit(Number(limit));

  res.status(200).json({
    success: true,
    data: products
  });
});