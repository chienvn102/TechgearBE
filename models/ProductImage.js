// models/ProductImage.js
// Model cho product_image collection 

const mongoose = require('mongoose');

const productImageSchema = new mongoose.Schema({
  // Giữ nguyên tất cả field names như trong README_MongoDB.md
  pd_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  img: {
    type: String,
    required: true,
    trim: true
  },
  color: {
    type: String,
    required: true,
    trim: true
  },
  
  // Primary image flag - ảnh đầu tiên là primary mặc định
  is_primary: {
    type: Boolean,
    default: false
  },
  
  // ✅ CLOUDINARY FIELDS: Mở rộng để hỗ trợ dual storage
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
  
  // Thêm metadata cho optimization - KHÔNG vi phạm schema gốc
  img_metadata: {
    sizes: {
      thumbnail: String, // Path/URL đến thumbnail size
      medium: String,    // Path/URL đến medium size  
      large: String      // Path/URL đến large size
    },
    original_width: Number,
    original_height: Number,
    file_size: Number,
    processed_at: {
      type: Date,
      default: Date.now
    }
  }
}, {
  collection: 'product_image', // Tên collection chính xác theo rule
  timestamps: false // Không tự động thêm timestamps
});

// Indexes theo README_MongoDB.md
productImageSchema.index({ pd_id: 1 });
productImageSchema.index({ color: 1 });
productImageSchema.index({ pd_id: 1, color: 1 }); // Compound index cho filter hiệu quả

// Business rule validation theo README_MongoDB.md
// Lưu ý: Ảnh đầu tiên là ảnh mặc định not null, các ảnh sau null
productImageSchema.pre('save', function(next) {
  // Validation logic sẽ được implement trong controller
  next();
});

// Method để lấy image URL theo size
productImageSchema.methods.getImageUrl = function(size = 'medium') {
  if (this.img_metadata && this.img_metadata.sizes && this.img_metadata.sizes[size]) {
    return this.img_metadata.sizes[size];
  }
  // Fallback to main img field
  return this.img;
};

// Virtual để get all sizes
productImageSchema.virtual('allSizes').get(function() {
  return this.img_metadata?.sizes || {
    medium: this.img
  };
});

module.exports = mongoose.model('ProductImage', productImageSchema);
