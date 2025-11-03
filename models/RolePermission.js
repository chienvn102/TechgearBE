// models/RolePermission.js
// Model cho role_permission collection 

const mongoose = require('mongoose');

const rolePermissionSchema = new mongoose.Schema({
 
  role_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },
  permission_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission',
    required: true
  }
}, {
  collection: 'role_permission', // Tên collection chính xác theo rule
  timestamps: false // Không tự động thêm timestamps
});

// Indexes theo README_MongoDB.md
rolePermissionSchema.index({ role_id: 1 });
rolePermissionSchema.index({ permission_id: 1 });

// Compound unique index để tránh duplicate role-permission pairs
rolePermissionSchema.index({ role_id: 1, permission_id: 1 }, { unique: true });

module.exports = mongoose.model('RolePermission', rolePermissionSchema);
