// models/AuditTrail.js
// Model cho audit_trail collection 

const mongoose = require('mongoose');

const auditTrailSchema = new mongoose.Schema({
  // Giữ nguyên tất cả field names như trong README_MongoDB.md
  audit_id: {
    type: String,
    required: true,
    trim: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserManagement',
    required: true
  },
  action: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT']
  },
  table_name: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  old_value: {
    type: String,
    trim: true
  },
  created_at: {
    type: Date,
    default: Date.now // Auto-generate theo rule
  }
}, {
  collection: 'audit_trail', // Tên collection chính xác theo rule
  timestamps: false // Không tự động thêm timestamps
});

// Indexes theo README_MongoDB.md
auditTrailSchema.index({ audit_id: 1 }, { unique: true });
auditTrailSchema.index({ user_id: 1 });
auditTrailSchema.index({ created_at: -1 }); // Performance index

module.exports = mongoose.model('AuditTrail', auditTrailSchema);
