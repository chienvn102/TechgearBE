// routes/customerAddressRoutes.js
// Routes cho customer_address collection 

const express = require('express');
const router = express.Router();
const CustomerAddressController = require('../controllers/CustomerAddressController');
const { validateRequest, validateObjectId, validatePagination } = require('../middleware/validation');
const { authenticateToken, authorize } = require('../middleware/auth');
const { body } = require('express-validator');

// Validation rules - theo README_MongoDB.md
const createAddressValidation = [
  body('customer_id')
    .isMongoId()
    .withMessage('Valid customer ID is required'),
    
  body('name')
    .notEmpty()
    .withMessage('Contact name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Contact name must be between 2 and 100 characters'),
    
  body('phone_number')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^0[1-9][0-9]{8}$/)
    .withMessage('Phone number must be a valid Vietnamese phone number (10 digits starting with 0)'),
    
  body('address')
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ min: 5, max: 500 })
    .withMessage('Address must be between 5 and 500 characters'),
    
  validateRequest
];

const updateAddressValidation = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Contact name must be between 2 and 100 characters'),
    
  body('phone_number')
    .optional()
    .matches(/^0[1-9][0-9]{8}$/)
    .withMessage('Phone number must be a valid Vietnamese phone number (10 digits starting with 0)'),
    
  body('address')
    .optional()
    .isLength({ min: 5, max: 500 })
    .withMessage('Address must be between 5 and 500 characters'),
    
  validateRequest
];

// Apply authentication to all routes
router.use(authenticateToken);

// GET /customer-addresses - Get all customer addresses
router.get('/', [
  authorize('ADMIN', 'MANAGER'),
  validatePagination
], CustomerAddressController.getAllCustomerAddresses);

// GET /customer-addresses/:id - Get customer address by ID
router.get('/:id', 
  authorize('ADMIN', 'MANAGER', 'CUSTOMER'),
  validateObjectId('id'),
  CustomerAddressController.getCustomerAddressById
);

// POST /customer-addresses - Create new customer address
router.post('/', 
  authorize('ADMIN', 'MANAGER', 'CUSTOMER'),
  createAddressValidation,
  CustomerAddressController.createCustomerAddress
);

// PUT /customer-addresses/:id - Update customer address
router.put('/:id',
  authorize('ADMIN', 'MANAGER', 'CUSTOMER'),
  validateObjectId('id'),
  updateAddressValidation,
  CustomerAddressController.updateCustomerAddress
);

// DELETE /customer-addresses/:id - Delete customer address
router.delete('/:id',
  authorize('ADMIN', 'MANAGER', 'CUSTOMER'),
  validateObjectId('id'),
  CustomerAddressController.deleteCustomerAddress
);

module.exports = router;
