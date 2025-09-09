// models/PaymentStatus.js
// Model cho payment_status collection 

const mongoose = require('mongoose');

const paymentStatusSchema = new mongoose.Schema({
  // Giữ nguyên tất cả field names như trong README_MongoDB.md
  ps_id: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  ps_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  ps_description: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  collection: 'payment_status', // Tên collection chính xác theo rule
  timestamps: false // Không tự động thêm timestamps
});

// Indexes theo README_MongoDB.md
paymentStatusSchema.index({ ps_id: 1 }, { unique: true });

module.exports = mongoose.model('PaymentStatus', paymentStatusSchema);
