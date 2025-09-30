// models/Ranking.js
// Model cho ranking collection 

const mongoose = require('mongoose');

const rankingSchema = new mongoose.Schema({
  // Giữ nguyên tất cả field names như trong README_MongoDB.md
  rank_id: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  rank_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  min_spending: {
    type: Number,
    required: true,
    min: 0
  },
  max_spending: {
    type: Number,
    required: true,
    min: 0
  },
  img: {
    type: String,
    trim: true
  },
  about: {
    type: String,
    trim: true,
    maxlength: 500
  },
  discount_percent: {
    type: Number,
    required: false,
    min: 0,
    max: 100,
    default: 0
  },
  benefits: [{
    type: String,
    trim: true
  }]
}, {
  collection: 'ranking', // Tên collection chính xác theo rule
  timestamps: false // Không tự động thêm timestamps
});

// Validation để đảm bảo max_spending > min_spending
rankingSchema.pre('save', function(next) {
  if (this.max_spending <= this.min_spending) {
    return next(new Error('max_spending phải lớn hơn min_spending'));
  }
  next();
});

module.exports = mongoose.model('Ranking', rankingSchema);
