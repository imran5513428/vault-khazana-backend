import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },

  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  amount: {
    type: Number,
    required: true,
    min: 0
  },

  currency: {
    type: String,
    default: 'PKR',
    enum: ['PKR', 'USD', 'EUR']
  },

  paymentMethod: {
    type: String,
    enum: ['stripe', 'jazzcash', 'cod', 'bank_transfer', 'paypal'],
    required: true
  },

  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },

  stripe: {
    paymentIntentId: String,
    chargeId: String,
    cardBrand: String,
    cardLast4: String,
    cardExpMonth: Number,
    cardExpYear: Number
  },

  jazzcash: {
    transactionId: String,
    phoneNumber: String,
    responseCode: String,
    responseMessage: String
  },

  bankTransfer: {
    bankName: String,
    accountNumber: String,
    ifscCode: String,
    transactionRef: String,
    verified: Boolean
  },

  paypal: {
    payerId: String,
    transactionId: String,
    email: String
  },

  errorCode: String,
  errorMessage: String,
  errorDetails: mongoose.Schema.Types.Mixed,

  ipAddress: String,
  userAgent: String,
  deviceInfo: mongoose.Schema.Types.Mixed,
  metadata: mongoose.Schema.Types.Mixed,

  refundStatus: {
    type: String,
    enum: ['none', 'partial', 'full'],
    default: 'none'
  },

  refundAmount: {
    type: Number,
    default: 0
  },

  refundReason: String,
  refundTransactionId: String,
  refundedAt: Date,

  reconciled: {
    type: Boolean,
    default: false
  },

  reconciledAt: Date,
  reconciledBy: String,

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },

  processedAt: Date,
  completedAt: Date

}, { timestamps: true });

// Indexes for quick queries
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ userId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ paymentMethod: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ 'stripe.paymentIntentId': 1 });
paymentSchema.index({ 'jazzcash.transactionId': 1 });

// Method to mark as completed
paymentSchema.methods.markComplete = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

// Method to mark as failed
paymentSchema.methods.markFailed = function(errorCode, errorMessage, details = {}) {
  this.status = 'failed';
  this.errorCode = errorCode;
  this.errorMessage = errorMessage;
  this.errorDetails = details;
  return this.save();
};

// Method to process refund
paymentSchema.methods.refund = function(amount, reason) {
  if (amount > this.amount) {
    throw new Error('Refund amount cannot exceed payment amount');
  }

  if (amount === this.amount) {
    this.refundStatus = 'full';
  } else {
    this.refundStatus = 'partial';
  }

  this.refundAmount = amount;
  this.refundReason = reason;
  this.refundedAt = new Date();
  this.status = 'refunded';

  return this.save();
};

// Method to get formatted amount
paymentSchema.methods.getFormattedAmount = function() {
  return `${this.currency} ${this.amount.toLocaleString('en-IN', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

// Method to get payment method name
paymentSchema.methods.getPaymentMethodName = function() {
  const names = {
    stripe: 'Credit/Debit Card',
    jazzcash: 'JazzCash',
    cod: 'Cash on Delivery',
    bank_transfer: 'Bank Transfer',
    paypal: 'PayPal'
  };
  return names[this.paymentMethod] || this.paymentMethod;
};

// Method to get status display
paymentSchema.methods.getStatusDisplay = function() {
  const statuses = {
    pending: '⏳ Pending',
    processing: '🔄 Processing',
    completed: '✅ Completed',
    failed: '❌ Failed',
    refunded: '↩️ Refunded',
    cancelled: '🚫 Cancelled'
  };
  return statuses[this.status] || this.status;
};

// Method to check if payment is successful
paymentSchema.methods.isSuccessful = function() {
  return this.status === 'completed' && !this.errorCode;
};

// Method to check if can be refunded
paymentSchema.methods.canBeRefunded = function() {
  return ['completed'].includes(this.status) && this.refundStatus !== 'full';
};

export default mongoose.model('Payment', paymentSchema);
