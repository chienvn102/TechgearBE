// models/Banner.js
// Model cho banner collection 

const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  // Giữ nguyên tất cả field names như trong README_MongoDB.md
  banner_id: {
    type: String,
    required: true,
    trim: true
  },
  pd_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  banner_position: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    enum: ['HOME_TOP', 'HOME_MIDDLE', 'HOME_BOTTOM', 'CATEGORY_TOP', 'PRODUCT_SIDE']
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  collection: 'banner', // Tên collection chính xác theo rule
  timestamps: false // Không tự động thêm timestamps
});

// Indexes theo README_MongoDB.md
bannerSchema.index({ banner_id: 1 }, { unique: true });
bannerSchema.index({ pd_id: 1 });

module.exports = mongoose.model('Banner', bannerSchema);
