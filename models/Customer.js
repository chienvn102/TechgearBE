// models/Customer.js
// Model cho customer collection 

const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  // Giữ nguyên tất cả field names như trong README_MongoDB.md
  customer_id: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email không hợp lệ']
  },
  phone_number: {
    type: String,
    required: true,
    trim: true,
    match: [/^[0-9]{10,11}$/, 'Số điện thoại phải có 10-11 chữ số']
  }
}, {
  collection: 'customer', // Tên collection chính xác theo rule
  timestamps: false // Không tự động thêm timestamps
});

// Indexes theo README_MongoDB.md
customerSchema.index({ customer_id: 1 }, { unique: true });
customerSchema.index({ email: 1 }, { unique: true });

// Virtual field để lấy addresses của customer
customerSchema.virtual('addresses', {
  ref: 'CustomerAddress',
  localField: '_id',
  foreignField: 'customer_id'
});

// Đảm bảo virtual fields được include khi JSON
customerSchema.set('toJSON', { virtuals: true });
customerSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Customer', customerSchema);
