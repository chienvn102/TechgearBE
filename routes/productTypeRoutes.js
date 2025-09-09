// routes/productTypeRoutes.js
// Routes cho product_type collection 

const express = require('express');
const router = express.Router();
const ProductTypeController = require('../controllers/ProductTypeController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateRequest, validateObjectId, validatePagination } = require('../middleware/validation');
const { body } = require('express-validator');

// Validation rules
const createProductTypeValidation = [
  body('pdt_id')
    .notEmpty()
    .withMessage('Product type ID is required')
    .isLength({ max: 50 })
    .withMessage('Product type ID must not exceed 50 characters'),
    
  body('pdt_name')
    .notEmpty()
    .withMessage('Product type name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Product type name must be between 2 and 100 characters'),
    
  body('pdt_note')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Product type note cannot exceed 500 characters'),
    
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean')
];

const updateProductTypeValidation = [
  body('pdt_name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Product type name must be between 2 and 100 characters'),
    
  body('pdt_note')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Product type note cannot exceed 500 characters'),
    
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean')
];

const idValidation = [
  validateObjectId('id')
];

// Public routes (accessible without authentication for product viewing)
router.get('/active', ProductTypeController.getActiveProductTypes);

router.get('/', [
  validatePagination
], ProductTypeController.getAllProductTypes);

router.get('/:id', 
  idValidation,
  ProductTypeController.getProductTypeById
);

// Protected routes (require authentication)
router.get('/statistics', 
  authenticateToken,
  authorize('ADMIN', 'MANAGER'), 
  ProductTypeController.getProductTypeStatistics
);

router.get('/:id/products', [
  authenticateToken,
  validateObjectId('id'),
  validatePagination
], ProductTypeController.getProductTypeProducts);

router.post('/', 
  authenticateToken,
  authorize('ADMIN', 'MANAGER'), 
  createProductTypeValidation,
  validateRequest, 
  ProductTypeController.createProductType
);

router.put('/:id', 
  authenticateToken,
  authorize('ADMIN', 'MANAGER'), 
  idValidation,
  updateProductTypeValidation,
  validateRequest, 
  ProductTypeController.updateProductType
);

router.put('/:id/toggle-status', 
  authenticateToken,
  authorize('ADMIN', 'MANAGER'), 
  idValidation,
  ProductTypeController.toggleProductTypeStatus
);

router.delete('/:id', 
  authenticateToken,
  authorize('ADMIN', 'MANAGER'), 
  idValidation,
  ProductTypeController.deleteProductType
);

module.exports = router;
