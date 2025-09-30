// models/VoucherUsage.js
// Model cho voucher_usage collection 

const mongoose = require('mongoose');

const voucherUsageSchema = new mongoose.Schema({
  // Giữ nguyên tất cả field names như trong README_MongoDB.md
  usage_id: {
    type: String,
    required: true,
    trim: true
  },
  voucher_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Voucher',
    required: true
  },
  order_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserManagement',
    required: true // Required since checkout now requires authentication
  },
  discount_applied: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  collection: 'voucher_usage', // Tên collection chính xác theo rule
  timestamps: false // Không tự động thêm timestamps
});

// Indexes theo README_MongoDB.md
voucherUsageSchema.index({ usage_id: 1 }, { unique: true });
voucherUsageSchema.index({ voucher_id: 1 });
voucherUsageSchema.index({ order_id: 1 });
voucherUsageSchema.index({ user_id: 1 });

module.exports = mongoose.model('VoucherUsage', voucherUsageSchema);
