// routes/playerRoutes.js
// Routes cho player collection 

const express = require('express');
const router = express.Router();
const PlayerController = require('../controllers/PlayerController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateRequest, validateObjectId, validatePagination } = require('../middleware/validation');
const { body } = require('express-validator');
const { auditLogger } = require('../middleware/auditLogger');


// Validation rules
const createPlayerValidation = [
  body('player_name')
    .notEmpty()
    .withMessage('Player name is required')
    .isLength({ max: 100 })
    .withMessage('Player name must not exceed 100 characters'),
  body('player_position')
    .notEmpty()
    .withMessage('Player position is required')
    .isLength({ max: 50 })
    .withMessage('Player position must not exceed 50 characters'),
  body('player_team')
    .notEmpty()
    .withMessage('Player team is required')
    .isLength({ max: 100 })
    .withMessage('Player team must not exceed 100 characters'),
  body('player_content')
    .optional()
    .isString()
    .withMessage('Player content must be a string'),
  body('player_image')
    .optional()
    .isString()
    .withMessage('Player image must be a string'),
  body('achievements')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Achievements must not exceed 500 characters'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
  validateRequest
];

const updatePlayerValidation = [
  body('player_name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Player name must not exceed 100 characters'),
  body('player_position')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Player position must not exceed 50 characters'),
  body('player_team')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Player team must not exceed 100 characters'),
  body('player_content')
    .optional()
    .isString()
    .withMessage('Player content must be a string'),
  body('player_image')
    .optional()
    .isString()
    .withMessage('Player image must be a string'),
  body('achievements')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Achievements must not exceed 500 characters'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
  validateRequest
];

// Public routes (accessible without authentication)
router.get('/', 
  validatePagination, 
  PlayerController.getAllPlayers
);

router.get('/active', 
  validatePagination, 
  PlayerController.getActivePlayers
);

router.get('/by-team/:team', 
  validatePagination, 
  PlayerController.getPlayersByTeam
);

router.get('/:id/products', 
  validatePagination, 
  PlayerController.getPlayerProducts
);

// Protected routes (require authentication)
router.use(authenticateToken);

router.get('/statistics', 
  authorize('ADMIN', 'MANAGER'), 
  PlayerController.getPlayerStatistics
);

router.get('/:id', 
  PlayerController.getPlayerById
);

router.post('/', 
  auditLogger('CREATE'),
  authorize('ADMIN', 'MANAGER'), 
  createPlayerValidation, 
  PlayerController.createPlayer
);

router.put('/:id', 
  auditLogger('UPDATE'),
  authorize('ADMIN', 'MANAGER'), 
  updatePlayerValidation, 
  PlayerController.updatePlayer
);

router.put('/:id/toggle-status', 
  auditLogger('UPDATE'),
  authorize('ADMIN', 'MANAGER'), 
  PlayerController.togglePlayerStatus
);

router.delete('/:id', 
  auditLogger('DELETE'),
  authorize('ADMIN'), 
  PlayerController.deletePlayer
);

module.exports = router;
