// routes/voucherRoutes.js
// Routes cho voucher collection 

const express = require('express');
const router = express.Router();
const VoucherController = require('../controllers/VoucherController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateRequest, validateObjectId, validatePagination } = require('../middleware/validation');
const { body } = require('express-validator');


// Validation rules
const createVoucherValidation = [
  body('voucher_code')
    .notEmpty()
    .withMessage('Voucher code is required')
    .isLength({ max: 20 })
    .withMessage('Voucher code must not exceed 20 characters'),
  body('voucher_name')
    .notEmpty()
    .withMessage('Voucher name is required')
    .isString()
    .withMessage('Voucher name must be a string'),
  body('discount_percent')
    .optional()
    .isNumeric()
    .withMessage('Discount percent must be a number')
    .custom((value) => {
      if (value !== undefined && (value < 0 || value > 100)) {
        throw new Error('Discount percent must be between 0 and 100');
      }
      return true;
    }),
  body('discount_amount')
    .optional()
    .isNumeric()
    .withMessage('Discount amount must be a number')
    .custom((value) => {
      if (value !== undefined && value < 0) {
        throw new Error('Discount amount must be positive');
      }
      return true;
    }),
  body('max_discount_amount')
    .optional()
    .isNumeric()
    .withMessage('Max discount amount must be a number'),
  body('min_order_value')
    .optional()
    .isNumeric()
    .withMessage('Min order value must be a number'),
  body('max_uses')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max uses must be a positive integer'),
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('end_date')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  body('ranking_id')
    .optional()
    .isMongoId()
    .withMessage('Ranking ID must be a valid MongoDB ObjectId'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
  validateRequest
];

const updateVoucherValidation = [
  body('voucher_code')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Voucher code must not exceed 20 characters'),
  body('voucher_name')
    .optional()
    .isString()
    .withMessage('Voucher name must be a string'),
  body('discount_percent')
    .optional()
    .isNumeric()
    .withMessage('Discount percent must be a number')
    .custom((value) => {
      if (value !== undefined && (value < 0 || value > 100)) {
        throw new Error('Discount percent must be between 0 and 100');
      }
      return true;
    }),
  body('discount_amount')
    .optional()
    .isNumeric()
    .withMessage('Discount amount must be a number')
    .custom((value) => {
      if (value !== undefined && value < 0) {
        throw new Error('Discount amount must be positive');
      }
      return true;
    }),
  body('max_discount_amount')
    .optional()
    .isNumeric()
    .withMessage('Max discount amount must be a number'),
  body('min_order_value')
    .optional()
    .isNumeric()
    .withMessage('Min order value must be a number'),
  body('max_uses')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max uses must be a positive integer'),
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('end_date')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  body('ranking_id')
    .optional()
    .isMongoId()
    .withMessage('Ranking ID must be a valid MongoDB ObjectId'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
  validateRequest
];

const validateVoucherValidation = [
  body('voucher_code')
    .notEmpty()
    .withMessage('Voucher code is required'),
  body('order_amount')
    .notEmpty()
    .withMessage('Order amount is required')
    .isNumeric()
    .withMessage('Order amount must be a number'),
  body('uc_id')
    .optional()
    .isMongoId()
    .withMessage('User Customer ID must be a valid MongoDB ObjectId'),
  validateRequest
];

const applyVoucherValidation = [
  body('voucher_id')
    .notEmpty()
    .withMessage('Voucher ID is required')
    .isMongoId()
    .withMessage('Voucher ID must be a valid MongoDB ObjectId'),
  body('uc_id')
    .notEmpty()
    .withMessage('User Customer ID is required')
    .isMongoId()
    .withMessage('User Customer ID must be a valid MongoDB ObjectId'),
  body('order_id')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Order ID must be a valid MongoDB ObjectId'),
  body('discount_amount')
    .notEmpty()
    .withMessage('Discount amount is required')
    .isNumeric()
    .withMessage('Discount amount must be a number'),
  validateRequest
];

// Routes
router.get('/', 
  authenticateToken, 
  authorize('ADMIN', 'MANAGER'), 
  validatePagination, 
  VoucherController.getAllVouchers
);

router.get('/active', 
  validatePagination, 
  VoucherController.getActiveVouchers
);

// GET /api/v1/vouchers/available - Get available vouchers for customer
router.get('/available', 
  authenticateToken,
  validatePagination, 
  VoucherController.getAvailableVouchers
);

// GET /api/v1/vouchers/search - Search voucher by code
router.get('/search', 
  authenticateToken,
  VoucherController.searchVoucherByCode
);

router.get('/:id', 
  authenticateToken, 
  VoucherController.getVoucherById
);

router.post('/', 
  authenticateToken, 
  authorize('ADMIN', 'MANAGER'), 
  createVoucherValidation, 
  VoucherController.createVoucher
);

router.put('/:id', 
  authenticateToken, 
  authorize('ADMIN', 'MANAGER'), 
  updateVoucherValidation, 
  VoucherController.updateVoucher
);

router.delete('/:id', 
  authenticateToken, 
  authorize('ADMIN', 'MANAGER'), 
  VoucherController.deleteVoucher
);

// Voucher operations
router.post('/validate', 
  validateVoucherValidation, 
  VoucherController.validateVoucher
);

router.post('/apply', 
  authenticateToken, 
  authorize('CUSTOMER', 'ADMIN', 'MANAGER'), 
  applyVoucherValidation, 
  VoucherController.applyVoucher
);

router.get('/:id/usage', 
  authenticateToken, 
  authorize('ADMIN', 'MANAGER'), 
  validatePagination, 
  VoucherController.getVoucherUsage
);

module.exports = router;
