// routes/rankingRoutes.js
// Routes cho ranking collection 

const express = require('express');
const router = express.Router();
const RankingController = require('../controllers/RankingController');
const { validateRequest, validateObjectId, validatePagination } = require('../middleware/validation');
const { authenticateToken, authorize } = require('../middleware/auth');
const { body } = require('express-validator');

// Validation rules theo README_MongoDB.md
const createRankingValidation = [
  body('rank_id')
    .notEmpty()
    .withMessage('Rank ID is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Rank ID must be between 2 and 50 characters'),
    
  body('rank_name')
    .notEmpty()
    .withMessage('Rank name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Rank name must be between 2 and 100 characters'),
  
  body('min_spending')
    .isNumeric()
    .withMessage('Minimum spending must be a number')
    .isFloat({ min: 0 })
    .withMessage('Minimum spending cannot be negative'),
    
  body('max_spending')
    .isNumeric()
    .withMessage('Maximum spending must be a number')
    .isFloat({ min: 0 })
    .withMessage('Maximum spending cannot be negative'),
    
  body('img')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Image path cannot exceed 255 characters'),
    
  body('about')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('About text cannot exceed 1000 characters')
];

const updateRankingValidation = [
  body('rank_id')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Rank ID must be between 2 and 50 characters'),
    
  body('rank_name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Rank name must be between 2 and 100 characters'),
  
  body('min_spending')
    .optional()
    .isNumeric()
    .withMessage('Minimum spending must be a number')
    .isFloat({ min: 0 })
    .withMessage('Minimum spending cannot be negative'),
    
  body('max_spending')
    .optional()
    .isNumeric()
    .withMessage('Maximum spending must be a number')
    .isFloat({ min: 0 })
    .withMessage('Maximum spending cannot be negative'),
    
  body('img')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Image path cannot exceed 255 characters'),
    
  body('about')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('About text cannot exceed 1000 characters')
];

const idValidation = [
  validateObjectId('id')
];

// Public routes (accessible without authentication)
router.get('/', [
  validatePagination
], RankingController.getAllRankings);

router.get('/active', RankingController.getActiveRankings);

// Protected routes (require authentication)
router.use(authenticateToken);

// GET /rankings/statistics - Get ranking statistics
router.get('/statistics', 
  authorize('ADMIN', 'MANAGER'),
  RankingController.getRankingStatistics
);

// GET /rankings/:id - Get ranking by ID
router.get('/:id', 
  idValidation,
  RankingController.getRankingById
);

// GET /rankings/:id/customers - Get customers with specific ranking
router.get('/:id/customers', [
  validateObjectId('id'),
  validatePagination
], RankingController.getRankingCustomers);

// POST /rankings - Create new ranking (admin and manager)
router.post('/', 
  authorize('ADMIN', 'MANAGER'),
  createRankingValidation,
  validateRequest,
  RankingController.createRanking
);

// POST /rankings/auto-assign - Auto assign rankings to customers
router.post('/auto-assign',
  authorize('ADMIN', 'MANAGER'),
  RankingController.autoAssignRankings
);

// PUT /rankings/:id - Update ranking (admin and manager)
router.put('/:id', 
  authorize('ADMIN', 'MANAGER'),
  idValidation,
  updateRankingValidation,
  validateRequest,
  RankingController.updateRanking
);

// PUT /rankings/:id/toggle-status - Toggle ranking status
router.put('/:id/toggle-status',
  authorize('ADMIN', 'MANAGER'),
  idValidation,
  RankingController.toggleRankingStatus
);

// DELETE /rankings/:id - Delete ranking (admin only)
router.delete('/:id', 
  authorize('ADMIN'),
  idValidation,
  RankingController.deleteRanking
);

module.exports = router;
