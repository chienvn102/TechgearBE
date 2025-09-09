// routes/paymentStatusRoutes.js
// Routes cho payment_status collection 

const express = require('express');
const router = express.Router();
const PaymentStatusController = require('../controllers/PaymentStatusController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateRequest, validateObjectId, validatePagination } = require('../middleware/validation');
const { body } = require('express-validator');


// Validation rules
const createPaymentStatusValidation = [
  body('ps_id')
    .notEmpty()
    .withMessage('Payment status ID is required')
    .isLength({ max: 20 })
    .withMessage('Payment status ID must not exceed 20 characters'),
  body('ps_name')
    .notEmpty()
    .withMessage('Payment status name is required')
    .isLength({ max: 100 })
    .withMessage('Payment status name must not exceed 100 characters'),
  body('ps_description')
    .optional()
    .isString()
    .withMessage('Payment status description must be a string'),
  body('color_code')
    .optional()
    .isHexColor()
    .withMessage('Color code must be a valid hex color'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
  validateRequest
];

const updatePaymentStatusValidation = [
  body('ps_id')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Payment status ID must not exceed 20 characters'),
  body('ps_name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Payment status name must not exceed 100 characters'),
  body('ps_description')
    .optional()
    .isString()
    .withMessage('Payment status description must be a string'),
  body('color_code')
    .optional()
    .isHexColor()
    .withMessage('Color code must be a valid hex color'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
  validateRequest
];

// Public routes (accessible without authentication)
router.get('/active', PaymentStatusController.getActivePaymentStatuses);

// Protected routes (require authentication)
router.use(authenticateToken);

// Routes
router.get('/', 
  authorize('ADMIN', 'MANAGER'), 
  validatePagination, 
  PaymentStatusController.getAllPaymentStatuses
);

router.get('/statistics', 
  authorize('ADMIN', 'MANAGER'), 
  PaymentStatusController.getPaymentStatusStatistics
);

router.get('/:id', 
  authorize('ADMIN', 'MANAGER'), 
  PaymentStatusController.getPaymentStatusById
);

router.get('/:id/orders', 
  authorize('ADMIN', 'MANAGER'), 
  validatePagination, 
  PaymentStatusController.getPaymentStatusOrders
);

router.post('/', 
  authorize('ADMIN'), 
  createPaymentStatusValidation, 
  PaymentStatusController.createPaymentStatus
);

router.put('/:id', 
  authorize('ADMIN'), 
  updatePaymentStatusValidation, 
  PaymentStatusController.updatePaymentStatus
);

router.put('/:id/toggle-status', 
  authorize('ADMIN'), 
  PaymentStatusController.togglePaymentStatusStatus
);

router.delete('/:id', 
  authorize('ADMIN'), 
  PaymentStatusController.deletePaymentStatus
);

module.exports = router;
