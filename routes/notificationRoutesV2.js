// routes/notificationRoutesV2.js
// Enhanced notification routes với notification system features

const express = require('express');
const router = express.Router();
const NotificationControllerV2 = require('../controllers/NotificationControllerV2');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validation');

// ==================== ADMIN ROUTES ====================

// GET /api/v1/notifications/admin/all - Get all notifications (Admin only)
router.get('/admin/all',
  authenticateToken,
  authorize('ADMIN'),
  validatePagination,
  NotificationControllerV2.getAllNotifications
);

// POST /api/v1/notifications/admin/send - Send notification to customers (Admin/Manager)
router.post('/admin/send',
  authenticateToken,
  authorize('ADMIN', 'MANAGER'),
  NotificationControllerV2.sendNotification
);

// GET /api/v1/notifications/admin/statistics - Get statistics (Admin)
router.get('/admin/statistics',
  authenticateToken,
  authorize('ADMIN', 'MANAGER'),
  NotificationControllerV2.getStatistics
);

// DELETE /api/v1/notifications/:id - Delete notification (Admin only)
router.delete('/:id',
  authenticateToken,
  authorize('ADMIN'),
  NotificationControllerV2.deleteNotification
);

// ==================== CUSTOMER ROUTES ====================

// GET /api/v1/notifications/unread-count - Get unread count (Customer)
router.get('/unread-count',
  authenticateToken,
  NotificationControllerV2.getUnreadCount
);

// GET /api/v1/notifications/my-notifications - Get my notifications (Customer)
router.get('/my-notifications',
  authenticateToken,
  validatePagination,
  NotificationControllerV2.getMyNotifications
);

// PUT /api/v1/notifications/mark-all-read - Mark all as read (Customer)
router.put('/mark-all-read',
  authenticateToken,
  NotificationControllerV2.markAllAsRead
);

// GET /api/v1/notifications/:id - Get notification by ID (Customer/Admin)
router.get('/:id',
  authenticateToken,
  NotificationControllerV2.getNotificationById
);

// PUT /api/v1/notifications/:id/mark-read - Mark as read (Customer)
router.put('/:id/mark-read',
  authenticateToken,
  NotificationControllerV2.markAsRead
);

module.exports = router;
