// routes/notificationRoutes.js
// Routes cho notification collection 

const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/NotificationController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateRequest, validateObjectId, validatePagination } = require('../middleware/validation');
const { body } = require('express-validator');


// Validation rules
const createNotificationValidation = [
  body('uc_id')
    .notEmpty()
    .withMessage('User Customer ID is required')
    .isMongoId()
    .withMessage('User Customer ID must be a valid MongoDB ObjectId'),
  body('noti_type')
    .notEmpty()
    .withMessage('Notification type is required')
    .isIn(['order', 'promotion', 'system', 'payment', 'shipping'])
    .withMessage('Invalid notification type'),
  body('noti_content')
    .notEmpty()
    .withMessage('Notification content is required')
    .isString()
    .withMessage('Notification content must be a string'),
  validateRequest
];

const updateNotificationValidation = [
  body('noti_type')
    .optional()
    .isIn(['order', 'promotion', 'system', 'payment', 'shipping'])
    .withMessage('Invalid notification type'),
  body('noti_content')
    .optional()
    .isString()
    .withMessage('Notification content must be a string'),
  body('is_read')
    .optional()
    .isBoolean()
    .withMessage('is_read must be a boolean'),
  validateRequest
];

const broadcastNotificationValidation = [
  body('noti_type')
    .notEmpty()
    .withMessage('Notification type is required')
    .isIn(['order', 'promotion', 'system', 'payment', 'shipping'])
    .withMessage('Invalid notification type'),
  body('noti_content')
    .notEmpty()
    .withMessage('Notification content is required')
    .isString()
    .withMessage('Notification content must be a string'),
  body('user_ids')
    .optional()
    .isArray()
    .withMessage('User IDs must be an array'),
  body('exclude_user_ids')
    .optional()
    .isArray()
    .withMessage('Exclude user IDs must be an array'),
  validateRequest
];

// Routes
router.get('/', 
  authenticateToken, 
  authorize('ADMIN', 'MANAGER'), 
  validatePagination, 
  NotificationController.getAllNotifications
);

// TEMP: Comment out stats route until method is implemented
// router.get('/stats', 
//   authenticateToken, 
//   authorize('ADMIN', 'MANAGER'), 
//   NotificationController.getNotificationStats
// );

router.get('/:id', 
  authenticateToken, 
  NotificationController.getNotificationById
);

router.post('/', 
  authenticateToken, 
  authorize('ADMIN', 'MANAGER'), 
  createNotificationValidation, 
  NotificationController.createNotification
);

router.put('/:id', 
  authenticateToken, 
  authorize('ADMIN', 'MANAGER', 'CUSTOMER'), 
  updateNotificationValidation, 
  NotificationController.updateNotification
);

router.delete('/:id', 
  authenticateToken, 
  authorize('ADMIN', 'MANAGER'), 
  NotificationController.deleteNotification
);

// TEMP: Comment out missing methods until they are implemented
// router.post('/mark-read/:id', 
//   authenticateToken, 
//   authorize('CUSTOMER'), 
//   NotificationController.markAsRead
// );

// router.post('/mark-all-read/:userId', 
//   authenticateToken, 
//   authorize('CUSTOMER'), 
//   NotificationController.markAllAsRead
// );

// router.post('/broadcast', 
//   authenticateToken, 
//   authorize('ADMIN', 'MANAGER'), 
//   broadcastNotificationValidation, 
//   NotificationController.broadcastNotification
// );

module.exports = router;
