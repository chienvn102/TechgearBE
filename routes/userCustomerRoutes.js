// routes/userCustomerRoutes.js
// Routes cho user_customer collection 

const express = require('express');
const router = express.Router();
const UserCustomerController = require('../controllers/UserCustomerController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateRequest, validatePagination } = require('../middleware/validation');
const { body, param } = require('express-validator');

// Validation rules
const updateUserCustomerValidation = [
  body('new_username')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters'),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('customer_info.name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Name must not exceed 100 characters'),
  body('customer_info.email')
    .optional()
    .isEmail()
    .withMessage('Email must be valid'),
  body('customer_info.phone_number')
    .optional()
    .isMobilePhone('vi-VN')
    .withMessage('Phone number must be valid Vietnamese phone number'),
  validateRequest
];

const updatePasswordValidation = [
  body('current_password')
    .notEmpty()
    .withMessage('Current password is required'),
  body('new_password')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),
  validateRequest
];

const adminResetPasswordValidation = [
  body('new_password')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
    .notEmpty()
    .withMessage('New password is required'),
  validateRequest
];

// Protected routes (require authentication and admin/manager authorization)
router.get('/', 
  authenticateToken,
  authorize('ADMIN', 'MANAGER'),
  validatePagination, 
  UserCustomerController.getAllUserCustomers
);

router.get('/:username', 
  authenticateToken,
  authorize('ADMIN', 'MANAGER'),
  param('username').notEmpty().withMessage('Username is required'),
  validateRequest,
  UserCustomerController.getUserCustomerByUsername
);

router.put('/:username', 
  authenticateToken,
  authorize('ADMIN', 'MANAGER'),
  param('username').notEmpty().withMessage('Username is required'),
  updateUserCustomerValidation,
  UserCustomerController.updateUserCustomer
);

router.put('/:username/password', 
  authenticateToken,
  authorize('ADMIN', 'MANAGER'),
  param('username').notEmpty().withMessage('Username is required'),
  updatePasswordValidation,
  UserCustomerController.updatePassword
);

router.put('/:username/admin-reset-password', 
  authenticateToken,
  authorize('ADMIN', 'MANAGER'),
  param('username').notEmpty().withMessage('Username is required'),
  adminResetPasswordValidation,
  UserCustomerController.adminResetPassword
);

module.exports = router;
