// routes/bannerUploadRoutes.js
// Routes cho banner image upload

const express = require('express');
const router = express.Router();
const bannerUploadController = require('../controllers/bannerUploadController');
const { upload } = require('../config/multer.config');
const { authenticateToken, authorize } = require('../middleware/auth');
const { body } = require('express-validator');

// Validation rules cho banner image upload
const bannerImageValidation = (req, res, next) => {
  // Manual validation for FormData
  if (!req.body.banner_id) {
    return res.status(400).json({
      success: false,
      message: 'Banner ID is required'
    });
  }
  
  if (typeof req.body.banner_id !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Banner ID must be a string'
    });
  }
  
  next();
};

// ✅ UPLOAD BANNER IMAGE
// POST /api/v1/upload/banner
// Requires: Admin/Manager role, image file, banner_id
router.post('/',
  authenticateToken,
  authorize('ADMIN', 'MANAGER'),
  (req, res, next) => {
    console.log('🔍 Before multer - Request info:');
    console.log('  - Method:', req.method);
    console.log('  - Headers:', req.headers);
    console.log('  - Body keys:', Object.keys(req.body || {}));
    next();
  },
  upload.single('banner_image'),
  (req, res, next) => {
    console.log('🔍 After multer - Request info:');
    console.log('  - req.file:', req.file);
    console.log('  - req.body:', req.body);
    next();
  },
  bannerImageValidation,
  bannerUploadController.uploadBannerImage
);

// ✅ UPDATE BANNER IMAGE  
// PUT /api/v1/upload/banner/:banner_id
// Requires: Admin/Manager role, image file
router.put('/:banner_id',
  authenticateToken,
  authorize('ADMIN', 'MANAGER'),
  upload.single('banner_image'),
  bannerUploadController.updateBannerImage
);

// ✅ DELETE BANNER IMAGE
// DELETE /api/v1/upload/banner/:banner_id
// Requires: Admin role
router.delete('/:banner_id',
  authenticateToken,
  authorize('ADMIN'),
  bannerUploadController.deleteBannerImage
);

// ✅ GET BANNER IMAGE INFO
// GET /api/v1/upload/banner/:banner_id
// Public route - không cần authentication
router.get('/:banner_id',
  bannerUploadController.getBannerImage
);

module.exports = router;