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
  body('banner_name')
    .notEmpty()
    .withMessage('Banner name is required')
    .isLength({ max: 255 })
    .withMessage('Banner name must not exceed 255 characters'),
  body('banner_image')
    .notEmpty()
    .withMessage('Banner image is required')
    .isURL()
    .withMessage('Banner image must be a valid URL'),
  body('banner_link')
    .optional()
    .isURL()
    .withMessage('Banner link must be a valid URL'),
  body('banner_description')
    .optional()
    .isString()
    .withMessage('Banner description must be a string'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
  body('position')
    .notEmpty()
    .withMessage('Position is required')
    .isIn(['HEADER', 'SIDEBAR', 'FOOTER', 'POPUP', 'MAIN_CAROUSEL', 'CATEGORY_TOP'])
    .withMessage('Position must be one of: HEADER, SIDEBAR, FOOTER, POPUP, MAIN_CAROUSEL, CATEGORY_TOP'),
  body('display_order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Display order must be a non-negative integer'),
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  body('end_date')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  validateRequest
];

const updateBannerValidation = [
  body('banner_name')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Banner name must not exceed 255 characters'),
  body('banner_image')
    .optional()
    .isURL()
    .withMessage('Banner image must be a valid URL'),
  body('banner_link')
    .optional()
    .isURL()
    .withMessage('Banner link must be a valid URL'),
  body('banner_description')
    .optional()
    .isString()
    .withMessage('Banner description must be a string'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
  body('position')
    .optional()
    .isIn(['HEADER', 'SIDEBAR', 'FOOTER', 'POPUP', 'MAIN_CAROUSEL', 'CATEGORY_TOP'])
    .withMessage('Position must be one of: HEADER, SIDEBAR, FOOTER, POPUP, MAIN_CAROUSEL, CATEGORY_TOP'),
  body('display_order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Display order must be a non-negative integer'),
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  body('end_date')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  validateRequest
];

const reorderBannersValidation = [
  body('banners')
    .isArray({ min: 1 })
    .withMessage('Banners must be a non-empty array'),
  body('banners.*.id')
    .notEmpty()
    .withMessage('Banner ID is required')
    .isMongoId()
    .withMessage('Banner ID must be a valid MongoDB ObjectId'),
  body('banners.*.display_order')
    .notEmpty()
    .withMessage('Display order is required')
    .isInt({ min: 0 })
    .withMessage('Display order must be a non-negative integer'),
  validateRequest
];

// Public routes (không cần authentication)
router.get('/active', 
  BannerController.getActiveBanners
);

router.get('/position/:position', 
  BannerController.getActiveBanners
);

// Protected routes (require authentication)
router.use(authenticateToken);

// Routes
router.get('/', 
  authorize('ADMIN', 'MANAGER'), 
  validatePagination, 
  BannerController.getAllBanners
);

router.get('/statistics', 
  authorize('ADMIN', 'MANAGER'), 
  BannerController.getBannerStatistics
);

router.get('/:id', 
  authorize('ADMIN', 'MANAGER'), 
  BannerController.getBannerById
);

router.post('/', 
  authorize('ADMIN', 'MANAGER'), 
  createBannerValidation, 
  BannerController.createBanner
);

router.put('/:id', 
  authorize('ADMIN', 'MANAGER'), 
  updateBannerValidation, 
  BannerController.updateBanner
);

router.put('/:id/toggle-status', 
  authorize('ADMIN', 'MANAGER'), 
  BannerController.toggleBannerStatus
);

router.put('/reorder', 
  authorize('ADMIN', 'MANAGER'), 
  reorderBannersValidation, 
  BannerController.reorderBanners
);

router.delete('/:id', 
  authorize('ADMIN', 'MANAGER'), 
  BannerController.deleteBanner
);

module.exports = router;
