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
    required: false, // null nếu gửi cho tất cả
    default: null
  },
  noti_type: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    enum: ['ORDER_STATUS', 'PROMOTION', 'SYSTEM', 'PAYMENT', 'DELIVERY', 'ORDER_CANCELLED', 'ORDER_CONFIRMED', 'ORDER_SHIPPED']
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
  // Thêm fields mới cho notification system
  is_read: {
    type: Boolean,
    default: false
  },
  read_at: {
    type: Date,
    default: null
  },
  // Target audience cho broadcast notifications
  target_audience: {
    type: String,
    enum: ['ALL', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'SPECIFIC'],
    default: 'SPECIFIC'
  },
  // Link to related resource (order, product, etc.)
  link_to: {
    type: String,
    default: null
  },
  // Related order if notification is about order
  order_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  // Priority level
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM'
  },
  created_at: {
    type: Date,
    default: Date.now // Auto-generate theo rule
  }
}, {
  collection: 'notification', // Tên collection chính xác theo rule
  timestamps: false // Không tự động thêm timestamps
});

// Indexes theo README_MongoDB.md + thêm indexes cho notification system
notificationSchema.index({ noti_id: 1 }, { unique: true });
notificationSchema.index({ customer_id: 1 });
notificationSchema.index({ created_at: -1 }); // Performance index
notificationSchema.index({ is_read: 1, customer_id: 1 }); // Query unread notifications
notificationSchema.index({ target_audience: 1 }); // Filter by audience
notificationSchema.index({ noti_type: 1 }); // Filter by type
notificationSchema.index({ order_id: 1 }); // Find by order

module.exports = mongoose.model('Notification', notificationSchema);
