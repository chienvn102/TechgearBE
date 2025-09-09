// routes/authRoutes.js
// Authentication routes 

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const AuthController = require('../controllers/AuthController');
const { validateRequest } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');
const { authRateLimit } = require('../middleware/security');

// Apply rate limiting to auth routes
router.use(authRateLimit);

// POST /api/v1/auth/login - Universal login (auto-detect admin/customer)
router.post('/login', [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  validateRequest
], AuthController.universalLogin);

// POST /api/v1/auth/admin/login - Admin login
router.post('/admin/login', [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  validateRequest
], AuthController.loginAdmin);

// POST /api/v1/auth/customer/login - Customer login
router.post('/customer/login', [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  validateRequest
], AuthController.loginCustomer);

// POST /api/v1/auth/customer/register - Customer registration
router.post('/customer/register', [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers and underscores'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('customer_data.customer_id')
    .notEmpty()
    .withMessage('Customer ID is required'),
  body('customer_data.name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name must not exceed 100 characters'),
  body('customer_data.email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('customer_data.phone_number')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[0-9]{10,11}$/)
    .withMessage('Phone number must be 10-11 digits'),
  validateRequest
], AuthController.registerCustomer);

// GET /api/v1/auth/profile - Get current user profile
router.get('/profile', authenticateToken, AuthController.getProfile);

// PUT /api/v1/auth/change-password - Change password
router.put('/change-password', [
  authenticateToken,
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),
  validateRequest
], AuthController.changePassword);

module.exports = router;
