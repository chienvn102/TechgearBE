// models/Post.js
// Model cho post collection 

const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  // Giữ nguyên tất cả field names như trong README_MongoDB.md
  post_id: {
    type: String,
    required: true,
    trim: true
  },
  post_img: {
    type: String,
    trim: true
  },
  post_title: {
    // Text không giới hạn ký tự theo rule
    type: String,
    required: true,
    trim: true
  },
  post_content: {
    // Text không giới hạn ký tự theo rule
    type: String,
    required: true,
    trim: true
  }
}, {
  collection: 'post', // Tên collection chính xác theo rule
  timestamps: false // Không tự động thêm timestamps
});

// Indexes theo README_MongoDB.md
postSchema.index({ post_id: 1 }, { unique: true });

module.exports = mongoose.model('Post', postSchema);
