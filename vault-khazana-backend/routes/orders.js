import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({

  orderNumber: {
    type: String,
    unique: true,
    sparse: true
  },

  // ========================
  // CUSTOMER
  // ========================

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null
  },

  // ========================
  // ORDER ITEMS
  // ========================

  items: [{

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

  // ========================
  // SHIPPING ADDRESS
  // ========================

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

  // ========================
  // BILLING ADDRESS
  // ========================

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

  // ========================
  // PRICING
  // ========================

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

  // ========================
  // PAYMENT
  // ========================

  paymentMethod: {
    type: String,
    enum: [
      'stripe',
      'jazzcash',
      'cod'
    ],
    required: true
  },

  paymentStatus: {
    type: String,
    enum: [
      'pending',
      'completed',
      'failed',
      'refunded'
    ],
    default: 'pending'
  },

  stripePaymentIntentId: String,

  jazzcashTransactionId: String,

  paymentError: String,

  // ========================
  // ORDER STATUS
  // ========================

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

  // ========================
  // DELIVERY
  // ========================

  trackingNumber: String,

  estimatedDelivery: Date,

  // ========================
  // OTHER
  // ========================

  notes: String,

  guestCheckout: {
    type: Boolean,
    default: true
  },

  ip: String,

  userAgent: String,

  paidAt: Date,

  deliveredAt: Date

}, {
  timestamps: true
});

// ========================
// INDEXES
// ========================

orderSchema.index({
  userId: 1
});

orderSchema.index({
  orderNumber: 1
});

orderSchema.index({
  orderStatus: 1
});

orderSchema.index({
  paymentStatus: 1
});

orderSchema.index({
  createdAt: -1
});

// ========================
// AUTO-GENERATE ORDER NUMBER
// ========================

orderSchema.pre(
  'save',
  async function(next) {

    if (
      this.isNew &&
      !this.orderNumber
    ) {

      try {

        const count =
          await mongoose
            .model('Order')
            .countDocuments();

        const year =
          new Date().getFullYear();

        const month =
          String(
            new Date().getMonth() + 1
          ).padStart(2, '0');

        this.orderNumber =
          `VK-${year}${month}-${String(
            count + 1
          ).padStart(5, '0')}`;

      } catch (error) {

        return next(error);
      }
    }

    next();
  }
);

// ========================
// UPDATE ORDER STATUS
// ========================

orderSchema.methods.updateStatus =
  function(
    newStatus,
    notes = ''
  ) {

    this.orderStatus =
      newStatus;

    this.statusHistory.push({
      status: newStatus,
      timestamp: new Date(),
      notes
    });

    if (
      newStatus === 'delivered'
    ) {
      this.deliveredAt =
        new Date();
    }

    return this;
  };

// ========================
// MARK PAYMENT COMPLETED
// ========================

orderSchema.methods.markPaymentCompleted =
  function(
    paymentReference = null
  ) {

    this.paymentStatus =
      'completed';

    this.paidAt =
      new Date();

    if (paymentReference) {

      if (
        this.paymentMethod === 'stripe'
      ) {
        this.stripePaymentIntentId =
          paymentReference;
      }

      if (
        this.paymentMethod === 'jazzcash'
      ) {
        this.jazzcashTransactionId =
          paymentReference;
      }
    }

    return this;
  };

// ========================
// EXPORT MODEL
// ========================

const Order =
  mongoose.models.Order ||
  mongoose.model(
    'Order',
    orderSchema
  );

export default Order;