// models/OrderPaymentLog.js
// Model cho order_payment_log collection 

const mongoose = require('mongoose');

const orderPaymentLogSchema = new mongoose.Schema({
  // Giữ nguyên tất cả field names như trong README_MongoDB.md
  opl_id: {
    type: String,
    required: true,
    trim: true
  },
  order_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  old_payment_status_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentStatus',
    required: true
  },
  new_payment_status_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentStatus',
    required: true
  },
  transaction_code: {
    type: String,
    trim: true,
    maxlength: 100
  },
  payment_gateway_response: {
    type: String,
    trim: true,
    maxlength: 500
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  changed_by_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserManagement',
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now // Auto-generate theo rule
  }
}, {
  collection: 'order_payment_log', // Tên collection chính xác theo rule
  timestamps: false // Không tự động thêm timestamps
});

// Indexes theo README_MongoDB.md
orderPaymentLogSchema.index({ opl_id: 1 }, { unique: true });
orderPaymentLogSchema.index({ order_id: 1 });
orderPaymentLogSchema.index({ old_payment_status_id: 1 });
orderPaymentLogSchema.index({ new_payment_status_id: 1 });

module.exports = mongoose.model('OrderPaymentLog', orderPaymentLogSchema);
