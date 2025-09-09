// models/Permission.js
// Model cho permission collection

const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  // Giữ nguyên tất cả field names như trong README_MongoDB.md
  permission_id: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  permission_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  permission_desc: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  collection: 'permission', // Tên collection chính xác theo rule
  timestamps: false // Không tự động thêm timestamps
});

// Indexes theo README_MongoDB.md
permissionSchema.index({ permission_id: 1 }, { unique: true });

module.exports = mongoose.model('Permission', permissionSchema);
