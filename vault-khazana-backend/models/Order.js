import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    sparse: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },

  items: [{
    productId: {
      type: String,
      required: true
    },
    productName: String,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    pricePerUnit: {
      type: Number,
      required: true
    },
    subtotal: {
      type: Number,
      required: true
    }
  }],

  shippingAddress: {
    fullName: String,
    email: String,
    phone: String,
    street: String,
    city: String,
    province: String,
    postalCode: String,
    country: { type: String, default: 'Pakistan' }
  },

  billingAddress: {
    fullName: String,
    email: String,
    phone: String,
    street: String,
    city: String,
    province: String,
    postalCode: String,
    country: { type: String, default: 'Pakistan' }
  },

  subtotal: {
    type: Number,
    required: true,
    default: 0
  },

  shippingCost: {
    type: Number,
    default: 0
  },

  tax: {
    type: Number,
    default: 0
  },

  discount: {
    type: Number,
    default: 0
  },

  discountCode: String,

  total: {
    type: Number,
    required: true
  },

  paymentMethod: {
    type: String,
    enum: ['stripe', 'jazzcash', 'cod'],
    required: true
  },

  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },

  stripePaymentIntentId: String,
  jazzcashTransactionId: String,
  paymentError: String,

  orderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },

  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    notes: String
  }],

  trackingNumber: String,
  estimatedDelivery: Date,

  notes: String,

  guestCheckout: {
    type: Boolean,
    default: false
  },

  ip: String,
  userAgent: String,

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },

  paidAt: Date,
  deliveredAt: Date

}, { timestamps: true });

// Index for quick queries
orderSchema.index({ userId: 1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });

// Auto-generate order number
orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    try {
      const count = await mongoose.model('Order').countDocuments();
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      this.orderNumber = `VK-${year}${month}-${String(count + 1).padStart(5, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Method to update order status
orderSchema.methods.updateStatus = function(newStatus, notes = '') {
  this.orderStatus = newStatus;
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    notes
  });

  if (newStatus === 'delivered') {
    this.deliveredAt = new Date();
  }

  return this.save();
};

// Method to get formatted total
orderSchema.methods.getFormattedTotal = function() {
  return `Rs ${this.total.toLocaleString('en-PK')}`;
};

// Method to check if can be cancelled
orderSchema.methods.canBeCancelled = function() {
  return ['pending', 'confirmed'].includes(this.orderStatus) && this.paymentStatus !== 'completed';
};

// Method to get order summary
orderSchema.methods.getSummary = function() {
  return {
    orderNumber: this.orderNumber,
    total: this.getFormattedTotal(),
    status: this.orderStatus,
    items: this.items.length,
    createdAt: this.createdAt.toLocaleDateString('en-PK')
  };
};

export default mongoose.model('Order', orderSchema);
