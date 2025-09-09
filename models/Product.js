// models/Product.js
// Model cho product collection 

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // Giữ nguyên tất cả field names như trong README_MongoDB.md
  pd_id: {
    type: String,
    required: true,
    trim: true
  },
  pd_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  pd_price: {
    type: Number,
    required: true,
    min: 0
  },
  pd_quantity: {
    type: Number,
    required: true,
    min: 0
  },
  pd_note: {
    // Text không giới hạn ký tự theo rule
    type: String,
    trim: true
  },
  pd_day_updated: {
    type: Date,
    default: Date.now
  },
  br_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  },
  pdt_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductType',
    required: true
  },
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  player_id: {
    // Có thể null theo rule trong README_MongoDB.md
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null
  },
  product_description: {
    // Text không giới hạn ký tự theo rule
    type: String,
    trim: true
  },
  stock_quantity: {
    type: Number,
    required: true,
    min: 0
  },
  is_available: {
    type: Boolean,
    default: true
  },
  color: {
    type: String,
    required: true,
    trim: true
  },
  sku: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  created_at: {
    type: Date,
    default: Date.now // Auto-generate theo rule
  }
}, {
  collection: 'product', // Tên collection chính xác theo rule
  timestamps: false // Không tự động thêm timestamps
});

// Indexes theo README_MongoDB.md
productSchema.index({ pd_id: 1 }, { unique: true });
productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ br_id: 1 });
productSchema.index({ pdt_id: 1 });
productSchema.index({ category_id: 1 });
productSchema.index({ player_id: 1 });
productSchema.index({ color: 1 });
productSchema.index({ is_available: 1 });

module.exports = mongoose.model('Product', productSchema);
