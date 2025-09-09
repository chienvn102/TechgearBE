// models/Player.js
// Model cho player collection 

const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  // Giữ nguyên tất cả field names như trong README_MongoDB.md
  player_id: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  player_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  player_content: {
    // Text không giới hạn ký tự theo rule
    type: String,
    trim: true
  },
  player_img: {
    type: String,
    trim: true
  },
  
  // ✅ CLOUDINARY FIELDS: Mở rộng để hỗ trợ Cloudinary storage
  cloudinary_public_id: {
    type: String,
    sparse: true // Chỉ có khi sử dụng Cloudinary
  },
  cloudinary_url: {
    type: String,
    sparse: true
  },
  cloudinary_secure_url: {
    type: String,
    sparse: true
  },
  storage_type: {
    type: String,
    enum: ['local', 'cloudinary'],
    default: 'local'
  },
  
  // ✅ IMAGE METADATA: Lưu thông tin ảnh processed
  img_metadata: {
    sizes: {
      thumbnail: String, // 200x200 cho avatar
      medium: String,    // 500x500 cho profile
      large: String      // 1000x1000 cho gallery
    },
    format: String,
    width: Number,
    height: Number,
    bytes: Number
  },
  achievements: {
    type: String,
    trim: true,
    maxlength: 500
  },
  team_name: {
    type: String,
    trim: true,
    maxlength: 100
  },
  role: {
    type: String,
    trim: true,
    maxlength: 100
  },
  is_active: {
    type: Boolean,
    default: true
  },
  created_at: {
    type: Date,
    default: Date.now // Auto-generate theo rule
  }
}, {
  collection: 'player', // Tên collection chính xác theo rule
  timestamps: false // Không tự động thêm timestamps
});

// Indexes theo README_MongoDB.md
playerSchema.index({ player_id: 1 }, { unique: true });

module.exports = mongoose.model('Player', playerSchema);
