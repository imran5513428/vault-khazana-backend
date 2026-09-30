import User from '../models/User.js';
import Product from '../models/Product.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

// ========================
// HELPER: Get user's cart
// ========================

const getUserCart = async (userId) => {
  let cart = await User.findById(userId).select('cart');
  if (!cart) {
    cart = { _id: userId, cart: [] };
  }
  return cart.cart || [];
};

// ========================
// GET CART
// ========================

export const getCart = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id).select('cart');

  const cart = user.cart || [];

  // Calculate totals
  let subtotal = 0;
  let itemCount = 0;

  const cartItems = await Promise.all(
    cart.map(async (item) => {
      const product = await Product.findById(item.productId);
      if (product) {
        subtotal += product.pricePerUnit * item.quantity;
        itemCount += item.quantity;
      }
      return {
        ...item,
        productName: product?.name,
        pricePerUnit: product?.pricePerUnit,
        moq: product?.moq,
        step: product?.step,
        inStock: product?.inStock
      };
    })
  );

  res.status(200).json({
    success: true,
    data: {
      items: cartItems,
      itemCount,
      subtotal,
      total: subtotal
    }
  });
});

// ========================
// GET CART SUMMARY
// ========================

export const getCartSummary = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id).select('cart');

  const cart = user.cart || [];

  let subtotal = 0;
  const cartItems = [];

  for (const item of cart) {
    const product = await Product.findById(item.productId);
    if (product) {
      subtotal += product.pricePerUnit * item.quantity;
      cartItems.push({
        productName: product.name,
        quantity: item.quantity,
        pricePerUnit: product.pricePerUnit
      });
    }
  }

  const shippingCost = subtotal > 5000 ? 0 : 250;
  const tax = subtotal * 0.17;
  const total = subtotal + shippingCost + tax;

  res.status(200).json({
    success: true,
    data: {
      items: cartItems,
      itemCount: cart.length,
      subtotal,
      shippingCost,
      tax,
      total
    }
  });
});

// ========================
// ADD TO CART
// ========================

export const addToCart = asyncHandler(async (req, res, next) => {
  const { productId, quantity } = req.body;

  if (!productId || !quantity) {
    return next(new AppError('Please provide productId and quantity', 400));
  }

  // Find product
  const product = await Product.findById(productId);
  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  if (!product.inStock) {
    return next(new AppError('Product is out of stock', 400));
  }

  // Validate quantity
  const validation = product.validateQuantity(quantity);
  if (!validation.valid) {
    return next(new AppError(validation.error, 400));
  }

  // Get user
  const user = await User.findById(req.user._id);

  // Initialize cart if not exists
  if (!user.cart) {
    user.cart = [];
  }

  // Check if product already in cart
  const existingItem = user.cart.find(
    (item) => item.productId.toString() === productId
  );

  if (existingItem) {
    // Update quantity
    existingItem.quantity = Number(existingItem.quantity) + Number(quantity);

    // Validate new quantity
    const newValidation = product.validateQuantity(existingItem.quantity);
    if (!newValidation.valid) {
      return next(new AppError(newValidation.error, 400));
    }
  } else {
    // Add new item
    user.cart.push({
      productId,
      quantity: Number(quantity)
    });
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Item added to cart',
    data: {
      cartItems: user.cart.length,
      quantity: Number(quantity)
    }
  });
});

// ========================
// UPDATE CART ITEM
// ========================

export const updateCartItem = asyncHandler(async (req, res, next) => {
  const { itemId } = req.params;
  const { quantity } = req.body;

  if (!quantity) {
    return next(new AppError('Please provide quantity', 400));
  }

  const user = await User.findById(req.user._id);

  if (!user.cart || user.cart.length === 0) {
    return next(new AppError('Cart is empty', 400));
  }

  // Find item in cart
  const cartItem = user.cart.find((item) => item._id.toString() === itemId);

  if (!cartItem) {
    return next(new AppError('Item not found in cart', 404));
  }

  // Find product
  const product = await Product.findById(cartItem.productId);
  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  // Validate quantity
  const validation = product.validateQuantity(quantity);
  if (!validation.valid) {
    return next(new AppError(validation.error, 400));
  }

  // Update quantity
  cartItem.quantity = Number(quantity);

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Cart item updated',
    data: {
      itemId: cartItem._id,
      quantity: cartItem.quantity
    }
  });
});

// ========================
// REMOVE FROM CART
// ========================

export const removeFromCart = asyncHandler(async (req, res, next) => {
  const { itemId } = req.params;

  const user = await User.findById(req.user._id);

  if (!user.cart || user.cart.length === 0) {
    return next(new AppError('Cart is empty', 400));
  }

  // Find and remove item
  const itemIndex = user.cart.findIndex(
    (item) => item._id.toString() === itemId
  );

  if (itemIndex === -1) {
    return next(new AppError('Item not found in cart', 404));
  }

  const removedItem = user.cart.splice(itemIndex, 1)[0];

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Item removed from cart',
    data: {
      removedItemId: removedItem._id,
      cartItems: user.cart.length
    }
  });
});

// ========================
// CLEAR CART
// ========================

export const clearCart = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  if (!user.cart || user.cart.length === 0) {
    return next(new AppError('Cart is already empty', 400));
  }

  const itemCount = user.cart.length;
  user.cart = [];

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Cart cleared',
    data: {
      clearedItems: itemCount
    }
  });
});

// ========================
// VALIDATE CART
// ========================

export const validateCart = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  const cart = user.cart || [];

  if (cart.length === 0) {
    return res.status(400).json({
      valid: false,
      error: 'Cart is empty'
    });
  }

  const issues = [];
  let subtotal = 0;

  for (const item of cart) {
    const product = await Product.findById(item.productId);

    if (!product) {
      issues.push(`Product ${item.productId} no longer exists`);
      continue;
    }

    if (!product.inStock) {
      issues.push(`${product.name} is out of stock`);
      continue;
    }

    // Validate quantity
    const validation = product.validateQuantity(item.quantity);
    if (!validation.valid) {
      issues.push(`${product.name}: ${validation.error}`);
      continue;
    }

    subtotal += product.pricePerUnit * item.quantity;
  }

  const shippingCost = subtotal > 5000 ? 0 : 250;
  const tax = subtotal * 0.17;
  const total = subtotal + shippingCost + tax;

  res.status(issues.length > 0 ? 400 : 200).json({
    valid: issues.length === 0,
    message: issues.length === 0 ? 'Cart is valid' : 'Cart has issues',
    issues,
    data: {
      itemCount: cart.length,
      subtotal,
      shippingCost,
      tax,
      total
    }
  });
});