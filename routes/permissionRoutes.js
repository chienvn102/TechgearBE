// routes/permissionRoutes.js
// Routes cho permission collection 

const express = require('express');
const router = express.Router();
const PermissionController = require('../controllers/PermissionController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateRequest, validateObjectId, validatePagination } = require('../middleware/validation');
const { body } = require('express-validator');


// Validation rules
const createPermissionValidation = [
  body('permission_id')
    .notEmpty()
    .withMessage('Permission ID is required')
    .isLength({ max: 50 })
    .withMessage('Permission ID must not exceed 50 characters'),
  body('permission_name')
    .notEmpty()
    .withMessage('Permission name is required')
    .isLength({ max: 100 })
    .withMessage('Permission name must not exceed 100 characters'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('resource')
    .notEmpty()
    .withMessage('Resource is required')
    .isLength({ max: 100 })
    .withMessage('Resource must not exceed 100 characters'),
  body('action')
    .notEmpty()
    .withMessage('Action is required')
    .isIn(['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'])
    .withMessage('Action must be one of: CREATE, READ, UPDATE, DELETE, MANAGE'),
  body('category')
    .optional()
    .isIn(['USER', 'PRODUCT', 'ORDER', 'PAYMENT', 'CONTENT', 'SYSTEM'])
    .withMessage('Category must be one of: USER, PRODUCT, ORDER, PAYMENT, CONTENT, SYSTEM'),
  body('is_system')
    .optional()
    .isBoolean()
    .withMessage('is_system must be a boolean'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
  validateRequest
];

const updatePermissionValidation = [
  body('permission_name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Permission name must not exceed 100 characters'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('resource')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Resource must not exceed 100 characters'),
  body('action')
    .optional()
    .isIn(['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'])
    .withMessage('Action must be one of: CREATE, READ, UPDATE, DELETE, MANAGE'),
  body('category')
    .optional()
    .isIn(['USER', 'PRODUCT', 'ORDER', 'PAYMENT', 'CONTENT', 'SYSTEM'])
    .withMessage('Category must be one of: USER, PRODUCT, ORDER, PAYMENT, CONTENT, SYSTEM'),
  body('is_system')
    .optional()
    .isBoolean()
    .withMessage('is_system must be a boolean'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
  validateRequest
];

const bulkCreateValidation = [
  body('permissions')
    .isArray({ min: 1 })
    .withMessage('Permissions must be a non-empty array'),
  body('permissions.*.permission_id')
    .notEmpty()
    .withMessage('Permission ID is required')
    .isLength({ max: 50 })
    .withMessage('Permission ID must not exceed 50 characters'),
  body('permissions.*.permission_name')
    .notEmpty()
    .withMessage('Permission name is required')
    .isLength({ max: 100 })
    .withMessage('Permission name must not exceed 100 characters'),
  body('permissions.*.resource')
    .notEmpty()
    .withMessage('Resource is required')
    .isLength({ max: 100 })
    .withMessage('Resource must not exceed 100 characters'),
  body('permissions.*.action')
    .notEmpty()
    .withMessage('Action is required')
    .isIn(['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'])
    .withMessage('Action must be one of: CREATE, READ, UPDATE, DELETE, MANAGE'),
  validateRequest
];

// All routes require authentication and admin authorization
router.use(authenticateToken);
router.use(authorize('ADMIN'));

// Routes
router.get('/', 
  validatePagination, 
  PermissionController.getAllPermissions
);

router.get('/category/:category', 
  validatePagination,
  PermissionController.getAllPermissions
);

router.get('/resource/:resource', 
  validatePagination,
  PermissionController.getAllPermissions
);

router.get('/system', 
  validatePagination,
  PermissionController.getAllPermissions
);

router.get('/active', 
  validatePagination,
  PermissionController.getAllPermissions
);

router.get('/statistics', 
  PermissionController.getPermissionStatistics
);

router.get('/:id', 
  PermissionController.getPermissionById
);

router.post('/', 
  createPermissionValidation, 
  PermissionController.createPermission
);

router.post('/bulk-create', 
  bulkCreateValidation, 
  PermissionController.createPermission
);

router.put('/:id', 
  updatePermissionValidation, 
  PermissionController.updatePermission
);

router.put('/:id/toggle-status', 
  PermissionController.updatePermission
);

router.delete('/:id', 
  PermissionController.deletePermission
);

module.exports = router;
