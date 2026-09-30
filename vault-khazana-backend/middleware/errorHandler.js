// ========================
// CUSTOM ERROR CLASS
// ========================

export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;

    Error.captureStackTrace(this, this.constructor);
  }
}

// ========================
// ASYNC HANDLER (Wrapper for async routes)
// ========================

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ========================
// ERROR HANDLER MIDDLEWARE
// ========================

export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ ERROR:', {
      message: err.message,
      statusCode: err.statusCode,
      stack: err.stack
    });
  }

  // ========================
  // MONGOOSE ERRORS
  // ========================

  // Duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    err.message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    err.statusCode = 409;
  }

  // Cast error (invalid MongoDB ID)
  if (err.name === 'CastError') {
    err.message = 'Invalid ID format';
    err.statusCode = 400;
  }

  // Validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors)
      .map(error => error.message)
      .join(', ');
    err.message = messages;
    err.statusCode = 400;
  }

  // ========================
  // JWT ERRORS
  // ========================

  if (err.name === 'JsonWebTokenError') {
    err.message = 'Invalid token';
    err.statusCode = 401;
  }

  if (err.name === 'TokenExpiredError') {
    err.message = 'Token expired. Please login again';
    err.statusCode = 401;
  }

  // ========================
  // STRIPE ERRORS
  // ========================

  if (err.type === 'StripeInvalidRequestError') {
    err.message = `Stripe Error: ${err.message}`;
    err.statusCode = 400;
  }

  if (err.type === 'StripeCardError') {
    err.message = `Card Error: ${err.message}`;
    err.statusCode = 400;
  }

  // ========================
  // SEND ERROR RESPONSE
  // ========================

  return res.status(err.statusCode).json({
    success: false,
    error: {
      message: err.message,
      statusCode: err.statusCode
    }
  });
};

// ========================
// 404 HANDLER (Route not found)
// ========================

export const notFound = (req, res, next) => {
  const error = new AppError(
    `Route ${req.originalUrl} not found`,
    404
  );
  next(error);
};
