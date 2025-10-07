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
  },
  // ========== ENHANCEMENTS FOR REVIEW SYSTEM ==========
  // Review images - uploaded to Cloudinary
  review_images: [{
    image_url: {
      type: String,
      trim: true
    },
    cloudinary_public_id: {
      type: String,
      trim: true
    },
    cloudinary_secure_url: {
      type: String,
      trim: true
    },
    uploaded_at: {
      type: Date,
      default: Date.now
    }
  }],
  // Purchase verification
  order_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null // Reference to order for purchase verification
  },
  is_verified_purchase: {
    type: Boolean,
    default: false // True if customer actually bought this product
  },
  // Admin moderation
  is_hidden: {
    type: Boolean,
    default: false // Admin can hide inappropriate reviews
  },
  hidden_at: {
    type: Date,
    default: null
  },
  hidden_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserManagement',
    default: null
  },
  hidden_reason: {
    type: String,
    trim: true,
    default: null
  },
  // Additional metadata
  helpful_count: {
    type: Number,
    default: 0 // Number of users who found this review helpful
  },
  reported_count: {
    type: Number,
    default: 0 // Number of reports (spam, inappropriate, etc.)
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
