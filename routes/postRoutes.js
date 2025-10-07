// routes/postRoutes.js
// Routes cho post collection 

const express = require('express');
const router = express.Router();
const PostController = require('../controllers/PostController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateRequest, validateObjectId, validatePagination } = require('../middleware/validation');
const { body, param, query } = require('express-validator');
const { auditLogger } = require('../middleware/auditLogger');

// Validation rules
const createPostValidation = [
  body('post_id')
    .notEmpty()
    .withMessage('post_id is required')
    .isLength({ max: 50 })
    .withMessage('post_id must not exceed 50 characters'),
  body('post_title')
    .notEmpty()
    .withMessage('post_title is required')
    .isLength({ max: 500 })
    .withMessage('post_title must not exceed 500 characters'),
  body('post_content')
    .notEmpty()
    .withMessage('post_content is required'),
  body('post_img')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('post_img must be a valid URL'),
  validateRequest
];

const updatePostValidation = [
  body('post_id')
    .optional()
    .isLength({ max: 50 })
    .withMessage('post_id must not exceed 50 characters'),
  body('post_title')
    .optional()
    .isLength({ max: 500 })
    .withMessage('post_title must not exceed 500 characters'),
  body('post_content')
    .optional()
    .notEmpty()
    .withMessage('post_content cannot be empty'),
  body('post_img')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('post_img must be a valid URL'),
  validateRequest
];

const searchValidation = [
  query('q')
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Search query must be between 1 and 200 characters'),
  query('title_only')
    .optional()
    .isBoolean()
    .withMessage('title_only must be a boolean value'),
  validateRequest
];

// Public routes (accessible without authentication)
router.get('/', 
  validatePagination, 
  PostController.getAllPosts
);

router.get('/search', 
  validatePagination,
  searchValidation,
  PostController.searchPosts
);

router.get('/by-post-id/:post_id', 
  param('post_id').notEmpty().withMessage('post_id is required'),
  validateRequest,
  PostController.getPostByPostId
);

router.get('/:id', 
  validateObjectId,
  PostController.getPostById
);

// Protected routes (require authentication and authorization)
router.post('/', 
  auditLogger('CREATE'),
  authenticateToken,
  authorize('ADMIN', 'MANAGER'),
  createPostValidation,
  PostController.createPost
);

router.put('/by-post-id/:post_id', 
  auditLogger('UPDATE'),
  authenticateToken,
  authorize('ADMIN', 'MANAGER'),
  param('post_id').notEmpty().withMessage('post_id is required'),
  updatePostValidation,
  PostController.updatePostByPostId
);

router.put('/:id', 
  auditLogger('UPDATE'),
  authenticateToken,
  authorize('ADMIN', 'MANAGER'),
  validateObjectId,
  updatePostValidation,
  PostController.updatePost
);

router.delete('/by-post-id/:post_id', 
  auditLogger('DELETE'),
  authenticateToken,
  authorize('ADMIN', 'MANAGER'),
  param('post_id').notEmpty().withMessage('post_id is required'),
  validateRequest,
  PostController.deletePostByPostId
);

router.delete('/:id', 
  auditLogger('DELETE'),
  authenticateToken,
  authorize('ADMIN', 'MANAGER'),
  validateObjectId,
  PostController.deletePost
);

module.exports = router;
