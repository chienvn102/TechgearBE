// models/Brand.js
// Model cho brand collection 

const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  // Giữ nguyên tất cả field names như trong README_MongoDB.md
  br_id: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  br_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  br_img: {
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
      thumbnail: String, // 200x200 cho danh sách
      medium: String,    // 500x500 cho detail
      large: String      // 1000x1000 cho zoom
    },
    format: String,
    width: Number,
    height: Number,
    bytes: Number
  },
  br_note: {
    type: String,
    trim: true,
    maxlength: 500
  },
  brand_description: {
    // Text không giới hạn ký tự theo rule
    type: String,
    trim: true
  },
  website_url: {
    type: String,
    trim: true,
    match: [/^https?:\/\/.+/, 'URL phải bắt đầu với http:// hoặc https://']
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
  collection: 'brand', // Tên collection chính xác theo rule
  timestamps: false // Không tự động thêm timestamps
});

// Indexes theo README_MongoDB.md
brandSchema.index({ br_id: 1 }, { unique: true });

module.exports = mongoose.model('Brand', brandSchema);
