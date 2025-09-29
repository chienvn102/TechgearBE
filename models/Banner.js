// models/Banner.js
// Model cho banner collection 

const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  // CORE FIELDS theo README_MongoDB.md
  banner_id: {
    type: String,
    required: false, // Auto-generated, not required from input
    unique: true,
    trim: true
  },
  pd_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  
  
  // IMAGE FIELDS (Cloudinary)
  banner_image_url: {
    type: String,
    required: true // Banner must have image
  },
  cloudinary_public_id: {
    type: String,
    default: null
  },
  
  // DISPLAY ORDER
  banner_order: {
    type: Number,
    default: 0
  },
  
  
  // STATUS
  is_active: {
    type: Boolean,
    default: true
  },
  
  // OPTIONAL: Direct link override (if not using product link)
  banner_link_url: {
    type: String,
    default: null
  }
}, {
  collection: 'banner',
  timestamps: true
});

// Indexes theo README_MongoDB.md
bannerSchema.index({ banner_id: 1 }, { unique: true });
bannerSchema.index({ pd_id: 1 });

module.exports = mongoose.model('Banner', bannerSchema);
