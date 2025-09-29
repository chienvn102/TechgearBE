// config/multer.config.js
// Multer configuration cho upload ảnh tối ưu deployment 

const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Storage configuration - Dynamic based on STORAGE_METHOD
const storageMethod = process.env.STORAGE_METHOD || 'local';

let storage;
if (storageMethod === 'cloudinary') {
  // Memory storage cho Cloudinary
  storage = multer.memoryStorage();
} else {
  // Disk storage cho local storage
  storage = multer.diskStorage({
    destination: async function (req, file, cb) {
      try {
        // Tạo folder structure theo năm/tháng cho deployment optimization
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        
        // Xác định upload type dựa vào route
        let uploadType = 'products'; // default
        if (req.route.path.includes('banner')) {
          uploadType = 'banners';
        } else if (req.route.path.includes('brand')) {
          uploadType = 'brands';
        } else if (req.route.path.includes('player')) {
          uploadType = 'players';
        } else if (req.route.path.includes('post')) {
          uploadType = 'posts';
        }
        
        // Tạo folder structure: uploads/type/year/month/temp
        const uploadPath = path.join(
          process.cwd(), 
          'public', 
          'uploads', 
          uploadType, 
          year.toString(), 
          month,
          'temp' // Temporary folder cho processing
        );
        
        // Tạo directory nếu chưa tồn tại
        await fs.mkdir(uploadPath, { recursive: true });
        
        cb(null, uploadPath);
      } catch (error) {
        console.error('Error creating upload directory:', error);
        cb(error, null);
      }
    },
    
    filename: function (req, file, cb) {
      try {
        // Tạo unique filename cho production
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, fileExtension);
        
        // Format: originalname_timestamp_random.ext
        const filename = `${baseName}_${uniqueSuffix}${fileExtension}`;
        
        cb(null, filename);
      } catch (error) {
        cb(error, null);
      }
    }
  });
}

// File filter cho security và validation
const fileFilter = (req, file, cb) => {
  try {
    console.log('🔍 Multer file filter - File received:');
    console.log('  - Field name:', file.fieldname);
    console.log('  - Original name:', file.originalname);
    console.log('  - MIME type:', file.mimetype);
    console.log('  - Size:', file.size);
    
    // Chỉ chấp nhận image files
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (!allowedTypes.includes(file.mimetype)) {
      console.log('❌ File type not allowed:', file.mimetype);
      return cb(new Error('Chỉ chấp nhận file JPG, PNG, WebP'), false);
    }

    // Check file extension để tránh bypass
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      console.log('❌ File extension not allowed:', fileExtension);
      return cb(new Error('File extension không hợp lệ'), false);
    }

    console.log('✅ File validation passed');
    cb(null, true);
  } catch (error) {
    console.error('❌ File filter error:', error);
    cb(error, false);
  }
};

// Upload configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max cho mỗi file
    files: 10 // Tối đa 10 files cùng lúc
  }
});

module.exports = { upload };
