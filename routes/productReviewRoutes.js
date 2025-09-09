// routes/productReviewRoutes.js
// Routes cho product_review collection 

const express = require('express');
const router = express.Router();
const ProductReviewController = require('../controllers/ProductReviewController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateRequest, validateObjectId, validatePagination } = require('../middleware/validation');
const { body } = require('express-validator');

// Validation rules
const createReviewValidation = [
  body('pd_id')
    .notEmpty()
    .withMessage('Product ID is required')
    .isMongoId()
    .withMessage('Product ID must be a valid MongoDB ObjectId'),
  body('uc_id')
    .notEmpty()
    .withMessage('User customer ID is required')
    .isMongoId()
    .withMessage('User customer ID must be a valid MongoDB ObjectId'),
  body('review_rating')
    .notEmpty()
    .withMessage('Review rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Review rating must be between 1 and 5'),
  body('review_comment')
    .notEmpty()
    .withMessage('Review comment is required')
    .isLength({ min: 5, max: 1000 })
    .withMessage('Review comment must be between 5 and 1000 characters'),
  validateRequest
];

const updateReviewValidation = [
  body('review_rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Review rating must be between 1 and 5'),
  body('review_comment')
    .optional()
    .isLength({ min: 5, max: 1000 })
    .withMessage('Review comment must be between 5 and 1000 characters'),
  validateRequest
];

const idValidation = [
  validateObjectId('id')
];

// Public routes (accessible without authentication)
router.get('/', 
  validatePagination, 
  ProductReviewController.getAllReviews
);

router.get('/product/:productId', 
  validateObjectId('productId'),
  validatePagination, 
  ProductReviewController.getProductReviews
);

// Protected routes (require authentication)
router.post('/', 
  authenticateToken, 
  authorize('CUSTOMER'), 
  createReviewValidation, 
  ProductReviewController.createReview
);

router.get('/:id', 
  authenticateToken, 
  idValidation,
  ProductReviewController.getReviewById
);

router.put('/:id', 
  authenticateToken, 
  authorize('CUSTOMER', 'ADMIN'), 
  idValidation,
  updateReviewValidation, 
  ProductReviewController.updateReview
);

router.delete('/:id', 
  authenticateToken, 
  authorize('CUSTOMER', 'ADMIN'), 
  idValidation,
  ProductReviewController.deleteReview
);

module.exports = router;
