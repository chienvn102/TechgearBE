// routes/orderRoutes.js
// Order routes 

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

// Sử dụng phiên bản mới sửa lỗi cho controller
const OrderController = require('../controllers/OrderController');
const { validateRequest, validateObjectId, validatePagination } = require('../middleware/validation');
const { authenticateToken, authorize, requirePermission } = require('../middleware/auth');
const { auditLogger } = require('../middleware/auditLogger');

// Apply authentication to all routes except checkout and validate-voucher (guest checkout allowed)
router.use((req, res, next) => {
  console.log(`🔐 OrderRoutes middleware: ${req.method} ${req.path}`);
  
  // Skip authentication for validate-voucher and order details (for order success page)
  // Keep authentication for checkout to track voucher usage properly
  if ((req.path === '/validate-voucher' && req.method === 'POST') ||
      (req.path.match(/^\/[a-zA-Z0-9_-]+$/) && req.method === 'GET')) {
    console.log('🔐 Skipping authentication for route:', req.path);
    return next();
  }
  
  console.log('🔐 Applying authentication for route:', req.path);
  // Apply authentication for all other routes
  return authenticateToken(req, res, next);
});

// GET /api/v1/orders/my-orders - Get orders for the logged in customer
// Thêm route /my-orders trước route /:id để tránh xung đột
router.get('/my-orders', [
  authenticateToken,
  authorize('CUSTOMER'),
  validatePagination
], OrderController.getMyOrders);

// GET /api/v1/orders - Get all orders (Admin only)
router.get('/', [
  authorize('ADMIN'),
  validatePagination
], OrderController.getAllOrders);

// GET /api/v1/orders/:id - Get order by ID (can be ObjectId or SKU)
router.get('/:id', [
  // Remove validateObjectId to allow both ObjectId and SKU strings
], OrderController.getOrderById);

// GET /api/v1/orders/customer/:customerId - Get orders by customer
router.get('/customer/:customerId', [
  validateObjectId('customerId'),
  validatePagination
], OrderController.getOrdersByCustomer);

// POST /api/v1/orders/validate-voucher - Validate voucher code
router.post('/validate-voucher', [
  body('voucher_code')
    .notEmpty()
    .withMessage('Voucher code is required')
    .isLength({ max: 50 })
    .withMessage('Voucher code must not exceed 50 characters'),
  body('customer_id')
    .optional()
    .isMongoId()
    .withMessage('Customer ID must be a valid ObjectId'),
  body('order_total')
    .optional()
    .isNumeric()
    .withMessage('Order total must be a number'),
  validateRequest
], OrderController.validateVoucher);

// POST /api/v1/orders/checkout - Create order from cart (multiple products)
router.post('/checkout', [
  body('customer_name')
    .notEmpty()
    .withMessage('Customer name is required')
    .isLength({ max: 100 })
    .withMessage('Customer name must not exceed 100 characters'),
  body('phone_number')
    .notEmpty()
    .withMessage('Phone number is required')
    .isLength({ max: 20 })
    .withMessage('Phone number must not exceed 20 characters'),
  body('email')
    .optional()
    .custom((value) => {
      if (value && value.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          throw new Error('Email must be valid');
        }
      }
      return true;
    }),
  body('shipping_address')
    .notEmpty()
    .withMessage('Shipping address is required')
    .isLength({ max: 500 })
    .withMessage('Shipping address must not exceed 500 characters'),
  body('payment_method_id')
    .notEmpty()
    .withMessage('Payment method ID is required')
    .isMongoId()
    .withMessage('Payment method ID must be a valid ObjectId'),
  body('order_note')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Order note must not exceed 500 characters'),
  body('voucher_code')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Voucher code must not exceed 50 characters'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Items array is required and must not be empty'),
  body('items.*.pd_id')
    .notEmpty()
    .withMessage('Product ID is required for each item'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  body('items.*.pd_price')
    .isNumeric()
    .withMessage('Product price must be a number'),
  validateRequest,
  auditLogger('CREATE')
], OrderController.createOrderFromCart);

// POST /api/v1/orders - Create new order (single product)
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
  validateRequest,
  auditLogger('CREATE')
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
  validateRequest,
  auditLogger('UPDATE')
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
  validateRequest,
  auditLogger('UPDATE')
], OrderController.updateOrderStatus);

// DELETE /api/v1/orders/:id - Delete order (Admin only)
router.delete('/:id', [
  authorize('ADMIN'),
  requirePermission('ORDER_MGMT'),
  validateObjectId('id'),
  auditLogger('DELETE')
], OrderController.deleteOrder);

module.exports = router;
