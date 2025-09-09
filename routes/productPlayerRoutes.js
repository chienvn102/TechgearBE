// routes/productPlayerRoutes.js
// Routes cho product_player collection 

const express = require('express');
const router = express.Router();
const ProductPlayerController = require('../controllers/ProductPlayerController');
const { validateRequest, validateObjectId, validatePagination } = require('../middleware/validation');
const { authenticateToken, authorize } = require('../middleware/auth');
const { body } = require('express-validator');

// Validation rules theo README_MongoDB.md
const createProductPlayerValidation = [
  body('product_id')
    .notEmpty()
    .withMessage('Product ID is required')
    .isMongoId()
    .withMessage('Product ID must be a valid ObjectId'),
    
  body('player_id')
    .notEmpty()
    .withMessage('Player ID is required')
    .isMongoId()
    .withMessage('Player ID must be a valid ObjectId'),
    
  body('is_primary')
    .optional()
    .isBoolean()
    .withMessage('is_primary must be a boolean'),
    
  body('display_order')
    .optional()
    .isNumeric()
    .withMessage('Display order must be a number')
    .isInt({ min: 1 })
    .withMessage('Display order must be at least 1')
];

const updateProductPlayerValidation = [
  body('is_primary')
    .optional()
    .isBoolean()
    .withMessage('is_primary must be a boolean'),
    
  body('display_order')
    .optional()
    .isNumeric()
    .withMessage('Display order must be a number')
    .isInt({ min: 1 })
    .withMessage('Display order must be at least 1')
];

const idValidation = [
  validateObjectId('id')
];

const productIdValidation = [
  validateObjectId('productId')
];

const playerIdValidation = [
  validateObjectId('playerId')
];

// Public routes (accessible without authentication)
router.get('/public', 
  validatePagination,
  ProductPlayerController.getAllProductPlayers
);

router.get('/product/:productId/public', 
  productIdValidation,
  validatePagination,
  ProductPlayerController.getPlayersByProduct
);

router.get('/player/:playerId/public', 
  playerIdValidation,
  validatePagination,
  ProductPlayerController.getProductsByPlayer
);

// Protected routes (require authentication)
router.use(authenticateToken);

// GET /product-players - Get all product-player relationships với pagination
router.get('/', 
  validatePagination,
  ProductPlayerController.getAllProductPlayers
);

// GET /product-players/statistics - Get relationship statistics
router.get('/statistics', 
  authorize('ADMIN', 'MANAGER'),
  ProductPlayerController.getProductPlayerStatistics
);

// GET /product-players/:id - Get product-player relationship by ID
router.get('/:id', 
  idValidation,
  ProductPlayerController.getProductPlayerById
);

// GET /product-players/product/:productId - Get all players for a product
router.get('/product/:productId',
  productIdValidation,
  validatePagination,
  ProductPlayerController.getPlayersByProduct
);

// GET /product-players/player/:playerId - Get all products for a player
router.get('/player/:playerId',
  playerIdValidation,
  validatePagination,
  ProductPlayerController.getProductsByPlayer
);

// POST /product-players - Create new product-player relationship (admin and manager)
router.post('/', 
  authorize('ADMIN', 'MANAGER'),
  createProductPlayerValidation,
  validateRequest,
  ProductPlayerController.createProductPlayer
);

// PUT /product-players/:id - Update product-player relationship (admin and manager)
router.put('/:id', 
  authorize('ADMIN', 'MANAGER'),
  idValidation,
  updateProductPlayerValidation,
  validateRequest,
  ProductPlayerController.updateProductPlayer
);

// PUT /product-players/set-primary/:productId/:playerId - Set primary player for product
router.put('/set-primary/:productId/:playerId',
  authorize('ADMIN', 'MANAGER'),
  [
    validateObjectId('productId'),
    validateObjectId('playerId')
  ],
  ProductPlayerController.setPrimaryPlayer
);

// DELETE /product-players/:id - Delete product-player relationship (admin only)
router.delete('/:id', 
  authorize('ADMIN'),
  idValidation,
  ProductPlayerController.deleteProductPlayer
);

module.exports = router;
