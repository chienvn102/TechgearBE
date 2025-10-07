// routes/productReviewRoutes.js
// Product Review Routes với Image Upload + Purchase Verification + Admin Moderation

const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();

const ProductReviewController = require('../controllers/ProductReviewController');
const { validateRequest, validateObjectId, validatePagination } = require('../middleware/validation');
const { authenticateToken, authorize, requirePermission } = require('../middleware/auth');
const { auditLogger } = require('../middleware/auditLogger');

// ========== PUBLIC ROUTES (No Auth Required) ==========

// GET /api/v1/product-reviews - Get all reviews (public view)
router.get('/', [
  validatePagination,
  query('product_id').optional().isMongoId().withMessage('Product ID must be valid ObjectId'),
  query('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
  query('verified_only').optional().isBoolean().withMessage('Verified only must be boolean'),
  validateRequest
], ProductReviewController.getAllReviews);

// GET /api/v1/product-reviews/product/:productId - Get reviews for specific product (public)
router.get('/product/:productId', [
  validateObjectId('productId'),
  validatePagination,
  query('rating').optional().isInt({ min: 1, max: 5 }),
  query('verified_only').optional().isBoolean(),
  validateRequest
], ProductReviewController.getProductReviews);

// GET /api/v1/product-reviews/product/:productId/stats - Get review statistics for product
router.get('/product/:productId/stats', [
  validateObjectId('productId')
], ProductReviewController.getProductReviewStats);

// GET /api/v1/product-reviews/:id - Get review by ID (public)
router.get('/:id', [
  validateObjectId('id')
], ProductReviewController.getReviewById);

// ========== CUSTOMER ROUTES (Auth Required) ==========

// GET /api/v1/product-reviews/product/:productId/check-purchase - Check if customer can review
router.get('/product/:productId/check-purchase', [
  authenticateToken,
  authorize('CUSTOMER'),
  validateObjectId('productId')
], ProductReviewController.checkPurchaseVerification);

// POST /api/v1/product-reviews - Create new review (customer only)
router.post('/', [
  authenticateToken,
  authorize('CUSTOMER'),
  body('pd_id')
    .notEmpty().withMessage('Product ID is required')
    .isMongoId().withMessage('Product ID must be valid ObjectId'),
  body('order_id')
    .notEmpty().withMessage('Order ID is required for purchase verification')
    .isMongoId().withMessage('Order ID must be valid ObjectId'),
  body('rating')
    .notEmpty().withMessage('Rating is required')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('review_comment')
    .notEmpty().withMessage('Review comment is required')
    .isLength({ min: 10, max: 5000 }).withMessage('Comment must be 10-5000 characters'),
  validateRequest,
  auditLogger('CREATE')
], ProductReviewController.createReview);

// POST /api/v1/product-reviews/:id/images - Upload review images (customer only)
router.post('/:id/images', [
  authenticateToken,
  authorize('CUSTOMER'),
  validateObjectId('id'),
  auditLogger('UPDATE')
], ProductReviewController.uploadReviewImages);

// PUT /api/v1/product-reviews/:id - Update review (customer only, own review)
router.put('/:id', [
  authenticateToken,
  authorize('CUSTOMER'),
  validateObjectId('id'),
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('review_comment')
    .optional()
    .isLength({ min: 10, max: 5000 }).withMessage('Comment must be 10-5000 characters'),
  validateRequest,
  auditLogger('UPDATE')
], ProductReviewController.updateReview);

// DELETE /api/v1/product-reviews/:id - Delete own review (customer only)
router.delete('/:id', [
  authenticateToken,
  authorize('CUSTOMER'),
  validateObjectId('id'),
  auditLogger('DELETE')
], ProductReviewController.deleteReview);

// POST /api/v1/product-reviews/:id/helpful - Mark review as helpful
router.post('/:id/helpful', [
  authenticateToken,
  validateObjectId('id')
], ProductReviewController.markHelpful);

// POST /api/v1/product-reviews/:id/report - Report inappropriate review
router.post('/:id/report', [
  authenticateToken,
  validateObjectId('id'),
  body('reason')
    .notEmpty().withMessage('Report reason is required')
    .isLength({ max: 500 }).withMessage('Reason must not exceed 500 characters'),
  validateRequest
], ProductReviewController.reportReview);

// ========== ADMIN/MANAGER ROUTES ==========

// GET /api/v1/product-reviews/admin/all - Get all reviews (including hidden) for admin
router.get('/admin/all', [
  authenticateToken,
  authorize('ADMIN', 'MANAGER'),
  requirePermission('REVIEW_MGMT'),
  validatePagination,
  query('status').optional().isIn(['all', 'visible', 'hidden']).withMessage('Invalid status'),
  validateRequest
], ProductReviewController.getAllReviewsAdmin);

// PUT /api/v1/product-reviews/:id/hide - Hide/unhide review (admin only)
router.put('/:id/hide', [
  authenticateToken,
  authorize('ADMIN', 'MANAGER'),
  requirePermission('REVIEW_MGMT'),
  validateObjectId('id'),
  body('is_hidden')
    .notEmpty().withMessage('is_hidden field is required')
    .isBoolean().withMessage('is_hidden must be boolean'),
  body('reason')
    .optional()
    .isLength({ max: 500 }).withMessage('Reason must not exceed 500 characters'),
  validateRequest,
  auditLogger('UPDATE')
], ProductReviewController.hideReview);

// DELETE /api/v1/product-reviews/:id/admin - Permanently delete review (admin only)
router.delete('/:id/admin', [
  authenticateToken,
  authorize('ADMIN'),
  requirePermission('REVIEW_MGMT'),
  validateObjectId('id'),
  auditLogger('DELETE')
], ProductReviewController.deleteReviewAdmin);

// GET /api/v1/product-reviews/admin/reported - Get reported reviews
router.get('/admin/reported', [
  authenticateToken,
  authorize('ADMIN', 'MANAGER'),
  requirePermission('REVIEW_MGMT'),
  validatePagination
], ProductReviewController.getReportedReviews);

module.exports = router;
