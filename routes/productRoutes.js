// routes/productRoutes.js
// Product routes 

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const ProductController = require('../controllers/ProductController');
const { validateRequest, validateObjectId, validatePagination } = require('../middleware/validation');
const { authenticateToken, authorize, requirePermission } = require('../middleware/auth');

// GET /api/v1/products - Get all products (Public access with pagination)
router.get('/', [
  validatePagination
], ProductController.getAllProducts);

// GET /api/v1/products/:id - Get product by ID (Public access)
router.get('/:id', [
  validateObjectId('id')
], ProductController.getProductById);

// GET /api/v1/products/:id/images - Get product images (Public access)
router.get('/:id/images', [
  validateObjectId('id')
], ProductController.getProductImages);

// GET /api/v1/products/by-color/:color - Get products by color (Public access)
router.get('/by-color/:color', [
  validatePagination
], ProductController.getProductsByColor);

// GET /api/v1/products/by-player/:playerId - Get products by player (Public access)
router.get('/by-player/:playerId', [
  validateObjectId('playerId'),
  validatePagination
], ProductController.getProductsByPlayer);

// Protected routes - require authentication
router.use(authenticateToken);

// POST /api/v1/products - Create new product (Admin only)
router.post('/', [
  authorize('ADMIN'),
  requirePermission('PRODUCT_MGMT'),
  body('pd_id')
    .notEmpty()
    .withMessage('Product ID is required')
    .isLength({ max: 50 })
    .withMessage('Product ID must not exceed 50 characters'),
  body('pd_name')
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ max: 200 })
    .withMessage('Product name must not exceed 200 characters'),
  body('pd_price')
    .notEmpty()
    .withMessage('Product price is required')
    .isNumeric()
    .withMessage('Product price must be a number')
    .custom(value => {
      if (value < 0) {
        throw new Error('Product price must be non-negative');
      }
      return true;
    }),
  body('pd_quantity')
    .notEmpty()
    .withMessage('Product quantity is required')
    .isInt({ min: 0 })
    .withMessage('Product quantity must be a non-negative integer'),
  body('pd_note')
    .optional()
    .isString()
    .withMessage('Product note must be a string'),
  body('br_id')
    .notEmpty()
    .withMessage('Brand ID is required')
    .isMongoId()
    .withMessage('Brand ID must be a valid ObjectId'),
  body('pdt_id')
    .notEmpty()
    .withMessage('Product type ID is required')
    .isMongoId()
    .withMessage('Product type ID must be a valid ObjectId'),
  body('category_id')
    .notEmpty()
    .withMessage('Category ID is required')
    .isMongoId()
    .withMessage('Category ID must be a valid ObjectId'),
  body('player_id')
    .optional()
    .isMongoId()
    .withMessage('Player ID must be a valid ObjectId'),
  body('product_description')
    .optional()
    .isString()
    .withMessage('Product description must be a string'),
  body('stock_quantity')
    .notEmpty()
    .withMessage('Stock quantity is required')
    .isInt({ min: 0 })
    .withMessage('Stock quantity must be a non-negative integer'),
  body('is_available')
    .optional()
    .isBoolean()
    .withMessage('Is available must be a boolean'),
  body('color')
    .notEmpty()
    .withMessage('Color is required')
    .isLength({ max: 50 })
    .withMessage('Color must not exceed 50 characters'),
  body('sku')
    .notEmpty()
    .withMessage('SKU is required')
    .isLength({ max: 100 })
    .withMessage('SKU must not exceed 100 characters')
    .matches(/^[A-Z0-9_-]+$/)
    .withMessage('SKU can only contain uppercase letters, numbers, underscores and hyphens'),
  validateRequest
], ProductController.createProduct);

// PUT /api/v1/products/:id - Update product (Admin only)
router.put('/:id', [
  authorize('ADMIN'),
  requirePermission('PRODUCT_MGMT'),
  validateObjectId('id'),
  body('pd_id')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Product ID must not exceed 50 characters'),
  body('pd_name')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Product name must not exceed 200 characters'),
  body('pd_price')
    .optional()
    .isNumeric()
    .withMessage('Product price must be a number')
    .custom(value => {
      if (value < 0) {
        throw new Error('Product price must be non-negative');
      }
      return true;
    }),
  body('pd_quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Product quantity must be a non-negative integer'),
  body('pd_note')
    .optional()
    .isString()
    .withMessage('Product note must be a string'),
  body('br_id')
    .optional()
    .isMongoId()
    .withMessage('Brand ID must be a valid ObjectId'),
  body('pdt_id')
    .optional()
    .isMongoId()
    .withMessage('Product type ID must be a valid ObjectId'),
  body('category_id')
    .optional()
    .isMongoId()
    .withMessage('Category ID must be a valid ObjectId'),
  body('player_id')
    .optional()
    .isMongoId()
    .withMessage('Player ID must be a valid ObjectId'),
  body('product_description')
    .optional()
    .isString()
    .withMessage('Product description must be a string'),
  body('stock_quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock quantity must be a non-negative integer'),
  body('is_available')
    .optional()
    .isBoolean()
    .withMessage('Is available must be a boolean'),
  body('color')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Color must not exceed 50 characters'),
  body('sku')
    .optional()
    .isLength({ max: 100 })
    .withMessage('SKU must not exceed 100 characters')
    .matches(/^[A-Z0-9_-]+$/)
    .withMessage('SKU can only contain uppercase letters, numbers, underscores and hyphens'),
  validateRequest
], ProductController.updateProduct);

// DELETE /api/v1/products/:id - Delete product (Admin only)
router.delete('/:id', [
  authorize('ADMIN'),
  requirePermission('PRODUCT_MGMT'),
  validateObjectId('id')
], ProductController.deleteProduct);

module.exports = router;
