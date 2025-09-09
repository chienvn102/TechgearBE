// models/CustomerRanking.js
// Model cho customer_ranking collection 

const mongoose = require('mongoose');

const customerRankingSchema = new mongoose.Schema({
  // Giữ nguyên tất cả field names như trong README_MongoDB.md
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  rank_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ranking',
    required: true
  }
}, {
  collection: 'customer_ranking', // Tên collection chính xác theo rule
  timestamps: false // Không tự động thêm timestamps
});

// Indexes theo README_MongoDB.md
customerRankingSchema.index({ customer_id: 1 });
customerRankingSchema.index({ rank_id: 1 });

module.exports = mongoose.model('CustomerRanking', customerRankingSchema);
