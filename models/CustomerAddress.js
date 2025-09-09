// models/CustomerAddress.js
// Model cho customer_address collection 

const mongoose = require('mongoose');

const customerAddressSchema = new mongoose.Schema({
  // Giữ nguyên tất cả field names như trong README_MongoDB.md
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  name: {
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
  address: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  }
}, {
  collection: 'customer_address', // Tên collection chính xác theo rule
  timestamps: false // Không tự động thêm timestamps
});

// Indexes theo README_MongoDB.md
customerAddressSchema.index({ customer_id: 1 });

// Business rule validation theo README_MongoDB.md
// Lưu ý: Địa chỉ đầu tiên là địa chỉ mặc định not null, các địa chỉ sau null
customerAddressSchema.pre('save', function(next) {
  // Validation logic sẽ được implement trong controller
  next();
});

module.exports = mongoose.model('CustomerAddress', customerAddressSchema);
