// routes/analyticsRoutes.js
// Analytics & Dashboard Statistics Routes

const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/AnalyticsController');
const { authenticateToken, authorize } = require('../middleware/auth');

// ==================== ANALYTICS ROUTES ====================

// Main dashboard data (all metrics)
router.get('/dashboard', 
  authenticateToken, 
  authorize('ADMIN', 'MANAGER'), 
  AnalyticsController.getDashboardData
);

// Individual metric endpoints
router.get('/revenue', 
  authenticateToken, 
  authorize('ADMIN', 'MANAGER'), 
  AnalyticsController.getRevenueMetrics
);

// Revenue timeline with flexible filtering
router.get('/revenue/timeline', 
  authenticateToken, 
  authorize('ADMIN', 'MANAGER'), 
  AnalyticsController.getRevenueTimeline
);

router.get('/orders', 
  authenticateToken, 
  authorize('ADMIN', 'MANAGER'), 
  AnalyticsController.getOrderMetrics
);

router.get('/customers', 
  authenticateToken, 
  authorize('ADMIN', 'MANAGER'), 
  AnalyticsController.getCustomerMetrics
);

router.get('/products', 
  authenticateToken, 
  authorize('ADMIN', 'MANAGER'), 
  AnalyticsController.getProductMetrics
);

router.get('/vouchers', 
  authenticateToken, 
  authorize('ADMIN', 'MANAGER'), 
  AnalyticsController.getVoucherMetrics
);

module.exports = router;
