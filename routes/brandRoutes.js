// routes/brandRoutes.js
// Routes cho brand collection 

const express = require('express');
const router = express.Router();
const BrandController = require('../controllers/BrandController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateRequest, validateObjectId, validatePagination } = require('../middleware/validation');
const { body } = require('express-validator');
const { auditLogger } = require('../middleware/auditLogger');

// Validation rules
const createBrandValidation = [
  body('br_name')
    .notEmpty()
    .withMessage('Brand name is required')
    .isLength({ max: 100 })
    .withMessage('Brand name must not exceed 100 characters'),
    
  body('br_id')
    .notEmpty()
    .withMessage('Brand ID is required')
    .isLength({ max: 50 })
    .withMessage('Brand ID must not exceed 50 characters'),
    
  body('brand_description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Brand description cannot exceed 500 characters'),
    
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean')
];

const updateBrandValidation = [
  body('br_name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Brand name must be between 1 and 100 characters'),
    
  body('br_id')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Brand ID must be between 1 and 50 characters'),
    
  body('brand_description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Brand description cannot exceed 500 characters'),
    
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean')
];

const idValidation = [
  validateObjectId('id')
];

// Public routes (accessible without authentication)
router.get('/active', BrandController.getActiveBrands);

// GET /brands - Get all brands with pagination and filtering (PUBLIC)
router.get('/', [
  validatePagination
], BrandController.getAllBrands);

// GET /brands/:id - Get brand by ID (PUBLIC)
router.get('/:id', 
  idValidation,
  BrandController.getBrandById
);

// GET /brands/:id/products - Get products by brand (PUBLIC)
router.get('/:id/products', [
  validateObjectId('id'),
  validatePagination
], BrandController.getBrandProducts);

// Protected routes (require authentication)
router.use(authenticateToken);

// GET /brands/statistics - Get brand statistics (ADMIN/MANAGER only)
router.get('/statistics', 
  authorize('ADMIN', 'MANAGER'),
  BrandController.getBrandStatistics
);

// POST /brands - Create new brand
router.post('/', 
  authorize('ADMIN', 'MANAGER'),
  auditLogger('CREATE'),
  createBrandValidation,
  validateRequest,
  BrandController.createBrand
);

// PUT /brands/:id - Update brand
router.put('/:id', 
  authorize('ADMIN', 'MANAGER'),
  auditLogger('UPDATE'),
  idValidation,
  updateBrandValidation,
  validateRequest,
  BrandController.updateBrand
);

// DELETE /brands/:id - Delete brand
router.delete('/:id', 
  authorize('ADMIN'),
  auditLogger('DELETE'),
  idValidation,
  BrandController.deleteBrand
);

module.exports = router;
