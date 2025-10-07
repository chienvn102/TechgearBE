// routes/categoryRoutes.js
// Routes cho category collection 

const express = require('express');
const router = express.Router();
const CategoryController = require('../controllers/CategoryController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateRequest, validateObjectId, validatePagination } = require('../middleware/validation');
const { body } = require('express-validator');
const { auditLogger } = require('../middleware/auditLogger');


// Validation rules
const createCategoryValidation = [
  body('cg_id')
    .notEmpty()
    .withMessage('Category ID is required')
    .isString()
    .withMessage('Category ID must be a string'),
  body('cg_name')
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ max: 100 })
    .withMessage('Category name must not exceed 100 characters'),
  body('category_description')
    .optional()
    .isString()
    .withMessage('Category description must be a string'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
  validateRequest
];

const updateCategoryValidation = [
  body('cg_id')
    .optional()
    .isString()
    .withMessage('Category ID must be a string'),
  body('cg_name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Category name must not exceed 100 characters'),
  body('category_description')
    .optional()
    .isString()
    .withMessage('Category description must be a string'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
  validateRequest
];

// Routes
router.get('/', 
  validatePagination, 
  CategoryController.getAllCategories
);

router.get('/statistics', 
  authenticateToken, 
  authorize('ADMIN', 'MANAGER'), 
  CategoryController.getCategoryStatistics
);

router.get('/:id', 
  validateObjectId('id'),
  CategoryController.getCategoryById
);

router.post('/', 
  auditLogger('CREATE'),
  authenticateToken, 
  authorize('ADMIN', 'MANAGER'), 
  createCategoryValidation, 
  CategoryController.createCategory
);

router.put('/:id', 
  validateObjectId('id'),
  authenticateToken, 
  authorize('ADMIN', 'MANAGER'), 
  updateCategoryValidation, 
  CategoryController.updateCategory
);

router.delete('/:id', 
  validateObjectId('id'),
  authenticateToken, 
  authorize('ADMIN'), 
  CategoryController.deleteCategory
);

// Category products
router.get('/:id/products', 
  validateObjectId('id'),
  validatePagination, 
  CategoryController.getCategoryProducts
);

module.exports = router;
