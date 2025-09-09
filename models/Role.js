// models/Role.js
// Model cho role collection 

const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  // Giữ nguyên tất cả field names như trong README_MongoDB.md
  role_id: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  role_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  }
}, {
  collection: 'role', // Tên collection chính xác theo rule
  timestamps: false // Không tự động thêm timestamps
});

// Indexes theo README_MongoDB.md
roleSchema.index({ role_id: 1 }, { unique: true });

module.exports = mongoose.model('Role', roleSchema);
