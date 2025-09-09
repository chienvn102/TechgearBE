// models/ProductReview.js
// Model cho product_review collection 

const mongoose = require('mongoose');

const productReviewSchema = new mongoose.Schema({
  // Giữ nguyên tất cả field names như trong README_MongoDB.md
  review_id: {
    type: String,
    required: true,
    trim: true
  },
  pd_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  review_comment: {
    // Text không giới hạn ký tự theo rule
    type: String,
    required: true,
    trim: true
  },
  created_at: {
    type: Date,
    default: Date.now // Auto-generate theo rule
  }
}, {
  collection: 'product_review', // Tên collection chính xác theo rule
  timestamps: false // Không tự động thêm timestamps
});

// Indexes theo README_MongoDB.md
productReviewSchema.index({ review_id: 1 }, { unique: true });
productReviewSchema.index({ pd_id: 1 });
productReviewSchema.index({ customer_id: 1 });

module.exports = mongoose.model('ProductReview', productReviewSchema);
