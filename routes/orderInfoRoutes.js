// routes/orderInfoRoutes.js
// Routes cho order_info collection 

const express = require('express');
const router = express.Router();
const OrderInfoController = require('../controllers/OrderInfoController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateRequest, validateObjectId, validatePagination } = require('../middleware/validation');
const { body } = require('express-validator');


// Validation rules
const createOrderInfoValidation = [
  body('order_id')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Order ID must be a valid MongoDB ObjectId'),
  body('customer_id')
    .notEmpty()
    .withMessage('Customer ID is required')
    .isMongoId()
    .withMessage('Customer ID must be a valid MongoDB ObjectId'),
  body('info_type')
    .notEmpty()
    .withMessage('Info type is required')
    .isLength({ max: 50 })
    .withMessage('Info type must not exceed 50 characters'),
  body('info_content')
    .notEmpty()
    .withMessage('Info content is required')
    .isString()
    .withMessage('Info content must be a string'),
  body('info_status')
    .optional()
    .isIn(['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'])
    .withMessage('Info status must be one of: PENDING, PROCESSING, COMPLETED, CANCELLED'),
  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string'),
  validateRequest
];

const updateOrderInfoValidation = [
  body('info_type')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Info type must not exceed 50 characters'),
  body('info_content')
    .optional()
    .isString()
    .withMessage('Info content must be a string'),
  body('info_status')
    .optional()
    .isIn(['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'])
    .withMessage('Info status must be one of: PENDING, PROCESSING, COMPLETED, CANCELLED'),
  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string'),
  validateRequest
];

const updateStatusValidation = [
  body('info_status')
    .notEmpty()
    .withMessage('Info status is required')
    .isIn(['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'])
    .withMessage('Info status must be one of: PENDING, PROCESSING, COMPLETED, CANCELLED'),
  validateRequest
];

// Apply authentication to all routes
router.use(authenticateToken);

// Routes
router.get('/', 
  authorize('ADMIN', 'MANAGER'), 
  validatePagination, 
  OrderInfoController.getAllOrderInfo
);

router.get('/statistics', 
  authorize('ADMIN', 'MANAGER'), 
  OrderInfoController.getOrderInfoStatistics
);

router.get('/order/:orderId', 
  authorize('ADMIN', 'MANAGER', 'CUSTOMER'), 
  validatePagination, 
  OrderInfoController.getOrderInfoByOrder
);

router.get('/customer/:customerId', 
  authorize('ADMIN', 'MANAGER', 'CUSTOMER'), 
  validatePagination, 
  OrderInfoController.getOrderInfoByCustomer
);

router.get('/:id', 
  authorize('ADMIN', 'MANAGER', 'CUSTOMER'), 
  OrderInfoController.getOrderInfoById
);

router.post('/', 
  authorize('ADMIN', 'MANAGER', 'CUSTOMER'), 
  createOrderInfoValidation, 
  OrderInfoController.createOrderInfo
);

router.put('/:id', 
  authorize('ADMIN', 'MANAGER'), 
  updateOrderInfoValidation, 
  OrderInfoController.updateOrderInfo
);

router.put('/:id/status', 
  authorize('ADMIN', 'MANAGER'), 
  updateStatusValidation, 
  OrderInfoController.updateOrderInfoStatus
);

router.delete('/:id', 
  authorize('ADMIN'), 
  OrderInfoController.deleteOrderInfo
);

module.exports = router;
