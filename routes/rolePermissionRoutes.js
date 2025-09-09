// routes/rolePermissionRoutes.js
// Routes cho role_permission collection 

const express = require('express');
const router = express.Router();
const RolePermissionController = require('../controllers/RolePermissionController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateRequest, validateObjectId, validatePagination } = require('../middleware/validation');
const { body, param } = require('express-validator');


// Validation rules
const createRolePermissionValidation = [
  body('role_id')
    .notEmpty()
    .withMessage('Role ID is required')
    .isMongoId()
    .withMessage('Role ID must be a valid MongoDB ObjectId'),
  body('permission_id')
    .notEmpty()
    .withMessage('Permission ID is required')
    .isMongoId()
    .withMessage('Permission ID must be a valid MongoDB ObjectId'),
  body('can_create')
    .optional()
    .isBoolean()
    .withMessage('can_create must be a boolean'),
  body('can_read')
    .optional()
    .isBoolean()
    .withMessage('can_read must be a boolean'),
  body('can_update')
    .optional()
    .isBoolean()
    .withMessage('can_update must be a boolean'),
  body('can_delete')
    .optional()
    .isBoolean()
    .withMessage('can_delete must be a boolean'),
  validateRequest
];

const updateRolePermissionValidation = [
  body('can_create')
    .optional()
    .isBoolean()
    .withMessage('can_create must be a boolean'),
  body('can_read')
    .optional()
    .isBoolean()
    .withMessage('can_read must be a boolean'),
  body('can_update')
    .optional()
    .isBoolean()
    .withMessage('can_update must be a boolean'),
  body('can_delete')
    .optional()
    .isBoolean()
    .withMessage('can_delete must be a boolean'),
  validateRequest
];

const roleIdValidation = [
  param('roleId')
    .isMongoId()
    .withMessage('Role ID must be a valid MongoDB ObjectId'),
  validateRequest
];

const bulkAssignValidation = [
  body('role_id')
    .notEmpty()
    .withMessage('Role ID is required')
    .isMongoId()
    .withMessage('Role ID must be a valid MongoDB ObjectId'),
  body('permissions')
    .isArray({ min: 1 })
    .withMessage('Permissions must be a non-empty array'),
  body('permissions.*.permission_id')
    .notEmpty()
    .withMessage('Permission ID is required')
    .isMongoId()
    .withMessage('Permission ID must be a valid MongoDB ObjectId'),
  body('permissions.*.can_create')
    .optional()
    .isBoolean()
    .withMessage('can_create must be a boolean'),
  body('permissions.*.can_read')
    .optional()
    .isBoolean()
    .withMessage('can_read must be a boolean'),
  body('permissions.*.can_update')
    .optional()
    .isBoolean()
    .withMessage('can_update must be a boolean'),
  body('permissions.*.can_delete')
    .optional()
    .isBoolean()
    .withMessage('can_delete must be a boolean'),
  validateRequest
];

// All routes require authentication and admin authorization
router.use(authenticateToken);
router.use(authorize('ADMIN'));

// Routes
router.get('/', 
  validatePagination, 
  RolePermissionController.getAllRolePermissions
);

router.get('/role/:roleId', 
  roleIdValidation,
  RolePermissionController.getPermissionsByRole
);

router.get('/role/:roleId/matrix', 
  roleIdValidation,
  RolePermissionController.getRolePermissionStatistics
);

router.get('/available/:roleId', 
  roleIdValidation,
  RolePermissionController.getPermissionsByRole
);

router.get('/statistics', 
  RolePermissionController.getRolePermissionStatistics
);

router.get('/:id', 
  RolePermissionController.getRolePermissionById
);

router.post('/', 
  createRolePermissionValidation, 
  RolePermissionController.createRolePermission
);

router.post('/bulk-assign', 
  bulkAssignValidation, 
  RolePermissionController.bulkAssignPermissions
);

router.put('/:id', 
  updateRolePermissionValidation, 
  RolePermissionController.createRolePermission
);

router.put('/role/:roleId/revoke-all', 
  roleIdValidation,
  RolePermissionController.bulkRemovePermissions
);

router.delete('/:id', 
  RolePermissionController.deleteRolePermission
);

module.exports = router;
