// models/ProductType.js
// Model cho product_type collection 

const mongoose = require('mongoose');

const productTypeSchema = new mongoose.Schema({
  // Giữ nguyên tất cả field names như trong README_MongoDB.md
  pdt_id: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  pdt_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  pdt_img: {
    type: String,
    trim: true
  },
  cloudinary_public_id: {
    type: String,
    trim: true
  },
  pdt_note: {
    type: String,
    trim: true,
    maxlength: 500
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  collection: 'product_type', // Tên collection chính xác theo rule
  timestamps: false // Không tự động thêm timestamps
});

// Indexes theo README_MongoDB.md
productTypeSchema.index({ pdt_id: 1 }, { unique: true });

module.exports = mongoose.model('ProductType', productTypeSchema);
