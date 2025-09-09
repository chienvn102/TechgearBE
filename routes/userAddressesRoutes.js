// routes/userAddressesRoutes.js
// Routes cho user_addresses collection 

const express = require('express');
const router = express.Router();
const UserAddressesController = require('../controllers/UserAddressesController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateRequest, validateObjectId, validatePagination } = require('../middleware/validation');
const { body, param } = require('express-validator');


// Validation rules
const createUserAddressValidation = [
  body('user_id')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('User ID must be a valid MongoDB ObjectId'),
  body('address_line_1')
    .notEmpty()
    .withMessage('Address line 1 is required')
    .isLength({ max: 255 })
    .withMessage('Address line 1 must not exceed 255 characters'),
  body('address_line_2')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Address line 2 must not exceed 255 characters'),
  body('ward')
    .notEmpty()
    .withMessage('Ward is required')
    .isLength({ max: 100 })
    .withMessage('Ward must not exceed 100 characters'),
  body('district')
    .notEmpty()
    .withMessage('District is required')
    .isLength({ max: 100 })
    .withMessage('District must not exceed 100 characters'),
  body('city')
    .notEmpty()
    .withMessage('City is required')
    .isLength({ max: 100 })
    .withMessage('City must not exceed 100 characters'),
  body('postal_code')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Postal code must not exceed 20 characters'),
  body('country')
    .notEmpty()
    .withMessage('Country is required')
    .isLength({ max: 100 })
    .withMessage('Country must not exceed 100 characters'),
  body('is_default')
    .optional()
    .isBoolean()
    .withMessage('is_default must be a boolean'),
  body('address_type')
    .optional()
    .isIn(['HOME', 'OFFICE', 'OTHER'])
    .withMessage('Address type must be HOME, OFFICE, or OTHER'),
  body('recipient_name')
    .notEmpty()
    .withMessage('Recipient name is required')
    .isLength({ max: 100 })
    .withMessage('Recipient name must not exceed 100 characters'),
  body('recipient_phone')
    .notEmpty()
    .withMessage('Recipient phone is required')
    .isMobilePhone()
    .withMessage('Recipient phone must be a valid phone number'),
  validateRequest
];

const updateUserAddressValidation = [
  body('address_line_1')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Address line 1 must not exceed 255 characters'),
  body('address_line_2')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Address line 2 must not exceed 255 characters'),
  body('ward')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Ward must not exceed 100 characters'),
  body('district')
    .optional()
    .isLength({ max: 100 })
    .withMessage('District must not exceed 100 characters'),
  body('city')
    .optional()
    .isLength({ max: 100 })
    .withMessage('City must not exceed 100 characters'),
  body('postal_code')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Postal code must not exceed 20 characters'),
  body('country')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Country must not exceed 100 characters'),
  body('is_default')
    .optional()
    .isBoolean()
    .withMessage('is_default must be a boolean'),
  body('address_type')
    .optional()
    .isIn(['HOME', 'OFFICE', 'OTHER'])
    .withMessage('Address type must be HOME, OFFICE, or OTHER'),
  body('recipient_name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Recipient name must not exceed 100 characters'),
  body('recipient_phone')
    .optional()
    .isMobilePhone()
    .withMessage('Recipient phone must be a valid phone number'),
  validateRequest
];

const userIdValidation = [
  param('userId')
    .isMongoId()
    .withMessage('User ID must be a valid MongoDB ObjectId'),
  validateRequest
];

// All routes require authentication
router.use(authenticateToken);

// Routes
router.get('/', 
  authorize('ADMIN', 'MANAGER'), 
  validatePagination, 
  UserAddressesController.getAllUserAddresses
);

router.get('/user/:userId', 
  authorize('ADMIN', 'MANAGER', 'CUSTOMER'), 
  userIdValidation,
  UserAddressesController.getUserAddresses
);

router.get('/user/:userId/default', 
  authorize('ADMIN', 'MANAGER', 'CUSTOMER'), 
  userIdValidation,
  UserAddressesController.getUserAddresses
);

router.get('/statistics', 
  authorize('ADMIN', 'MANAGER'), 
  UserAddressesController.getUserAddressStatistics
);

router.get('/:id', 
  authorize('ADMIN', 'MANAGER', 'CUSTOMER'), 
  UserAddressesController.getUserAddressById
);

router.post('/', 
  authorize('ADMIN', 'MANAGER', 'CUSTOMER'), 
  createUserAddressValidation, 
  UserAddressesController.createUserAddress
);

router.put('/:id', 
  authorize('ADMIN', 'MANAGER', 'CUSTOMER'), 
  updateUserAddressValidation, 
  UserAddressesController.updateUserAddress
);

router.put('/:id/set-default', 
  authorize('ADMIN', 'MANAGER', 'CUSTOMER'), 
  UserAddressesController.setDefaultAddress
);

router.delete('/:id', 
  authorize('ADMIN', 'MANAGER', 'CUSTOMER'), 
  UserAddressesController.deleteUserAddress
);

module.exports = router;
