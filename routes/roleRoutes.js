// routes/roleRoutes.js
// Routes cho role collection 

const express = require('express');
const router = express.Router();
const RoleController = require('../controllers/RoleController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateRequest, validateObjectId, validatePagination } = require('../middleware/validation');
const { body } = require('express-validator');

// Validation rules
const createRoleValidation = [
  body('role_id')
    .notEmpty()
    .withMessage('Role ID is required')
    .isLength({ max: 10 })
    .withMessage('Role ID must not exceed 10 characters'),
  body('role_name')
    .notEmpty()
    .withMessage('Role name is required')
    .isLength({ max: 100 })
    .withMessage('Role name must not exceed 100 characters'),
  validateRequest
];

const updateRoleValidation = [
  body('role_id')
    .optional()
    .isLength({ max: 10 })
    .withMessage('Role ID must not exceed 10 characters'),
  body('role_name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Role name must not exceed 100 characters'),
  validateRequest
];

const idValidation = [
  validateObjectId('id')
];

// Routes
router.get('/', 
  authenticateToken, 
  authorize('ADMIN'), 
  validatePagination, 
  RoleController.getAllRoles
);

router.get('/:id', 
  authenticateToken, 
  authorize('ADMIN'), 
  idValidation,
  RoleController.getRoleById
);

router.post('/', 
  authenticateToken, 
  authorize('ADMIN'), 
  createRoleValidation, 
  RoleController.createRole
);

router.put('/:id', 
  authenticateToken, 
  authorize('ADMIN'), 
  idValidation,
  updateRoleValidation, 
  RoleController.updateRole
);

router.delete('/:id', 
  authenticateToken, 
  authorize('ADMIN'), 
  idValidation,
  RoleController.deleteRole
);

module.exports = router;
