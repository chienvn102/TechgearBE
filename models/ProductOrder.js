// models/ProductOrder.js
// Model cho product_order collection 

const mongoose = require('mongoose');

const productOrderSchema = new mongoose.Schema({
  // Giữ nguyên tất cả field names như trong README_MongoDB.md
  po_id: {
    type: String,
    required: true,
    trim: true
  },
  pd_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  po_quantity: {
    type: Number,
    required: true,
    min: 1
  },
  po_price: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  collection: 'product_order', // Tên collection chính xác theo rule
  timestamps: false // Không tự động thêm timestamps
});

// Indexes theo README_MongoDB.md
productOrderSchema.index({ po_id: 1 }, { unique: true });
productOrderSchema.index({ pd_id: 1 });

module.exports = mongoose.model('ProductOrder', productOrderSchema);
