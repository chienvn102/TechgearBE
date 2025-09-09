// routes/customerRankingRoutes.js
// Routes cho customer_ranking collection 

const express = require('express');
const router = express.Router();
const CustomerRankingController = require('../controllers/CustomerRankingController');
const { validateRequest, validateObjectId, validatePagination } = require('../middleware/validation');
const { authenticateToken, authorize } = require('../middleware/auth');
const { body } = require('express-validator');

// Validation rules theo README_MongoDB.md
const createCustomerRankingValidation = [
  body('customer_id')
    .notEmpty()
    .withMessage('Customer ID is required')
    .isMongoId()
    .withMessage('Customer ID must be a valid ObjectId'),
    
  body('rank_id')
    .notEmpty()
    .withMessage('Rank ID is required')
    .isMongoId()
    .withMessage('Rank ID must be a valid ObjectId')
];

const updateCustomerRankingValidation = [
  body('customer_id')
    .optional()
    .isMongoId()
    .withMessage('Customer ID must be a valid ObjectId'),
    
  body('rank_id')
    .optional()
    .isMongoId()
    .withMessage('Rank ID must be a valid ObjectId')
];

// Public routes (không cần authentication để test)
// GET /customer-rankings/public - Get all customer rankings công khai
router.get('/public', 
  validatePagination,
  CustomerRankingController.getAllCustomerRankings
);

// Apply authentication and authorization to protected routes
router.use(authenticateToken);
router.use(authorize(['ADMIN', 'MANAGER']));

// Routes với đầy đủ middleware validation

// GET /customer-rankings - Get all customer rankings với pagination
router.get('/', 
  validatePagination,
  CustomerRankingController.getAllCustomerRankings
);

// GET /customer-rankings/statistics - Get customer ranking statistics
router.get('/statistics', 
  CustomerRankingController.getCustomerRankingStatistics
);

// GET /customer-rankings/customer/:customerId - Get rankings by customer
router.get('/customer/:customerId',
  validateObjectId('customerId'),
  CustomerRankingController.getRankingsByCustomer
);

// GET /customer-rankings/:id - Get customer ranking by ID
router.get('/:id',
  validateObjectId('id'),
  CustomerRankingController.getCustomerRankingById
);

// POST /customer-rankings - Create new customer ranking
router.post('/',
  createCustomerRankingValidation,
  validateRequest,
  CustomerRankingController.createCustomerRanking
);

// PUT /customer-rankings/:id - Update customer ranking
router.put('/:id',
  validateObjectId('id'),
  updateCustomerRankingValidation,
  validateRequest,
  CustomerRankingController.updateCustomerRanking
);

// DELETE /customer-rankings/:id - Delete customer ranking
router.delete('/:id',
  validateObjectId('id'),
  CustomerRankingController.deleteCustomerRanking
);

// PUT /customer-rankings/auto-assign - Auto assign rankings based on spending
router.put('/auto-assign',
  CustomerRankingController.autoAssignRankings
);

module.exports = router;
