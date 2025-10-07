// models/Order.js
// Model cho order collection 

const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // Giữ nguyên tất cả field names như trong README_MongoDB.md
  od_id: {
    type: String,
    required: true,
    trim: true
  },
  po_id: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductOrder',
    required: true
  }],
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  customer_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  shipping_address: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  order_datetime: {
    type: Date,
    required: true,
    default: Date.now
  },
  pm_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentMethod',
    required: true
  },
  order_note: {
    type: String,
    trim: true,
    maxlength: 500
  },
  voucher_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Voucher'
  },
  payment_status_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentStatus',
    required: true
  },
  order_total: {
    type: Number,
    required: true,
    min: 0
  },
  // PayOS Payment Integration fields
  payment_transaction_id: {
    type: String,
    default: null,
    trim: true
  },
  payos_order_code: {
    type: Number,
    default: null,
    sparse: true
  }
}, {
  collection: 'order', // Tên collection chính xác theo rule
  timestamps: false // Không tự động thêm timestamps
});

// Indexes theo README_MongoDB.md
orderSchema.index({ od_id: 1 }, { unique: true });
orderSchema.index({ po_id: 1 });
orderSchema.index({ customer_id: 1 });
orderSchema.index({ pm_id: 1 });
orderSchema.index({ voucher_id: 1 });
orderSchema.index({ payment_status_id: 1 });
orderSchema.index({ order_datetime: -1 }); // Performance index
orderSchema.index({ payment_transaction_id: 1 }, { sparse: true }); // PayOS integration
// payos_order_code will be indexed automatically via sparse: true in schema

module.exports = mongoose.model('Order', orderSchema);
