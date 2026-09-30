import User from '../models/User.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import jwt from 'jsonwebtoken';
import { authLogger } from '../middleware/logger.js';

// ========================
// GENERATE JWT TOKEN
// ========================

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// ========================
// SEND TOKEN IN RESPONSE
// ========================

const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      isAdmin: user.isAdmin
    }
  });
};

// ========================
// REGISTER USER
// ========================

export const register = asyncHandler(async (req, res, next) => {
  const { firstName, lastName, email, phone, password, passwordConfirm } = req.body;

  // Validation
  if (!firstName || !lastName || !email || !phone || !password) {
    return next(new AppError('Please provide all required fields', 400));
  }

  if (password !== passwordConfirm) {
    return next(new AppError('Passwords do not match', 400));
  }

  if (password.length < 6) {
    return next(new AppError('Password must be at least 6 characters', 400));
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return next(new AppError('Email already registered', 409));
  }

  // Create user
  const user = await User.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.toLowerCase(),
    phone: phone.trim(),
    password
  });

  authLogger('User Registered', user._id, { email: user.email });

  sendTokenResponse(user, 201, res);
});

// ========================
// LOGIN USER
// ========================

export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // Check for user (include password field)
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user) {
    return next(new AppError('Invalid email or password', 401));
  }

  // Check if password matches
  const isPasswordCorrect = await user.comparePassword(password);

  if (!isPasswordCorrect) {
    return next(new AppError('Invalid email or password', 401));
  }

  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated', 403));
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  authLogger('User Login', user._id, { email: user.email });

  sendTokenResponse(user, 200, res);
});

// ========================
// GET CURRENT USER
// ========================

export const getCurrentUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  res.status(200).json({
    success: true,
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      company: user.company,
      businessType: user.businessType,
      addresses: user.addresses,
      isAdmin: user.isAdmin,
      emailVerified: user.emailVerified,
      totalOrders: user.totalOrders,
      totalSpent: user.totalSpent
    }
  });
});

// ========================
// UPDATE PROFILE
// ========================

export const updateProfile = asyncHandler(async (req, res, next) => {
  const { firstName, lastName, phone, company, businessType, communicationPreference } = req.body;

  const user = await User.findById(req.user._id);

  // Update fields
  if (firstName) user.firstName = firstName.trim();
  if (lastName) user.lastName = lastName.trim();
  if (phone) user.phone = phone.trim();
  if (company) user.company = company.trim();
  if (businessType) user.businessType = businessType;
  if (communicationPreference) user.communicationPreference = communicationPreference;

  await user.save();

  authLogger('Profile Updated', user._id, {});

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    user: {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      company: user.company,
      businessType: user.businessType
    }
  });
});

// ========================
// CHANGE PASSWORD
// ========================

export const changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return next(new AppError('Please provide all password fields', 400));
  }

  const user = await User.findById(req.user._id).select('+password');

  // Check current password
  const isCorrect = await user.comparePassword(currentPassword);
  if (!isCorrect) {
    return next(new AppError('Current password is incorrect', 401));
  }

  // Check new passwords match
  if (newPassword !== confirmPassword) {
    return next(new AppError('New passwords do not match', 400));
  }

  if (newPassword.length < 6) {
    return next(new AppError('Password must be at least 6 characters', 400));
  }

  // Update password
  user.password = newPassword;
  await user.save();

  authLogger('Password Changed', user._id, {});

  res.status(200).json({
    success: true,
    message: 'Password changed successfully'
  });
});

// ========================
// LOGOUT
// ========================

export const logout = asyncHandler(async (req, res, next) => {
  authLogger('User Logout', req.user._id, {});

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

// ========================
// GET ALL ADDRESSES
// ========================

export const getAddresses = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  res.status(200).json({
    success: true,
    addresses: user.addresses || []
  });
});

// ========================
// ADD ADDRESS
// ========================

export const addAddress = asyncHandler(async (req, res, next) => {
  const { label, street, city, province, postalCode, phone, isDefault } = req.body;

  if (!street || !city || !province || !postalCode) {
    return next(new AppError('Please provide all address fields', 400));
  }

  const user = await User.findById(req.user._id);

  const newAddress = {
    label: label || 'home',
    street: street.trim(),
    city: city.trim(),
    province: province.trim(),
    postalCode: postalCode.trim(),
    country: 'Pakistan',
    phone: phone?.trim() || user.phone,
    isDefault: isDefault || false
  };

  // If this is the first address, make it default
  if (!user.addresses || user.addresses.length === 0) {
    newAddress.isDefault = true;
  }

  // If marking as default, unmark others
  if (newAddress.isDefault) {
    user.addresses.forEach(addr => {
      addr.isDefault = false;
    });
  }

  user.addresses.push(newAddress);
  await user.save();

  res.status(201).json({
    success: true,
    message: 'Address added successfully',
    address: newAddress
  });
});

// ========================
// UPDATE ADDRESS
// ========================

export const updateAddress = asyncHandler(async (req, res, next) => {
  const { addressId } = req.params;
  const { label, street, city, province, postalCode, phone, isDefault } = req.body;

  const user = await User.findById(req.user._id);

  const address = user.addresses.find(addr => addr._id.toString() === addressId);
  if (!address) {
    return next(new AppError('Address not found', 404));
  }

  // Update fields
  if (label) address.label = label;
  if (street) address.street = street.trim();
  if (city) address.city = city.trim();
  if (province) address.province = province.trim();
  if (postalCode) address.postalCode = postalCode.trim();
  if (phone) address.phone = phone.trim();

  // Handle default address
  if (isDefault) {
    user.addresses.forEach(addr => {
      addr.isDefault = false;
    });
    address.isDefault = true;
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Address updated successfully',
    address
  });
});

// ========================
// DELETE ADDRESS
// ========================

export const deleteAddress = asyncHandler(async (req, res, next) => {
  const { addressId } = req.params;

  const user = await User.findById(req.user._id);

  // Find and remove address
  const addressIndex = user.addresses.findIndex(
    addr => addr._id.toString() === addressId
  );

  if (addressIndex === -1) {
    return next(new AppError('Address not found', 404));
  }

  user.addresses.splice(addressIndex, 1);

  // If deleted address was default, make first one default
  if (user.addresses.length > 0) {
    const hasDefault = user.addresses.some(addr => addr.isDefault);
    if (!hasDefault) {
      user.addresses[0].isDefault = true;
    }
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Address deleted successfully'
  });
});
