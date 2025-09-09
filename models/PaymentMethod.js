// models/PaymentMethod.js
// Model cho payment_method collection 

const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema({
  // Giữ nguyên tất cả field names như trong README_MongoDB.md
  pm_id: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  pm_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  pm_img: {
    type: String,
    trim: true
  }
}, {
  collection: 'payment_method', // Tên collection chính xác theo rule
  timestamps: false // Không tự động thêm timestamps
});

// Indexes theo README_MongoDB.md
paymentMethodSchema.index({ pm_id: 1 }, { unique: true });

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);
