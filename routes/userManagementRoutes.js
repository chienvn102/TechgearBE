// routes/userManagementRoutes.js
// User management routes 

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const UserManagementController = require('../controllers/UserManagementController');
const { validateRequest, validateObjectId, validatePagination } = require('../middleware/validation');
const { authenticateToken, authorize, requirePermission } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// GET /api/v1/user-management - Get all users (Admin only)
router.get('/', [
  authorize('ADMIN'),
  validatePagination
], UserManagementController.getAllUsers);

// GET /api/v1/user-management/:id - Get user by ID
router.get('/:id', [
  authorize('ADMIN'),
  validateObjectId('id')
], UserManagementController.getUserById);

// POST /api/v1/user-management - Create new user (Admin only)
router.post('/', [
  authorize('ADMIN'),
  requirePermission('USER_MGMT'),
  body('id')
    .notEmpty()
    .withMessage('User ID is required')
    .isLength({ max: 50 })
    .withMessage('User ID must not exceed 50 characters'),
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
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name must not exceed 100 characters'),
  body('role_id')
    .notEmpty()
    .withMessage('Role ID is required')
    .isMongoId()
    .withMessage('Role ID must be a valid ObjectId'),
  validateRequest
], UserManagementController.createUser);

// PUT /api/v1/user-management/:id - Update user (Admin only)
router.put('/:id', [
  authorize('ADMIN'),
  requirePermission('USER_MGMT'),
  validateObjectId('id'),
  body('id')
    .optional()
    .isLength({ max: 50 })
    .withMessage('User ID must not exceed 50 characters'),
  body('username')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers and underscores'),
  body('name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Name must not exceed 100 characters'),
  body('role_id')
    .optional()
    .isMongoId()
    .withMessage('Role ID must be a valid ObjectId'),
  validateRequest
], UserManagementController.updateUser);

// DELETE /api/v1/user-management/:id - Delete user (Admin only)
router.delete('/:id', [
  authorize('ADMIN'),
  requirePermission('USER_MGMT'),
  validateObjectId('id')
], UserManagementController.deleteUser);

// GET /api/v1/user-management/by-role/:roleId - Get users by role
router.get('/by-role/:roleId', [
  authorize('ADMIN'),
  validateObjectId('roleId'),
  validatePagination
], UserManagementController.getUsersByRole);

module.exports = router;
