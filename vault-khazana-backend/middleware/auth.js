import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AppError, asyncHandler } from './errorHandler.js';

// ========================
// PROTECT ROUTE (Verify JWT)
// ========================

export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Get token from header
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // If no token
  if (!token) {
    return next(new AppError('Please login to access this resource', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return next(new AppError('User not found', 404));
    }

    if (!req.user.isActive) {
      return next(new AppError('User account is deactivated', 403));
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired. Please login again', 401));
    }
    return next(new AppError('Invalid token', 401));
  }
});

// ========================
// AUTHORIZE (Check role/permission)
// ========================

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Please login first', 401));
    }

    if (req.user.isAdmin) {
      return next(); // Admin can access everything
    }

    if (!roles.includes('user')) {
      return next(new AppError('You do not have permission to access this resource', 403));
    }

    next();
  };
};

// ========================
// ADMIN ONLY
// ========================

export const adminOnly = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Please login first', 401));
  }

  if (!req.user.isAdmin) {
    return next(new AppError('Only administrators can access this resource', 403));
  }

  next();
});

// ========================
// OPTIONAL AUTH (Attach user if logged in)
// ========================

export const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
    } catch (error) {
      // Token is invalid but that's okay for optional auth
      req.user = null;
    }
  } else {
    req.user = null;
  }

  next();
});

// ========================
// GUEST CHECKOUT
// ========================

export const guestOrUser = (req, res, next) => {
  // Either logged in user or guest email in body
  if (req.user) {
    return next();
  }

  if (req.body.email) {
    return next();
  }

  return next(new AppError('Please provide email for guest checkout', 400));
};
