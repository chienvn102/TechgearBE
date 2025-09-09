// routes/orderPaymentLogRoutes.js
// Routes cho order_payment_log collection 

const express = require('express');
const router = express.Router();
const OrderPaymentLogController = require('../controllers/OrderPaymentLogController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateRequest, validateObjectId, validatePagination } = require('../middleware/validation');
const { body } = require('express-validator');


// Validation rules
const createPaymentLogValidation = [
  body('order_id')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Order ID must be a valid MongoDB ObjectId'),
  body('payment_method_id')
    .notEmpty()
    .withMessage('Payment method ID is required')
    .isMongoId()
    .withMessage('Payment method ID must be a valid MongoDB ObjectId'),
  body('payment_amount')
    .notEmpty()
    .withMessage('Payment amount is required')
    .isNumeric()
    .withMessage('Payment amount must be a number')
    .isFloat({ min: 0.01 })
    .withMessage('Payment amount must be greater than 0'),
  body('payment_status')
    .notEmpty()
    .withMessage('Payment status is required')
    .isIn(['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'TIMEOUT', 'ERROR'])
    .withMessage('Payment status must be one of: PENDING, SUCCESS, FAILED, CANCELLED, TIMEOUT, ERROR'),
  body('transaction_id')
    .optional()
    .isString()
    .withMessage('Transaction ID must be a string'),
  body('gateway_response')
    .optional()
    .isObject()
    .withMessage('Gateway response must be an object'),
  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string'),
  validateRequest
];

const updatePaymentLogValidation = [
  body('payment_status')
    .optional()
    .isIn(['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'TIMEOUT', 'ERROR'])
    .withMessage('Payment status must be one of: PENDING, SUCCESS, FAILED, CANCELLED, TIMEOUT, ERROR'),
  body('transaction_id')
    .optional()
    .isString()
    .withMessage('Transaction ID must be a string'),
  body('gateway_response')
    .optional()
    .isObject()
    .withMessage('Gateway response must be an object'),
  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string'),
  validateRequest
];

// Apply authentication to all routes
router.use(authenticateToken);

// Routes
router.get('/', 
  authorize('ADMIN', 'MANAGER'), 
  validatePagination, 
  OrderPaymentLogController.getAllOrderPaymentLogs
);

router.get('/statistics', 
  authorize('ADMIN', 'MANAGER'), 
  OrderPaymentLogController.getPaymentLogStatistics
);

router.get('/failed', 
  authorize('ADMIN', 'MANAGER'), 
  validatePagination, 
  OrderPaymentLogController.getFailedPaymentLogs
);

router.get('/order/:orderId', 
  authorize('ADMIN', 'MANAGER', 'CUSTOMER'), 
  validatePagination, 
  OrderPaymentLogController.getPaymentLogsByOrder
);

router.get('/:id', 
  authorize('ADMIN', 'MANAGER', 'CUSTOMER'), 
  OrderPaymentLogController.getOrderPaymentLogById
);

router.post('/', 
  authorize('ADMIN', 'MANAGER', 'CUSTOMER'), 
  createPaymentLogValidation, 
  OrderPaymentLogController.createOrderPaymentLog
);

router.put('/:id', 
  authorize('ADMIN', 'MANAGER'), 
  updatePaymentLogValidation, 
  OrderPaymentLogController.updateOrderPaymentLog
);

router.put('/:id/retry', 
  authorize('ADMIN', 'MANAGER'), 
  OrderPaymentLogController.retryPayment
);

router.delete('/:id', 
  authorize('ADMIN'), 
  OrderPaymentLogController.deleteOrderPaymentLog
);

module.exports = router;
