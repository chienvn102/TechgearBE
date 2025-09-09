// routes/auditTrailRoutes.js
// Routes cho audit_trail collection 

const express = require('express');
const router = express.Router();
const AuditTrailController = require('../controllers/AuditTrailController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateRequest, validateObjectId, validatePagination } = require('../middleware/validation');
const { body } = require('express-validator');


// Validation rules
const createAuditTrailValidation = [
  body('user_id')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('User ID must be a valid MongoDB ObjectId'),
  body('action')
    .notEmpty()
    .withMessage('Action is required')
    .isLength({ max: 100 })
    .withMessage('Action must not exceed 100 characters'),
  body('table_name')
    .notEmpty()
    .withMessage('Table name is required')
    .isLength({ max: 100 })
    .withMessage('Table name must not exceed 100 characters'),
  body('record_id')
    .optional()
    .isString()
    .withMessage('Record ID must be a string'),
  body('old_values')
    .optional()
    .isObject()
    .withMessage('Old values must be an object'),
  body('new_values')
    .optional()
    .isObject()
    .withMessage('New values must be an object'),
  body('ip_address')
    .optional()
    .isIP()
    .withMessage('IP address must be valid'),
  body('user_agent')
    .optional()
    .isString()
    .withMessage('User agent must be a string'),
  validateRequest
];

const cleanupValidation = [
  body('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365'),
  validateRequest
];

// Apply authentication to all routes
router.use(authenticateToken);

// Routes
router.get('/', 
  authorize('ADMIN', 'MANAGER'), 
  validatePagination, 
  AuditTrailController.getAllAuditTrails
);

router.get('/statistics', 
  authorize('ADMIN'), 
  AuditTrailController.getAuditTrailStatistics
);

router.get('/user/:userId', 
  authorize('ADMIN', 'MANAGER'), 
  validatePagination, 
  AuditTrailController.getUserAuditTrails
);

router.get('/:id', 
  authorize('ADMIN', 'MANAGER'), 
  AuditTrailController.getAuditTrailById
);

router.post('/', 
  authorize('ADMIN', 'MANAGER'), 
  createAuditTrailValidation, 
  AuditTrailController.createAuditTrail
);

router.delete('/cleanup', 
  authorize('ADMIN'), 
  cleanupValidation, 
  AuditTrailController.cleanupOldTrails
);

router.delete('/:id', 
  authorize('ADMIN'), 
  AuditTrailController.deleteAuditTrail
);

module.exports = router;
