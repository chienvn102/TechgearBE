// routes/bannerRoutes.js
// Routes cho banner collection 

const express = require('express');
const router = express.Router();
const BannerController = require('../controllers/BannerController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateRequest, validateObjectId, validatePagination } = require('../middleware/validation');
const { body } = require('express-validator');

// Validation rules
const createBannerValidation = [
  body('pd_id')
    .notEmpty()
    .withMessage('Product ID is required')
    .isMongoId()
    .withMessage('Product ID must be a valid MongoDB ObjectId'),
  body('banner_image_url')
    .notEmpty()
    .withMessage('Banner image URL is required')
    .custom((value) => {
      // Accept both regular URLs and data URLs
      const isRegularUrl = /^https?:\/\/.+/.test(value);
      const isDataUrl = /^data:image\/[a-zA-Z]*;base64,/.test(value);
      
      if (!isRegularUrl && !isDataUrl) {
        throw new Error('Banner image URL must be a valid URL or data URL');
      }
      return true;
    }),
  body('banner_order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Banner order must be a non-negative integer'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
  body('banner_link_url')
    .optional()
    .custom((value) => {
      if (!value || value === '') return true; // Allow empty string
      
      // Validate URL only if value is provided
      const isRegularUrl = /^https?:\/\/.+/.test(value);
      if (!isRegularUrl) {
        throw new Error('Banner link URL must be a valid URL');
      }
      return true;
    }),
  validateRequest
];

const updateBannerValidation = [
  body('banner_image_url')
    .optional()
    .custom((value) => {
      if (!value) return true; // Optional field
      
      // Accept both regular URLs and data URLs
      const isRegularUrl = /^https?:\/\/.+/.test(value);
      const isDataUrl = /^data:image\/[a-zA-Z]*;base64,/.test(value);
      
      if (!isRegularUrl && !isDataUrl) {
        throw new Error('Banner image URL must be a valid URL or data URL');
      }
      return true;
    }),
  body('banner_order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Banner order must be a non-negative integer'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
  body('banner_link_url')
    .optional()
    .custom((value) => {
      if (!value || value === '') return true; // Allow empty string
      
      // Validate URL only if value is provided
      const isRegularUrl = /^https?:\/\/.+/.test(value);
      if (!isRegularUrl) {
        throw new Error('Banner link URL must be a valid URL');
      }
      return true;
    }),
  validateRequest
];

// GET /api/v1/banners - Get all banners with pagination
router.get('/', 
  validatePagination,
  BannerController.getAllBanners
);

// GET /api/v1/banners/:id - Get banner by ID
router.get('/:id', 
  validateObjectId('id'),
  BannerController.getBannerById
);

// POST /api/v1/banners - Create new banner
router.post('/', 
  authenticateToken,
  authorize('ADMIN', 'MANAGER'),
  createBannerValidation,
  BannerController.createBanner
);

// PUT /api/v1/banners/:id - Update banner
router.put('/:id', 
  authenticateToken,
  authorize('ADMIN', 'MANAGER'),
  validateObjectId('id'),
  updateBannerValidation,
  BannerController.updateBanner
);

// DELETE /api/v1/banners/:id - Delete banner
router.delete('/:id', 
  authenticateToken,
  authorize('ADMIN'),
  validateObjectId('id'),
  BannerController.deleteBanner
);

// GET /api/v1/banners/active/list - Get all active banners
router.get('/active/list', 
  BannerController.getActiveBanners
);

module.exports = router;