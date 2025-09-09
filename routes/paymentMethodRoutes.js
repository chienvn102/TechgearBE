// routes/paymentMethodRoutes.js
// Routes cho payment_method collection 

const express = require('express');
const router = express.Router();
const PaymentMethodController = require('../controllers/PaymentMethodController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateRequest, validateObjectId, validatePagination } = require('../middleware/validation');
const { body } = require('express-validator');


// Validation rules
const createPaymentMethodValidation = [
  body('payment_method_id')
    .notEmpty()
    .withMessage('Payment method ID is required')
    .isLength({ max: 50 })
    .withMessage('Payment method ID must not exceed 50 characters'),
  body('payment_method_name')
    .notEmpty()
    .withMessage('Payment method name is required')
    .isLength({ max: 100 })
    .withMessage('Payment method name must not exceed 100 characters'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
  body('provider')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Provider must not exceed 100 characters'),
  body('payment_type')
    .notEmpty()
    .withMessage('Payment type is required')
    .isIn(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'EWALLET', 'COD'])
    .withMessage('Payment type must be one of: CASH, CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, EWALLET, COD'),
  body('transaction_fee')
    .optional()
    .isNumeric({ min: 0 })
    .withMessage('Transaction fee must be a non-negative number'),
  body('fee_type')
    .optional()
    .isIn(['FIXED', 'PERCENTAGE'])
    .withMessage('Fee type must be either FIXED or PERCENTAGE'),
  body('processing_time')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Processing time must be a non-negative integer (in minutes)'),
  body('logo_url')
    .optional()
    .isURL()
    .withMessage('Logo URL must be a valid URL'),
  validateRequest
];

const updatePaymentMethodValidation = [
  body('payment_method_name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Payment method name must not exceed 100 characters'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
  body('provider')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Provider must not exceed 100 characters'),
  body('payment_type')
    .optional()
    .isIn(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'EWALLET', 'COD'])
    .withMessage('Payment type must be one of: CASH, CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, EWALLET, COD'),
  body('transaction_fee')
    .optional()
    .isNumeric({ min: 0 })
    .withMessage('Transaction fee must be a non-negative number'),
  body('fee_type')
    .optional()
    .isIn(['FIXED', 'PERCENTAGE'])
    .withMessage('Fee type must be either FIXED or PERCENTAGE'),
  body('processing_time')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Processing time must be a non-negative integer (in minutes)'),
  body('logo_url')
    .optional()
    .isURL()
    .withMessage('Logo URL must be a valid URL'),
  validateRequest
];

// Public routes (có thể truy cập mà không cần authentication)
router.get('/active', 
  PaymentMethodController.getActivePaymentMethods
);

router.get('/type/:paymentType', 
  PaymentMethodController.getPaymentMethodsByType
);

// Protected routes (require authentication)
router.use(authenticateToken);

// Routes
router.get('/', 
  authorize('ADMIN', 'MANAGER', 'CUSTOMER'), 
  validatePagination, 
  PaymentMethodController.getAllPaymentMethods
);

router.get('/statistics', 
  authorize('ADMIN', 'MANAGER'), 
  PaymentMethodController.getPaymentMethodStatistics
);

router.get('/popular', 
  authorize('ADMIN', 'MANAGER'), 
  PaymentMethodController.getAllPaymentMethods
);

router.get('/:id', 
  authorize('ADMIN', 'MANAGER', 'CUSTOMER'), 
  PaymentMethodController.getPaymentMethodById
);

router.post('/', 
  authorize('ADMIN', 'MANAGER'), 
  createPaymentMethodValidation, 
  PaymentMethodController.createPaymentMethod
);

router.put('/:id', 
  authorize('ADMIN', 'MANAGER'), 
  updatePaymentMethodValidation, 
  PaymentMethodController.updatePaymentMethod
);

router.put('/:id/toggle-status', 
  authorize('ADMIN', 'MANAGER'), 
  PaymentMethodController.togglePaymentMethodStatus
);

router.delete('/:id', 
  authorize('ADMIN'), 
  PaymentMethodController.deletePaymentMethod
);

module.exports = router;
