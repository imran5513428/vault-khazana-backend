// ========================
// EMAIL VALIDATOR
// ========================

export const isValidEmail = (email) => {
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
};

// ========================
// PHONE VALIDATOR (Pakistan)
// ========================

export const isValidPhone = (phone) => {
  // Remove spaces and special characters
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Pakistan phone patterns
  const pakistaniPhoneRegex = /^(\+92|0)[1-9]\d{9}$/;
  
  return pakistaniPhoneRegex.test(cleanPhone);
};

// ========================
// PASSWORD VALIDATOR
// ========================

export const isValidPassword = (password) => {
  // At least 6 characters
  if (password.length < 6) {
    return {
      valid: false,
      error: 'Password must be at least 6 characters'
    };
  }

  // At least one uppercase letter (optional but recommended)
  // At least one number (optional but recommended)
  // At least one special character (optional but recommended)

  return { valid: true };
};

// ========================
// PASSWORD STRENGTH CHECKER
// ========================

export const checkPasswordStrength = (password) => {
  let strength = 0;
  const feedback = [];

  if (password.length >= 8) strength++;
  else feedback.push('At least 8 characters');

  if (password.length >= 12) strength++;
  else feedback.push('At least 12 characters for strong security');

  if (/[a-z]/.test(password)) strength++;
  else feedback.push('Add lowercase letters');

  if (/[A-Z]/.test(password)) strength++;
  else feedback.push('Add uppercase letters');

  if (/\d/.test(password)) strength++;
  else feedback.push('Add numbers');

  if (/[!@#$%^&*]/.test(password)) strength++;
  else feedback.push('Add special characters (!@#$%^&*)');

  let level = 'Weak';
  if (strength >= 5) level = 'Strong';
  else if (strength >= 3) level = 'Medium';

  return {
    strength,
    level,
    feedback: feedback.slice(0, 3) // Show top 3 suggestions
  };
};

// ========================
// NAME VALIDATOR
// ========================

export const isValidName = (name) => {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Name cannot be empty' };
  }

  if (name.trim().length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }

  if (name.length > 50) {
    return { valid: false, error: 'Name cannot exceed 50 characters' };
  }

  // Allow letters, spaces, hyphens, apostrophes
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  if (!nameRegex.test(name)) {
    return { valid: false, error: 'Name contains invalid characters' };
  }

  return { valid: true };
};

// ========================
// QUANTITY VALIDATOR
// ========================

export const isValidQuantity = (quantity, moq = 1, step = 1) => {
  const qty = Number(quantity);

  if (isNaN(qty) || qty <= 0) {
    return { valid: false, error: 'Quantity must be a positive number' };
  }

  if (qty < moq) {
    return { valid: false, error: `Minimum order quantity is ${moq}` };
  }

  if ((qty - moq) % step !== 0) {
    return { valid: false, error: `Quantity must increase in steps of ${step}` };
  }

  return { valid: true };
};

// ========================
// PRICE VALIDATOR
// ========================

export const isValidPrice = (price) => {
  const priceNum = Number(price);

  if (isNaN(priceNum)) {
    return { valid: false, error: 'Price must be a number' };
  }

  if (priceNum < 0) {
    return { valid: false, error: 'Price cannot be negative' };
  }

  if (priceNum === 0) {
    return { valid: false, error: 'Price must be greater than 0' };
  }

  return { valid: true };
};

// ========================
// ADDRESS VALIDATOR
// ========================

export const isValidAddress = (address) => {
  const { street, city, province, postalCode } = address;

  if (!street || street.trim().length === 0) {
    return { valid: false, error: 'Street address is required' };
  }

  if (!city || city.trim().length === 0) {
    return { valid: false, error: 'City is required' };
  }

  if (!province || province.trim().length === 0) {
    return { valid: false, error: 'Province is required' };
  }

  if (!postalCode || postalCode.trim().length === 0) {
    return { valid: false, error: 'Postal code is required' };
  }

  if (street.length > 100) {
    return { valid: false, error: 'Street address too long' };
  }

  if (postalCode.length > 10) {
    return { valid: false, error: 'Invalid postal code format' };
  }

  return { valid: true };
};

// ========================
// URL VALIDATOR
// ========================

export const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

// ========================
// CREDIT CARD VALIDATOR (Luhn Algorithm)
// ========================

export const isValidCreditCard = (cardNumber) => {
  // Remove spaces and dashes
  const cleanCard = cardNumber.replace(/[\s\-]/g, '');

  // Check if it's all digits
  if (!/^\d+$/.test(cleanCard)) {
    return { valid: false, error: 'Card number must contain only digits' };
  }

  // Check length (typically 13-19 digits)
  if (cleanCard.length < 13 || cleanCard.length > 19) {
    return { valid: false, error: 'Invalid card number length' };
  }

  // Luhn algorithm
  let sum = 0;
  let isEven = false;

  for (let i = cleanCard.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanCard.charAt(i), 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  const isValid = sum % 10 === 0;

  return {
    valid: isValid,
    error: isValid ? null : 'Invalid card number'
  };
};

// ========================
// DISCOUNT VALIDATOR
// ========================

export const isValidDiscount = (discount) => {
  const discountNum = Number(discount);

  if (isNaN(discountNum)) {
    return { valid: false, error: 'Discount must be a number' };
  }

  if (discountNum < 0 || discountNum > 100) {
    return { valid: false, error: 'Discount must be between 0 and 100' };
  }

  return { valid: true };
};

// ========================
// RATING VALIDATOR
// ========================

export const isValidRating = (rating) => {
  const ratingNum = Number(rating);

  if (isNaN(ratingNum)) {
    return { valid: false, error: 'Rating must be a number' };
  }

  if (ratingNum < 1 || ratingNum > 5) {
    return { valid: false, error: 'Rating must be between 1 and 5' };
  }

  return { valid: true };
};

// ========================
// BUSINESS TYPE VALIDATOR
// ========================

export const isValidBusinessType = (businessType) => {
  const validTypes = ['individual', 'restaurant', 'cafe', 'bakery', 'company', 'other'];

  if (!businessType) {
    return { valid: true }; // Optional field
  }

  if (!validTypes.includes(businessType)) {
    return {
      valid: false,
      error: `Business type must be one of: ${validTypes.join(', ')}`
    };
  }

  return { valid: true };
};

// ========================
// PAYMENT METHOD VALIDATOR
// ========================

export const isValidPaymentMethod = (method) => {
  const validMethods = ['stripe', 'jazzcash', 'cod', 'bank_transfer'];

  if (!validMethods.includes(method)) {
    return {
      valid: false,
      error: `Payment method must be one of: ${validMethods.join(', ')}`
    };
  }

  return { valid: true };
};

// ========================
// ORDER STATUS VALIDATOR
// ========================

export const isValidOrderStatus = (status) => {
  const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return {
      valid: false,
      error: `Status must be one of: ${validStatuses.join(', ')}`
    };
  }

  return { valid: true };
};

// ========================
// PAYMENT STATUS VALIDATOR
// ========================

export const isValidPaymentStatus = (status) => {
  const validStatuses = ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return {
      valid: false,
      error: `Payment status must be one of: ${validStatuses.join(', ')}`
    };
  }

  return { valid: true };
};

// ========================
// PAGINATION VALIDATOR
// ========================

export const isValidPagination = (page, limit) => {
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 20;

  if (pageNum < 1) {
    return { valid: false, error: 'Page must be at least 1' };
  }

  if (limitNum < 1 || limitNum > 100) {
    return { valid: false, error: 'Limit must be between 1 and 100' };
  }

  return { valid: true, page: pageNum, limit: limitNum };
};

// ========================
// SEARCH QUERY VALIDATOR
// ========================

export const isValidSearchQuery = (query) => {
  if (!query || query.trim().length === 0) {
    return { valid: false, error: 'Search query cannot be empty' };
  }

  if (query.trim().length < 2) {
    return { valid: false, error: 'Search query must be at least 2 characters' };
  }

  if (query.length > 100) {
    return { valid: false, error: 'Search query cannot exceed 100 characters' };
  }

  return { valid: true, query: query.trim() };
};

// ========================
// COMBINED VALIDATOR (User Registration)
// ========================

export const validateUserRegistration = (data) => {
  const { firstName, lastName, email, phone, password, passwordConfirm } = data;

  const errors = [];

  // Validate first name
  const firstNameValidation = isValidName(firstName);
  if (!firstNameValidation.valid) errors.push(firstNameValidation.error);

  // Validate last name
  const lastNameValidation = isValidName(lastName);
  if (!lastNameValidation.valid) errors.push(lastNameValidation.error);

  // Validate email
  if (!isValidEmail(email)) {
    errors.push('Invalid email format');
  }

  // Validate phone
  if (!isValidPhone(phone)) {
    errors.push('Invalid phone number for Pakistan');
  }

  // Validate password
  const passwordValidation = isValidPassword(password);
  if (!passwordValidation.valid) errors.push(passwordValidation.error);

  // Check password match
  if (password !== passwordConfirm) {
    errors.push('Passwords do not match');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
};

// ========================
// COMBINED VALIDATOR (Order)
// ========================

export const validateOrder = (data) => {
  const { items, shippingAddress, paymentMethod } = data;

  const errors = [];

  // Validate items
  if (!items || !Array.isArray(items) || items.length === 0) {
    errors.push('Order must have at least one item');
  }

  // Validate shipping address
  const addressValidation = isValidAddress(shippingAddress);
  if (!addressValidation.valid) errors.push(addressValidation.error);

  // Validate payment method
  const paymentValidation = isValidPaymentMethod(paymentMethod);
  if (!paymentValidation.valid) errors.push(paymentValidation.error);

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
};