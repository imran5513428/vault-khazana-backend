import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    sparse: true
  },

  // Optional because VAULT KHAZANA will support guest checkout.
  // Logged-in customers can still have their User ID attached.
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null
  },

  items: [{
    // This is the stable VAULT KHAZANA catalog ID,
    // not the MongoDB _id.
    productId: {
      type: String,
      required: true
    },

    productName: {
      type: String,
      required: true
    },

    quantity: {
      type: Number,
      required: true,
      min: 1
    },

    // Final server-controlled unit price used for this order.
    pricePerUnit: {
      type: Number,
      required: true,
      min: 0
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0
    }
  }],

  shippingAddress: {
    fullName: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      trim: true,
      lowercase: true
    },

    phone: {
      type: String,
      required: true,
      trim: true
    },

    street: {
      type: String,
      required: true,
      trim: true
    },

    city: {
      type: String,
      required: true,
      trim: true
    },

    province: {
      type: String,
      trim: true
    },

    postalCode: {
      type: String,
      trim: true
    },

    country: {
      type: String,
      default: 'Pakistan',
      trim: true
    }
  },

  billingAddress: {
    fullName: {
      type: String,
      trim: true
    },

    email: {
      type: String,
      trim: true,
      lowercase: true
    },

    phone: {
      type: String,
      trim: true
    },

    street: {
      type: String,
      trim: true
    },

    city: {
      type: String,
      trim: true
    },

    province: {
      type: String,
      trim: true
    },

    postalCode: {
      type: String,
      trim: true
    },

    country: {
      type: String,
      default: 'Pakistan',
      trim: true
    }
  },

  subtotal: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },

  shippingCost: {
    type: Number,
    default: 0,
    min: 0
  },

  tax: {
    type: Number,
    default: 0,
    min: 0
  },

  discount: {
    type: Number,
    default: 0,
    min: 0
  },

  discountCode: String,

  total: {
    type: Number,
    required: true,
    min: 0
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
    enum: [
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'cancelled'
    ],
    default: 'pending'
  },

  statusHistory: [{
    status: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],

  trackingNumber: String,
  estimatedDelivery: Date,

  notes: String,

  // True when the order was placed without a customer account.
  guestCheckout: {
    type: Boolean,
    default: true
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

// ========================
// INDEXES
// ========================

orderSchema.index({ userId: 1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });

// ========================
// AUTO-GENERATE ORDER NUMBER
// ========================

orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    try {
      const count = await mongoose.model('Order').countDocuments();
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');

      this.orderNumber =
        `VK-${year}${month}-${String(count + 1).padStart(5, '0')}`;
    } catch (error) {
      return next(error);
    }
  }

  next();
});

// ========================
// UPDATE ORDER STATUS
// ========================

orderSchema.methods.updateStatus = function(newStatus, notes = '') {
  this.orderStatus = newStatus;

  if (!Array.isArray(this.statusHistory)) {
    this.statusHistory = [];
  }

  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    notes
  });

  if (newStatus === 'delivered') {
    this.deliveredAt = new Date();
  }

  this.updatedAt = new Date();

  return this;
};

// ========================
// MARK PAYMENT COMPLETED
// ========================

orderSchema.methods.markPaymentCompleted = function(paymentReference = null) {
  this.paymentStatus = 'completed';
  this.paidAt = new Date();
  this.paymentError = undefined;

  if (this.paymentMethod === 'stripe' && paymentReference) {
    this.stripePaymentIntentId = paymentReference;
  }

  if (this.paymentMethod === 'jazzcash' && paymentReference) {
    this.jazzcashTransactionId = paymentReference;
  }

  this.updatedAt = new Date();

  return this;
};

// ========================
// EXPORT MODEL
// ========================

const Order = mongoose.model('Order', orderSchema);

export default Order;