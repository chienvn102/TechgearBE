// routes/orderRoutes.js
// Order routes 

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

// Sử dụng phiên bản mới sửa lỗi cho controller
const OrderController = require('../controllers/OrderController');
const { validateRequest, validateObjectId, validatePagination } = require('../middleware/validation');
const { authenticateToken, authorize, requirePermission } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// GET /api/v1/orders/my-orders - Get orders for the logged in customer
// Thêm route /my-orders trước route /:id để tránh xung đột
router.get('/my-orders', [
  validatePagination
], OrderController.getMyOrders);

// GET /api/v1/orders - Get all orders (Admin only)
router.get('/', [
  authorize('ADMIN'),
  validatePagination
], OrderController.getAllOrders);

// GET /api/v1/orders/:id - Get order by ID
router.get('/:id', [
  validateObjectId('id')
], OrderController.getOrderById);

// GET /api/v1/orders/customer/:customerId - Get orders by customer
router.get('/customer/:customerId', [
  validateObjectId('customerId'),
  validatePagination
], OrderController.getOrdersByCustomer);

// POST /api/v1/orders - Create new order
router.post('/', [
  body('od_id')
    .notEmpty()
    .withMessage('Order ID is required')
    .isLength({ max: 50 })
    .withMessage('Order ID must not exceed 50 characters'),
  body('po_id')
    .notEmpty()
    .withMessage('Product order ID is required')
    .isMongoId()
    .withMessage('Product order ID must be a valid ObjectId'),
  body('customer_id')
    .notEmpty()
    .withMessage('Customer ID is required')
    .isMongoId()
    .withMessage('Customer ID must be a valid ObjectId'),
  body('customer_name')
    .notEmpty()
    .withMessage('Customer name is required')
    .isLength({ max: 100 })
    .withMessage('Customer name must not exceed 100 characters'),
  body('shipping_address')
    .notEmpty()
    .withMessage('Shipping address is required')
    .isLength({ max: 500 })
    .withMessage('Shipping address must not exceed 500 characters'),
  body('pm_id')
    .notEmpty()
    .withMessage('Payment method ID is required')
    .isMongoId()
    .withMessage('Payment method ID must be a valid ObjectId'),
  body('order_note')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Order note must not exceed 500 characters'),
  body('voucher_id')
    .optional()
    .isMongoId()
    .withMessage('Voucher ID must be a valid ObjectId'),
  body('payment_status_id')
    .notEmpty()
    .withMessage('Payment status ID is required')
    .isMongoId()
    .withMessage('Payment status ID must be a valid ObjectId'),
  body('order_total')
    .notEmpty()
    .withMessage('Order total is required')
    .isNumeric()
    .withMessage('Order total must be a number')
    .custom(value => {
      if (value < 0) {
        throw new Error('Order total must be non-negative');
      }
      return true;
    }),
  validateRequest
], OrderController.createOrder);

// PUT /api/v1/orders/:id - Update order (Admin only)
router.put('/:id', [
  authorize('ADMIN'),
  requirePermission('ORDER_MGMT'),
  validateObjectId('id'),
  body('od_id')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Order ID must not exceed 50 characters'),
  body('po_id')
    .optional()
    .isMongoId()
    .withMessage('Product order ID must be a valid ObjectId'),
  body('customer_id')
    .optional()
    .isMongoId()
    .withMessage('Customer ID must be a valid ObjectId'),
  body('customer_name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Customer name must not exceed 100 characters'),
  body('shipping_address')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Shipping address must not exceed 500 characters'),
  body('pm_id')
    .optional()
    .isMongoId()
    .withMessage('Payment method ID must be a valid ObjectId'),
  body('order_note')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Order note must not exceed 500 characters'),
  body('voucher_id')
    .optional()
    .isMongoId()
    .withMessage('Voucher ID must be a valid ObjectId'),
  body('payment_status_id')
    .optional()
    .isMongoId()
    .withMessage('Payment status ID must be a valid ObjectId'),
  body('order_total')
    .optional()
    .isNumeric()
    .withMessage('Order total must be a number')
    .custom(value => {
      if (value < 0) {
        throw new Error('Order total must be non-negative');
      }
      return true;
    }),
  validateRequest
], OrderController.updateOrder);

// PUT /api/v1/orders/:id/status - Update order status
router.put('/:id/status', [
  authorize('ADMIN'),
  requirePermission('ORDER_MGMT'),
  validateObjectId('id'),
  body('of_state')
    .notEmpty()
    .withMessage('Order state is required')
    .isIn(['ORDER_SUCCESS', 'TRANSFER_TO_SHIPPING', 'SHIPPING', 'DELIVERED', 'CANCELLED'])
    .withMessage('Order state must be one of: ORDER_SUCCESS, TRANSFER_TO_SHIPPING, SHIPPING, DELIVERED, CANCELLED'),
  validateRequest
], OrderController.updateOrderStatus);

// DELETE /api/v1/orders/:id - Delete order (Admin only)
router.delete('/:id', [
  authorize('ADMIN'),
  requirePermission('ORDER_MGMT'),
  validateObjectId('id')
], OrderController.deleteOrder);

module.exports = router;
