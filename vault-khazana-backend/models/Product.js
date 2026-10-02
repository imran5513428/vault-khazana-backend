import mongoose from 'mongoose';

const priceTierSchema = new mongoose.Schema(
  {
    minQuantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const productSchema = new mongoose.Schema({
  // Stable VAULT KHAZANA catalog ID.
  // This matches the frontend product ID and is separate from MongoDB _id.
  id: {
    type: String,
    unique: true,
    required: true,
    index: true
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

  // Base selling price used when no quantity tier applies.
  // Kept for compatibility with existing backend code.
  pricePerUnit: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0
  },

  // Optional explicit single-unit price.
  unitPrice: {
    type: Number,
    min: 0
  },

  // Optional total price for a defined pack quantity.
  packPrice: {
    type: Number,
    min: 0
  },

  // Number of physical units represented by packPrice.
  packQuantity: {
    type: Number,
    min: 1
  },

  // Optional quantity-based pricing tiers.
  priceTiers: {
    type: [priceTierSchema],
    default: []
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

  // Products are not individually inventory-tracked yet.
  // When trackInventory is false, stockQuantity is not used
  // to decide whether the product is available for sale.
  inStock: {
    type: Boolean,
    default: true
  },

  trackInventory: {
    type: Boolean,
    default: false
  },

  stockQuantity: {
    type: Number,
    default: 0,
    min: 0
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

// Get the applicable unit price for a quantity.
// This keeps checkout pricing under backend control.
productSchema.methods.getUnitPriceForQuantity = function(quantity) {
  const qty = Number(quantity);

  if (!Number.isFinite(qty) || qty <= 0) {
    return this.unitPrice ?? this.pricePerUnit;
  }

  let applicablePrice = this.unitPrice ?? this.pricePerUnit;

  if (Array.isArray(this.priceTiers) && this.priceTiers.length > 0) {
    const applicableTier = [...this.priceTiers]
      .filter((tier) => qty >= Number(tier.minQuantity))
      .sort((a, b) => Number(b.minQuantity) - Number(a.minQuantity))[0];

    if (applicableTier) {
      applicablePrice = Number(applicableTier.unitPrice);
    }
  }

  return applicablePrice;
};

// Method to validate quantity
productSchema.methods.validateQuantity = function(quantity) {
  const qty = Number(quantity);

  if (!Number.isFinite(qty) || qty <= 0) {
    return {
      valid: false,
      error: 'Quantity must be a positive number'
    };
  }

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

  const unitPrice = this.getUnitPriceForQuantity(quantity);
  const total = unitPrice * Number(quantity);
  const discount = Number(this.discount) || 0;
  const finalPrice = total * (1 - discount / 100);

  return {
    valid: true,
    quantity: Number(quantity),
    unitPrice,
    subtotal: total,
    discount,
    finalPrice
  };
};

// Method to check if available
productSchema.methods.isAvailable = function() {
  if (this.isDiscontinued || !this.inStock) {
    return false;
  }

  if (!this.trackInventory) {
    return true;
  }

  return this.stockQuantity > 0;
};

// Method to get minimum order amount
productSchema.methods.getMinimumOrderAmount = function() {
  return this.getUnitPriceForQuantity(this.moq) * this.moq;
};

export default mongoose.model('Product', productSchema);