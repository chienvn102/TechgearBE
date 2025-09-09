// routes/productOrderRoutes.js
// Routes cho product_order collection 

const express = require('express');
const router = express.Router();
const ProductOrderController = require('../controllers/ProductOrderController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateRequest, validateObjectId, validatePagination } = require('../middleware/validation');
const { body } = require('express-validator');

// Validation rules
const createProductOrderValidation = [
  body('pd_id')
    .notEmpty()
    .withMessage('Product ID is required')
    .isMongoId()
    .withMessage('Product ID must be a valid MongoDB ObjectId'),
  body('po_quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('po_price')
    .notEmpty()
    .withMessage('Price is required')
    .isNumeric()
    .withMessage('Price must be a number')
    .custom((value) => {
      if (value < 0) {
        throw new Error('Price cannot be negative');
      }
      return true;
    })
];

const updateProductOrderValidation = [
  body('po_quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('po_price')
    .optional()
    .isNumeric()
    .withMessage('Price must be a number')
    .custom((value) => {
      if (value < 0) {
        throw new Error('Price cannot be negative');
      }
      return true;
    })
];

const bulkUpdateValidation = [
  body('updates')
    .isArray()
    .withMessage('Updates must be an array')
    .notEmpty()
    .withMessage('Updates array cannot be empty'),
  body('updates.*.id')
    .notEmpty()
    .withMessage('Each update must have an ID')
    .isMongoId()
    .withMessage('ID must be a valid MongoDB ObjectId')
];

const idValidation = [
  validateObjectId('id')
];

// Protected routes (require authentication)
router.use(authenticateToken);

// Routes
router.get('/', [
  authorize('admin', 'manager'),
  validatePagination
], ProductOrderController.getAllProductOrders);

router.get('/statistics', 
  authorize('admin', 'manager'), 
  ProductOrderController.getProductOrderStatistics
);

router.get('/by-product/:productId', [
  authorize('admin', 'manager'),
  validateObjectId('productId'),
  validatePagination
], ProductOrderController.getOrdersByProduct);

router.get('/:id', [
  authorize('admin', 'manager'),
  idValidation
], ProductOrderController.getProductOrderById);

router.post('/', [
  authorize('admin', 'manager'),
  createProductOrderValidation,
  validateRequest
], ProductOrderController.createProductOrder);

router.put('/bulk-update', [
  authorize('admin', 'manager'),
  bulkUpdateValidation,
  validateRequest
], ProductOrderController.bulkUpdateProductOrders);

router.put('/:id', [
  authorize('admin', 'manager'),
  idValidation,
  updateProductOrderValidation,
  validateRequest
], ProductOrderController.updateProductOrder);

router.delete('/:id', [
  authorize('admin', 'manager'),
  idValidation
], ProductOrderController.deleteProductOrder);

module.exports = router;
