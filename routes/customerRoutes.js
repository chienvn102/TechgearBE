// routes/customerRoutes.js
// Routes cho customer collection 

const express = require('express');
const router = express.Router();
const CustomerController = require('../controllers/CustomerController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateRequest, validateObjectId, validatePagination } = require('../middleware/validation');
const { body } = require('express-validator');


// Validation rules
const createCustomerValidation = [
  body('customer_id')
    .notEmpty()
    .withMessage('Customer ID is required')
    .isLength({ max: 20 })
    .withMessage('Customer ID must not exceed 20 characters'),
  body('name')
    .notEmpty()
    .withMessage('Customer name is required')
    .isLength({ max: 100 })
    .withMessage('Customer name must not exceed 100 characters'),
  body('phone_number')
    .notEmpty()
    .withMessage('Customer phone is required')
    .isMobilePhone('vi-VN')
    .withMessage('Customer phone must be a valid Vietnamese phone number'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Customer email must be a valid email address'),
  validateRequest
];

const updateCustomerValidation = [
  body('name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Customer name must not exceed 100 characters'),
  body('phone_number')
    .optional()
    .isMobilePhone('vi-VN')
    .withMessage('Customer phone must be a valid Vietnamese phone number'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Customer email must be a valid email address'),
  validateRequest
];

const updateRankingValidation = [
  body('ranking_id')
    .notEmpty()
    .withMessage('Ranking ID is required')
    .isMongoId()
    .withMessage('Ranking ID must be a valid MongoDB ObjectId'),
  validateRequest
];

// Routes
router.get('/', 
  authenticateToken, 
  authorize('ADMIN', 'MANAGER'), 
  validatePagination, 
  CustomerController.getAllCustomers
);

router.get('/statistics', 
  authenticateToken, 
  authorize('ADMIN', 'MANAGER'), 
  CustomerController.getCustomerStatistics
);

// Customer specific routes - MUST come before /:id routes to avoid conflicts
// GET /api/v1/customers/addresses - Get current customer addresses
router.get('/addresses', 
  authenticateToken, 
  authorize('CUSTOMER'), 
  CustomerController.getCurrentCustomerAddresses
);

router.get('/:id', 
  authenticateToken, 
  authorize('ADMIN', 'MANAGER', 'CUSTOMER'), 
  CustomerController.getCustomerById
);

router.post('/', 
  authenticateToken, 
  authorize('ADMIN', 'MANAGER'), 
  createCustomerValidation, 
  CustomerController.createCustomer
);

router.put('/:id', 
  authenticateToken, 
  authorize('CUSTOMER', 'ADMIN', 'MANAGER'), 
  updateCustomerValidation, 
  CustomerController.updateCustomer
);

router.delete('/:id', 
  authenticateToken, 
  authorize('ADMIN'), 
  CustomerController.deleteCustomer
);

// Customer specific routes (moved above to avoid conflicts)

router.get('/:id/addresses', 
  authenticateToken, 
  authorize('CUSTOMER', 'ADMIN', 'MANAGER'), 
  CustomerController.getCustomerAddresses
);

// POST /api/v1/customers/addresses - Create current customer address
router.post('/addresses', 
  authenticateToken, 
  authorize('CUSTOMER'), 
  [
    body('name')
      .notEmpty()
      .withMessage('Address name is required')
      .isLength({ max: 100 })
      .withMessage('Address name must not exceed 100 characters'),
    body('phone_number')
      .notEmpty()
      .withMessage('Phone number is required')
      .isMobilePhone('vi-VN')
      .withMessage('Phone number must be a valid Vietnamese phone number'),
    body('address')
      .notEmpty()
      .withMessage('Address is required')
      .isLength({ max: 500 })
      .withMessage('Address must not exceed 500 characters'),
    validateRequest
  ],
  CustomerController.createCurrentCustomerAddress
);

router.post('/:id/addresses', 
  authenticateToken, 
  authorize('CUSTOMER', 'ADMIN', 'MANAGER'), 
  [
    body('name')
      .notEmpty()
      .withMessage('Address name is required')
      .isLength({ max: 100 })
      .withMessage('Address name must not exceed 100 characters'),
    body('phone_number')
      .notEmpty()
      .withMessage('Phone number is required')
      .isMobilePhone('vi-VN')
      .withMessage('Phone number must be a valid Vietnamese phone number'),
    body('address')
      .notEmpty()
      .withMessage('Address is required')
      .isLength({ max: 500 })
      .withMessage('Address must not exceed 500 characters'),
    validateRequest
  ],
  CustomerController.createCustomerAddress
);

// PUT /api/v1/customers/addresses/:addressId - Update current customer address
router.put('/addresses/:addressId', 
  authenticateToken, 
  authorize('CUSTOMER'), 
  [
    body('name')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Address name must not exceed 100 characters'),
    body('phone_number')
      .optional()
      .isMobilePhone('vi-VN')
      .withMessage('Phone number must be a valid Vietnamese phone number'),
    body('address')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Address must not exceed 500 characters'),
    validateRequest
  ],
  CustomerController.updateCurrentCustomerAddress
);

// DELETE /api/v1/customers/addresses/:addressId - Delete current customer address
router.delete('/addresses/:addressId', 
  authenticateToken, 
  authorize('CUSTOMER'), 
  CustomerController.deleteCurrentCustomerAddress
);

// PUT /api/v1/customers/addresses/:addressId/set-default - Set default address
router.put('/addresses/:addressId/set-default', 
  authenticateToken, 
  authorize('CUSTOMER'), 
  CustomerController.setDefaultAddress
);

router.put('/:id/addresses/:addressId', 
  authenticateToken, 
  authorize('CUSTOMER', 'ADMIN', 'MANAGER'), 
  [
    body('name')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Address name must not exceed 100 characters'),
    body('phone_number')
      .optional()
      .isMobilePhone('vi-VN')
      .withMessage('Phone number must be a valid Vietnamese phone number'),
    body('address')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Address must not exceed 500 characters'),
    validateRequest
  ],
  CustomerController.updateCustomerAddress
);

router.delete('/:id/addresses/:addressId', 
  authenticateToken, 
  authorize('CUSTOMER', 'ADMIN', 'MANAGER'), 
  CustomerController.deleteCustomerAddress
);

router.get('/:id/orders', 
  authenticateToken, 
  authorize('CUSTOMER', 'ADMIN', 'MANAGER'), 
  validatePagination, 
  CustomerController.getCustomerOrders
);

router.put('/:id/ranking', 
  authenticateToken, 
  authorize('ADMIN', 'MANAGER'), 
  updateRankingValidation, 
  CustomerController.updateCustomerRanking
);

module.exports = router;
