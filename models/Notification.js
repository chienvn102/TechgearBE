// models/Notification.js
// Model cho notification collection 

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Giữ nguyên tất cả field names như trong README_MongoDB.md
  noti_id: {
    type: String,
    required: true,
    trim: true
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  noti_type: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    enum: ['ORDER_STATUS', 'PROMOTION', 'SYSTEM', 'PAYMENT', 'DELIVERY']
  },
  noti_title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  noti_content: {
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
  collection: 'notification', // Tên collection chính xác theo rule
  timestamps: false // Không tự động thêm timestamps
});

// Indexes theo README_MongoDB.md
notificationSchema.index({ noti_id: 1 }, { unique: true });
notificationSchema.index({ customer_id: 1 });
notificationSchema.index({ created_at: -1 }); // Performance index

module.exports = mongoose.model('Notification', notificationSchema);
