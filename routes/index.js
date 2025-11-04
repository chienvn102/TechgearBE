// routes/index.js
// Main routes index 

const express = require('express');
const router = express.Router();


const authRoutes = require('./authRoutes');
const userManagementRoutes = require('./userManagementRoutes');
const productRoutes = require('./productRoutes');
const orderRoutes = require('./orderRoutes');
const brandRoutes = require('./brandRoutes');
const rankingRoutes = require('./rankingRoutes');
const customerRankingRoutes = require('./customerRankingRoutes');
const customerAddressRoutes = require('./customerAddressRoutes');
const productImageRoutes = require('./productImageRoutes');
const productOrderRoutes = require('./productOrderRoutes');
const productTypeRoutes = require('./productTypeRoutes');
const productReviewRoutes = require('./productReviewRoutes');
const roleRoutes = require('./roleRoutes');
const notificationRoutes = require('./notificationRoutes');
const notificationRoutesV2 = require('./notificationRoutesV2'); // NEW: Enhanced notification system
const voucherRoutes = require('./voucherRoutes');
const customerRoutes = require('./customerRoutes');
const userCustomerRoutes = require('./userCustomerRoutes');
const categoryRoutes = require('./categoryRoutes');


const auditTrailRoutes = require('./auditTrailRoutes');
const orderInfoRoutes = require('./orderInfoRoutes');
const orderPaymentLogRoutes = require('./orderPaymentLogRoutes');
const paymentStatusRoutes = require('./paymentStatusRoutes');
const playerRoutes = require('./playerRoutes');
const postRoutes = require('./postRoutes');
const rolePermissionRoutes = require('./rolePermissionRoutes');
const userAddressesRoutes = require('./userAddressesRoutes');
const voucherUsageRoutes = require('./voucherUsageRoutes');
const bannerRoutes = require('./bannerRoutes');
const paymentMethodRoutes = require('./paymentMethodRoutes');
const permissionRoutes = require('./permissionRoutes');
const productPlayerRoutes = require('./productPlayerRoutes'); 
const cartRoutes = require('./cartRoutes'); // NEW: Cart functionality
const uploadRoutes = require('./upload'); // Full upload functionality with Cloudinary
const analyticsRoutes = require('./analyticsRoutes'); // NEW: Analytics & Dashboard Statistics
const paymentRoutes = require('./payment.routes'); // NEW: PayOS Payment Integration
const addressRoutes = require('./addressRoutes'); // NEW: Vietnam Address API Proxy

// API prefix từ config
const { API_PREFIX } = require('../config');

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'E-commerce Backend API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'ecommerce_system',
    reference: 'README_MongoDB.md'
  });
});

// API documentation endpoint
router.get('/info', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      api_name: 'E-commerce Backend API',
      version: '1.0.0',
      description: 'Backend cho hệ thống thương mại điện tử',
      collections_count: 30,
      implemented_controllers: 30, // All controllers now complete including ProductPlayer
      implemented_routes: 30, // All routes now complete including ProductPlayer
      endpoints: {
        auth: `${API_PREFIX}/auth`,
        user_management: `${API_PREFIX}/user-management`,
        products: `${API_PREFIX}/products`,
        orders: `${API_PREFIX}/orders`,
        brands: `${API_PREFIX}/brands`,
        rankings: `${API_PREFIX}/rankings`,
        customer_rankings: `${API_PREFIX}/customer-rankings`,
        customer_addresses: `${API_PREFIX}/customer-addresses`,
        product_images: `${API_PREFIX}/product-images`,
        product_orders: `${API_PREFIX}/product-orders`,
        product_types: `${API_PREFIX}/product-types`,
        product_reviews: `${API_PREFIX}/product-reviews`,
        roles: `${API_PREFIX}/roles`,
        notifications: `${API_PREFIX}/notifications`,
        vouchers: `${API_PREFIX}/vouchers`,
        customers: `${API_PREFIX}/customers`,
        user_customers: `${API_PREFIX}/user-customers`,
        categories: `${API_PREFIX}/categories`,
        audit_trail: `${API_PREFIX}/audit-trail`,
        order_info: `${API_PREFIX}/order-info`,
        order_payment_log: `${API_PREFIX}/order-payment-log`,
        payment_status: `${API_PREFIX}/payment-status`,
        players: `${API_PREFIX}/players`,
        posts: `${API_PREFIX}/posts`,
        role_permission: `${API_PREFIX}/role-permission`,
        user_addresses: `${API_PREFIX}/user-addresses`,
        voucher_usage: `${API_PREFIX}/voucher-usage`,
        banners: `${API_PREFIX}/banners`,
        payment_methods: `${API_PREFIX}/payment-methods`,
        permissions: `${API_PREFIX}/permissions`,
        product_players: `${API_PREFIX}/product-players`, // NEW: many-to-many relationship endpoint
        cart: `${API_PREFIX}/cart` // NEW: Cart functionality endpoint
      },
      database: {
        name: 'ecommerce_system',
        type: 'MongoDB',
        collections: [
          'user_management', 'role', 'user_customer', 'customer', 'customer_address',
          'customer_ranking', 'ranking', 'voucher', 'product', 'product_type',
          'brand', 'category', 'product_image', 'post', 'product_order',
          'order', 'payment_method', 'payment_status', 'order_info', 'notification',
          'banner', 'product_review', 'player', 'permission', 'role_permission',
          'audit_trail', 'order_payment_log', 'user_addresses', 'voucher_usage'
        ]
      },
      compliance: {
        source_document: 'README_MongoDB.md',
        rules_document: 'rule_backend.instructions.md',
        total_collections: 30, // Updated to include product_player
        authentication: 'JWT',
        authorization: 'Role-based + Permission-based'
      }
    }
  });
});

// Mount route modules - All routes now implemented and registered
router.use('/auth', authRoutes);
router.use('/user-management', userManagementRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/brands', brandRoutes);
router.use('/rankings', rankingRoutes);
router.use('/customer-rankings', customerRankingRoutes);
router.use('/customer-addresses', customerAddressRoutes);
router.use('/product-images', productImageRoutes);
router.use('/product-orders', productOrderRoutes);
router.use('/product-types', productTypeRoutes);
router.use('/product-reviews', productReviewRoutes);
router.use('/roles', roleRoutes);
router.use('/notifications', notificationRoutesV2); // Use enhanced notification routes
router.use('/vouchers', voucherRoutes);
router.use('/customers', customerRoutes);
router.use('/user-customers', userCustomerRoutes);
router.use('/categories', categoryRoutes);
router.use('/banners', bannerRoutes);
router.use('/payment-methods', paymentMethodRoutes);
router.use('/permissions', permissionRoutes);
router.use('/audit-trail', auditTrailRoutes);
router.use('/order-info', orderInfoRoutes);
router.use('/order-payment-log', orderPaymentLogRoutes);
router.use('/payment-status', paymentStatusRoutes);
router.use('/players', playerRoutes);
router.use('/posts', postRoutes);
router.use('/voucher-usage', voucherUsageRoutes);
router.use('/product-players', productPlayerRoutes); // NEW: many-to-many product-player relationship
router.use('/user-addresses', userAddressesRoutes);
router.use('/role-permission', rolePermissionRoutes);
router.use('/cart', cartRoutes); // NEW: Cart functionality
router.use('/upload', uploadRoutes); // NEW: File upload functionality
router.use('/analytics', analyticsRoutes); // NEW: Analytics & Dashboard Statistics
router.use('/payments', paymentRoutes); // NEW: PayOS Payment Integration
router.use('/address', addressRoutes); // NEW: Vietnam Address API Proxy



module.exports = router;
