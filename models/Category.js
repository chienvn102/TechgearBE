// models/Category.js
// Model cho category collection 

const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  // Giữ nguyên tất cả field names như trong README_MongoDB.md
  cg_id: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  cg_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  category_description: {
    // Text không giới hạn ký tự theo rule
    type: String,
    trim: true
  },
  is_active: {
    type: Boolean,
    default: true
  },
  created_at: {
    type: Date,
    default: Date.now // Auto-generate theo rule
  }
}, {
  collection: 'category', // Tên collection chính xác theo rule
  timestamps: false // Không tự động thêm timestamps
});

// Indexes theo README_MongoDB.md
categorySchema.index({ cg_id: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
