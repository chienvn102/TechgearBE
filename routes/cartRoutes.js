const express = require('express');
const router = express.Router();
const CartController = require('../controllers/CartController');
const { authenticateToken } = require('../middleware/auth');

/**
 * Cart Routes
 * Base URL: /api/v1/cart
 */

// @route   GET /api/v1/cart/:customerId
// @desc    Get cart items for a customer
// @access  Private
router.get('/:customerId', authenticateToken, CartController.getCart);

// @route   POST /api/v1/cart
// @desc    Add item to cart
// @access  Private
router.post('/', authenticateToken, CartController.addToCart);

// @route   PUT /api/v1/cart
// @desc    Update cart item quantity
// @access  Private
router.put('/', authenticateToken, CartController.updateCartItem);

// @route   DELETE /api/v1/cart
// @desc    Remove item from cart
// @access  Private
router.delete('/', authenticateToken, CartController.removeFromCart);

// @route   DELETE /api/v1/cart/:customerId/clear
// @desc    Clear entire cart
// @access  Private
router.delete('/:customerId/clear', authenticateToken, CartController.clearCart);

// @route   GET /api/v1/cart/:customerId/count
// @desc    Get cart items count
// @access  Private
router.get('/:customerId/count', authenticateToken, CartController.getCartCount);

module.exports = router;
