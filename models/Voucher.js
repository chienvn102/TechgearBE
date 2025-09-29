// models/Voucher.js
// Model cho voucher collection 

const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema({
  // Giữ nguyên tất cả field names như trong README_MongoDB.md
  voucher_id: {
    type: String,
    required: true,
    trim: true
  },
  voucher_code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  voucher_name: {
    // Text không giới hạn ký tự theo rule
    type: String,
    required: true,
    trim: true
  },
  discount_percent: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  min_order_value: {
    type: Number,
    required: true,
    min: 0
  },
  start_date: {
    type: Date,
    required: true
  },
  end_date: {
    type: Date,
    required: true
  },
  discount_amount: {
    type: Number,
    required: true,
    min: 0
  },
  max_discount_amount: {
    type: Number,
    required: true,
    min: 0
  },
  max_uses: {
    type: Number,
    required: true,
    min: 1
  },
  current_uses: {
    type: Number,
    default: 0,
    min: 0
  },
  ranking_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ranking',
    required: false // Optional - voucher có thể dành cho tất cả khách hàng
  },
  is_active: {
    type: Boolean,
    default: true
  },
  created_at: {
    type: Date,
    default: Date.now // Auto-generate theo rule
  }
}, {
  collection: 'voucher', // Tên collection chính xác theo rule
  timestamps: false // Không tự động thêm timestamps
});

// Indexes theo README_MongoDB.md
voucherSchema.index({ voucher_id: 1 }, { unique: true });
voucherSchema.index({ voucher_code: 1 }, { unique: true });
voucherSchema.index({ ranking_id: 1 });
voucherSchema.index({ is_active: 1 });
voucherSchema.index({ start_date: 1, end_date: 1 });

// Validation theo business rules
voucherSchema.pre('save', function(next) {
  if (this.end_date <= this.start_date) {
    return next(new Error('end_date phải sau start_date'));
  }
  if (this.current_uses > this.max_uses) {
    return next(new Error('current_uses không thể vượt quá max_uses'));
  }
  next();
});

module.exports = mongoose.model('Voucher', voucherSchema);
