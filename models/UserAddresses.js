// models/UserAddresses.js
// Model cho user_addresses collection 

const mongoose = require('mongoose');

const userAddressesSchema = new mongoose.Schema({
  // Giữ nguyên tất cả field names như trong README_MongoDB.md
  address_id: {
    type: String,
    required: true,
    trim: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserManagement',
    required: true
  },
  address_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  recipient_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  phone_number: {
    type: String,
    required: true,
    trim: true,
    match: [/^[0-9]{10,11}$/, 'Số điện thoại phải có 10-11 chữ số']
  },
  address_line: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300
  },
  ward: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  district: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  province: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  is_default: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: Date.now // Auto-generate theo rule
  }
}, {
  collection: 'user_addresses', // Tên collection chính xác theo rule
  timestamps: false // Không tự động thêm timestamps
});

// Indexes theo README_MongoDB.md
userAddressesSchema.index({ address_id: 1 }, { unique: true });
userAddressesSchema.index({ user_id: 1 });

module.exports = mongoose.model('UserAddresses', userAddressesSchema);
