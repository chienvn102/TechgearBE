// routes/voucherUsageRoutes.js
// Routes cho voucher_usage collection 

const express = require('express');
const router = express.Router();
const VoucherUsageController = require('../controllers/VoucherUsageController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateRequest, validateObjectId, validatePagination } = require('../middleware/validation');
const { body, param } = require('express-validator');


// Validation rules
const createVoucherUsageValidation = [
  body('voucher_id')
    .notEmpty()
    .withMessage('Voucher ID is required')
    .isMongoId()
    .withMessage('Voucher ID must be a valid MongoDB ObjectId'),
  body('customer_id')
    .notEmpty()
    .withMessage('Customer ID is required')
    .isMongoId()
    .withMessage('Customer ID must be a valid MongoDB ObjectId'),
  body('order_id')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Order ID must be a valid MongoDB ObjectId'),
  body('discount_amount')
    .notEmpty()
    .withMessage('Discount amount is required')
    .isNumeric({ min: 0 })
    .withMessage('Discount amount must be a non-negative number'),
  body('original_amount')
    .notEmpty()
    .withMessage('Original amount is required')
    .isNumeric({ min: 0 })
    .withMessage('Original amount must be a non-negative number'),
  body('final_amount')
    .notEmpty()
    .withMessage('Final amount is required')
    .isNumeric({ min: 0 })
    .withMessage('Final amount must be a non-negative number'),
  body('usage_status')
    .optional()
    .isIn(['USED', 'EXPIRED', 'REVERTED'])
    .withMessage('Usage status must be USED, EXPIRED, or REVERTED'),
  validateRequest
];

const updateVoucherUsageValidation = [
  body('discount_amount')
    .optional()
    .isNumeric({ min: 0 })
    .withMessage('Discount amount must be a non-negative number'),
  body('original_amount')
    .optional()
    .isNumeric({ min: 0 })
    .withMessage('Original amount must be a non-negative number'),
  body('final_amount')
    .optional()
    .isNumeric({ min: 0 })
    .withMessage('Final amount must be a non-negative number'),
  body('usage_status')
    .optional()
    .isIn(['USED', 'EXPIRED', 'REVERTED'])
    .withMessage('Usage status must be USED, EXPIRED, or REVERTED'),
  validateRequest
];

const voucherIdValidation = [
  param('voucherId')
    .isMongoId()
    .withMessage('Voucher ID must be a valid MongoDB ObjectId'),
  validateRequest
];

const customerIdValidation = [
  param('customerId')
    .isMongoId()
    .withMessage('Customer ID must be a valid MongoDB ObjectId'),
  validateRequest
];

const orderIdValidation = [
  param('orderId')
    .isMongoId()
    .withMessage('Order ID must be a valid MongoDB ObjectId'),
  validateRequest
];

const revertVoucherValidation = [
  body('reason')
    .notEmpty()
    .withMessage('Revert reason is required')
    .isLength({ max: 500 })
    .withMessage('Revert reason must not exceed 500 characters'),
  validateRequest
];

// All routes require authentication
router.use(authenticateToken);

// Routes
router.get('/', 
  authorize('ADMIN', 'MANAGER'), 
  validatePagination, 
  VoucherUsageController.getAllVoucherUsages
);

router.get('/voucher/:voucherId', 
  authorize('ADMIN', 'MANAGER'), 
  voucherIdValidation,
  validatePagination,
  VoucherUsageController.getUsageByVoucher
);

router.get('/customer/:customerId', 
  authorize('ADMIN', 'MANAGER', 'CUSTOMER'), 
  customerIdValidation,
  validatePagination,
  VoucherUsageController.getUsageByUser
);

router.get('/order/:orderId', 
  authorize('ADMIN', 'MANAGER', 'CUSTOMER'), 
  orderIdValidation,
  VoucherUsageController.getUsageByOrder
);

router.get('/statistics', 
  authorize('ADMIN', 'MANAGER'), 
  VoucherUsageController.getVoucherUsageStatistics
);

router.get('/statistics/voucher/:voucherId', 
  authorize('ADMIN', 'MANAGER'), 
  voucherIdValidation,
  VoucherUsageController.getVoucherUsageStatistics
);

router.get('/statistics/customer/:customerId', 
  authorize('ADMIN', 'MANAGER'), 
  customerIdValidation,
  VoucherUsageController.getVoucherUsageStatistics
);

router.get('/:id', 
  authorize('ADMIN', 'MANAGER', 'CUSTOMER'), 
  VoucherUsageController.getVoucherUsageById
);

router.post('/', 
  authorize('ADMIN', 'MANAGER', 'CUSTOMER'), 
  createVoucherUsageValidation, 
  VoucherUsageController.createVoucherUsage
);

router.put('/:id', 
  authorize('ADMIN', 'MANAGER'), 
  updateVoucherUsageValidation, 
  VoucherUsageController.createVoucherUsage
);

router.put('/:id/revert', 
  authorize('ADMIN', 'MANAGER'), 
  revertVoucherValidation, 
  VoucherUsageController.deleteVoucherUsage
);

router.delete('/:id', 
  authorize('ADMIN'), 
  VoucherUsageController.deleteVoucherUsage
);

module.exports = router;
