const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/PaymentController');
const { authenticateToken } = require('../middleware/auth');

/**
 * Payment Routes - PayOS Integration
 * Base URL: /api/v1/payments
 */

/**
 * @route   POST /api/v1/payments/payos/create
 * @desc    Create PayOS payment link
 * @access  Customer only
 */
router.post('/payos/create', authenticateToken, PaymentController.createPayment);

/**
 * @route   POST /api/v1/payments/payos/webhook
 * @desc    PayOS webhook handler
 * @access  Public (signature verified)
 */
router.post('/payos/webhook', PaymentController.handleWebhook);

/**
 * @route   GET /api/v1/payments/payos/verify/:orderCode
 * @desc    Verify payment status manually (for localhost without webhook)
 * @access  Public (for admin panel and customer verification)
 */
router.get('/payos/verify/:orderCode', PaymentController.verifyPayment);

/**
 * @route   POST /api/v1/payments/payos/cancel/:orderCode
 * @desc    Cancel payment
 * @access  Customer only
 */
router.post('/payos/cancel/:orderCode', authenticateToken, PaymentController.cancelPayment);

/**
 * @route   GET /api/v1/payments/transactions
 * @desc    Get customer's transaction history
 * @access  Customer only
 */
router.get('/transactions', authenticateToken, PaymentController.getTransactions);

/**
 * @route   GET /api/v1/payments/transactions/:transactionId
 * @desc    Get transaction details
 * @access  Customer only
 */
router.get('/transactions/:transactionId', authenticateToken, PaymentController.getTransactionDetails);

/**
 * @route   GET /api/v1/payments/unpaid-orders
 * @desc    Get customer's unpaid PayOS orders for notifications
 * @access  Customer only
 */
router.get('/unpaid-orders', authenticateToken, PaymentController.getUnpaidPayOSOrders);

module.exports = router;
