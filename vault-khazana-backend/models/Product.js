import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    required: true
  },

  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    index: true
  },

  slug: {
    type: String,
    unique: true,
    lowercase: true,
    index: true
  },

  description: String,

  categoryId: {
    type: String,
    required: true,
    index: true
  },

  categoryName: String,

  imageSlug: String,
  images: [String],

  specifications: String,
  dimensions: String,
  material: String,
  color: String,
  brand: String,

  pricePerUnit: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0
  },

  sellingUnit: {
    type: String,
    enum: ['piece', 'pack', 'kg', 'liter'],
    default: 'piece'
  },

  moq: {
    type: Number,
    default: 1,
    min: 1
  },

  step: {
    type: Number,
    default: 1,
    min: 1
  },

  packSize: Number,

  inStock: {
    type: Boolean,
    default: true
  },

  stockQuantity: {
    type: Number,
    default: 0
  },

  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },

  totalRatings: {
    type: Number,
    default: 0
  },

  reviews: [{
    userId: mongoose.Schema.Types.ObjectId,
    userName: String,
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    createdAt: { type: Date, default: Date.now }
  }],

  isNew: {
    type: Boolean,
    default: false
  },

  isFeatured: {
    type: Boolean,
    default: false
  },

  isDiscontinued: {
    type: Boolean,
    default: false
  },

  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  discountedPrice: Number,

  supportsCustomPrinting: {
    type: Boolean,
    default: false
  },

  printingOptions: {
    types: [String],
    pricePerPrint: Number,
    turnaroundDays: Number
  },

  sku: String,
  upc: String,

  tags: [String],

  adminNotes: String,

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },

  lastStockUpdate: Date

}, { timestamps: true });

// Text search index
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Virtual field for display price
productSchema.virtual('displayPrice').get(function() {
  if (this.discount > 0) {
    return this.pricePerUnit * (1 - this.discount / 100);
  }
  return this.pricePerUnit;
});

// Method to validate quantity
productSchema.methods.validateQuantity = function(quantity) {
  const qty = Number(quantity);

  if (qty < this.moq) {
    return {
      valid: false,
      error: `Minimum order is ${this.moq} ${this.sellingUnit}(s)`
    };
  }

  if ((qty - this.moq) % this.step !== 0) {
    return {
      valid: false,
      error: `Quantity must increase in steps of ${this.step}`
    };
  }

  return { valid: true };
};

// Method to calculate total price
productSchema.methods.calculateTotal = function(quantity) {
  const validation = this.validateQuantity(quantity);
  if (!validation.valid) {
    return { valid: false, error: validation.error };
  }

  const total = this.pricePerUnit * quantity;
  return {
    valid: true,
    quantity,
    unitPrice: this.pricePerUnit,
    subtotal: total,
    discount: this.discount,
    finalPrice: total * (1 - this.discount / 100)
  };
};

// Method to check if available
productSchema.methods.isAvailable = function() {
  return this.inStock && !this.isDiscontinued && this.stockQuantity > 0;
};

// Method to get minimum order amount
productSchema.methods.getMinimumOrderAmount = function() {
  return this.pricePerUnit * this.moq;
};

export default mongoose.model('Product', productSchema);
