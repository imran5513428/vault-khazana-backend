import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

// ========================
// ORDER CONFIGURATION
// ========================

// These values can be overridden with environment variables later.
// We are deliberately NOT hard-coding a tax assumption into the
// business logic. Until the tax policy is confirmed, tax defaults to 0.
const ORDER_TAX_RATE = Number(process.env.ORDER_TAX_RATE || 0);
const SHIPPING_COST = Number(process.env.SHIPPING_COST || 250);
const FREE_SHIPPING_THRESHOLD = Number(
  process.env.FREE_SHIPPING_THRESHOLD || 5000
);

// ========================
// CREATE ORDER
// ========================

export const createOrder = asyncHandler(async (req, res, next) => {
  const {
    items,
    shippingAddress,
    billingAddress,
    paymentMethod,
    notes
  } = req.body;

  const user = req.user || null;

  // ========================
  // BASIC VALIDATION
  // ========================

  if (!items || !Array.isArray(items) || items.length === 0) {
    return next(new AppError('Please provide order items', 400));
  }

  if (!shippingAddress) {
    return next(new AppError('Please provide shipping address', 400));
  }

  if (!shippingAddress.fullName && !user) {
    return next(new AppError('Please provide your full name', 400));
  }

  if (!shippingAddress.phone && !user) {
    return next(new AppError('Please provide your phone number', 400));
  }

  if (!shippingAddress.street) {
    return next(new AppError('Please provide your delivery address', 400));
  }

  if (!shippingAddress.city) {
    return next(new AppError('Please provide your city', 400));
  }

  if (!paymentMethod) {
    return next(new AppError('Please select a payment method', 400));
  }

  // ========================
  // PAYMENT SAFETY
  // ========================

  // COD is the only payment method activated for the first
  // real ordering milestone.
  if (paymentMethod !== 'cod') {
    return next(
      new AppError(
        'This payment method is not currently available',
        400
      )
    );
  }

  // ========================
  // VALIDATE ITEMS
  // ========================

  let subtotal = 0;
  const validatedItems = [];

  for (const item of items) {
    if (!item || !item.productId) {
      return next(
        new AppError('Each order item must include a productId', 400)
      );
    }

    if (
      item.quantity === undefined ||
      item.quantity === null
    ) {
      return next(
        new AppError(
          `Please provide a quantity for product ${item.productId}`,
          400
        )
      );
    }

    // The frontend uses the stable catalog ID.
    // Do NOT trust a frontend price.
    const product = await Product.findOne({
      id: item.productId
    });

    if (!product) {
      return next(
        new AppError(
          `Product ${item.productId} not found`,
          404
        )
      );
    }

    // Use the model's complete availability logic.
    if (!product.isAvailable()) {
      return next(
        new AppError(
          `${product.name} is out of stock`,
          400
        )
      );
    }

    // Validate MOQ and quantity step on the server.
    const validation = product.validateQuantity(item.quantity);

    if (!validation.valid) {
      return next(
        new AppError(
          `${product.name}: ${validation.error}`,
          400
        )
      );
    }

    // Calculate pricing from the database.
    // The client cannot choose the final selling price.
    const pricing = product.calculateTotal(item.quantity);

    if (!pricing.valid) {
      return next(
        new AppError(
          `${product.name}: ${pricing.error}`,
          400
        )
      );
    }

    const itemTotal = pricing.finalPrice;

    subtotal += itemTotal;

    validatedItems.push({
      productId: product.id,
      productName: product.name,
      quantity: pricing.quantity,
      pricePerUnit: pricing.unitPrice,
      subtotal: itemTotal
    });
  }

  // ========================
  // CALCULATE ORDER TOTALS
  // ========================

  const shippingCost =
    subtotal > FREE_SHIPPING_THRESHOLD
      ? 0
      : SHIPPING_COST;

  const tax