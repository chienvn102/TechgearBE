// routes/productImageRoutes.js
// Routes cho product_image collection 

const express = require('express');
const router = express.Router();
const ProductImageController = require('../controllers/ProductImageController');
const { validateRequest, validateObjectId, validatePagination } = require('../middleware/validation');
const { authenticateToken, authorize } = require('../middleware/auth');
const { body } = require('express-validator');

// Validation rules theo đúng MongoDB schema (pd_id, img, color)
const createImageValidation = [
  body('pd_id')
    .isMongoId()
    .withMessage('Valid product ID is required'),
    
  body('img')
    .notEmpty()
    .withMessage('Image filename is required')
    .isLength({ max: 255 })
    .withMessage('Image filename cannot exceed 255 characters'),
    
  body('color')
    .notEmpty()
    .withMessage('Color is required')
    .isLength({ max: 50 })
    .withMessage('Color cannot exceed 50 characters')
];

const updateImageValidation = [
  body('img')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Image filename cannot exceed 255 characters'),
    
  body('color')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Color cannot exceed 50 characters')
];

const bulkCreateValidation = [
  body('pd_id')
    .isMongoId()
    .withMessage('Valid product ID is required'),
    
  body('images')
    .isArray()
    .withMessage('Images must be an array')
    .notEmpty()
    .withMessage('Images array cannot be empty'),
    
  body('images.*.image_url')
    .notEmpty()
    .withMessage('Image URL is required for all images')
];

const reorderValidation = [
  body('pd_id')
    .isMongoId()
    .withMessage('Valid product ID is required'),
    
  body('image_orders')
    .isArray()
    .withMessage('Image orders must be an array')
    .notEmpty()
    .withMessage('Image orders array cannot be empty'),
    
  body('image_orders.*.image_id')
    .isMongoId()
    .withMessage('Valid image ID is required'),
    
  body('image_orders.*.sort_order')
    .isInt({ min: 0 })
    .withMessage('Sort order must be a positive integer')
];

const idValidation = [
  validateObjectId('id')
];

const productIdValidation = [
  validateObjectId('productId')
];

// Public routes (accessible without authentication for product viewing)
router.get('/products/:productId/images', [
  validateObjectId('productId')
], ProductImageController.getProductImages);

router.get('/products/:productId/images/primary',
  productIdValidation,
  ProductImageController.getProductPrimaryImage
);

// GET /product-images/statistics - Get product image statistics (PUBLIC)
router.get('/statistics', 
  ProductImageController.getProductImageStatistics
);

// GET /product-images/:id - Get product image by ID (PUBLIC)
router.get('/:id', 
  idValidation,
  ProductImageController.getProductImageById
);

// GET /product-images - Get all product images with pagination and filtering (PUBLIC)
router.get('/', [
  validatePagination
], ProductImageController.getAllProductImages);

// POST /product-images/bulk-create - Create multiple images for a product
router.post('/bulk-create',
  authenticateToken,
  authorize('ADMIN', 'MANAGER', 'STAFF'),
  bulkCreateValidation,
  validateRequest,
  ProductImageController.bulkCreateImages
);

// PUT /product-images/reorder - Reorder product images
router.put('/reorder',
  authenticateToken,
  authorize('ADMIN', 'MANAGER', 'STAFF'),
  reorderValidation,
  validateRequest,
  ProductImageController.reorderProductImages
);

// POST /product-images - Create new product image
router.post('/', 
  authenticateToken,
  authorize('ADMIN', 'MANAGER', 'STAFF'),
  createImageValidation,
  validateRequest,
  ProductImageController.createProductImage
);

// PUT /product-images/:id - Update product image
router.put('/:id', 
  authenticateToken,
  authorize('ADMIN', 'MANAGER', 'STAFF'),
  idValidation,
  updateImageValidation,
  validateRequest,
  ProductImageController.updateProductImage
);

// PUT /product-images/:id/set-primary - Set image as primary
router.put('/:id/set-primary',
  authenticateToken,
  authorize('ADMIN', 'MANAGER', 'STAFF'),
  idValidation,
  ProductImageController.setAsPrimary
);

// DELETE /product-images/:id - Delete product image
router.delete('/:id', 
  authenticateToken,
  authorize('ADMIN', 'MANAGER'),
  idValidation,
  ProductImageController.deleteProductImage
);

module.exports = router;
