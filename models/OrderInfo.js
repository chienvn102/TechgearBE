// models/OrderInfo.js
// Model cho order_info collection 

const mongoose = require('mongoose');

const orderInfoSchema = new mongoose.Schema({
  // Giữ nguyên tất cả field names như trong README_MongoDB.md
  oi_id: {
    type: String,
    required: true,
    trim: true
  },
  od_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  of_state: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    enum: ['PENDING', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED']
  }
}, {
  collection: 'order_info', // Tên collection chính xác theo rule
  timestamps: false // Không tự động thêm timestamps
});

// Indexes theo README_MongoDB.md
orderInfoSchema.index({ oi_id: 1 }, { unique: true });
orderInfoSchema.index({ od_id: 1 });

module.exports = mongoose.model('OrderInfo', orderInfoSchema);
