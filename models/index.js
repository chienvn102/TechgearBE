// models/index.js
// Export tất cả 30 models 

// Import tất cả 30 models theo đúng thứ tự trong rule
const UserManagement = require('./UserManagement');
const Role = require('./Role');
const UserCustomer = require('./UserCustomer');
const Customer = require('./Customer');
const CustomerAddress = require('./CustomerAddress');
const CustomerRanking = require('./CustomerRanking');
const Ranking = require('./Ranking');
const Voucher = require('./Voucher');
const Product = require('./Product');
const ProductType = require('./ProductType');
const Brand = require('./Brand');
const Category = require('./Category');
const ProductImage = require('./ProductImage');
const Post = require('./Post');
const ProductOrder = require('./ProductOrder');
const Order = require('./Order');
const PaymentMethod = require('./PaymentMethod');
const PaymentStatus = require('./PaymentStatus');
const OrderInfo = require('./OrderInfo');
const Notification = require('./Notification');
const Banner = require('./Banner');
const ProductReview = require('./ProductReview');
const Player = require('./Player');
const Permission = require('./Permission');
const RolePermission = require('./RolePermission');
const AuditTrail = require('./AuditTrail');
const OrderPaymentLog = require('./OrderPaymentLog');
const UserAddresses = require('./UserAddresses');
const VoucherUsage = require('./VoucherUsage');
const ProductPlayer = require('./ProductPlayer'); // Collection mới cho many-to-many relationship

// Export tất cả models - đúng 30 collections theo rule
module.exports = {
  // 1-5: User & Customer Management
  UserManagement,
  Role,
  UserCustomer,
  Customer,
  CustomerAddress,
  
  // 6-10: Ranking & Products
  CustomerRanking,
  Ranking,
  Voucher,
  Product,
  ProductType,
  
  // 11-15: Product Categories & Content
  Brand,
  Category,
  ProductImage,
  Post,
  ProductOrder,
  
  // 16-20: Orders & Payments
  Order,
  PaymentMethod,
  PaymentStatus,
  OrderInfo,
  Notification,
  
  // 21-25: Marketing & Reviews
  Banner,
  ProductReview,
  Player,
  Permission,
  RolePermission,
  
  // 26-30: Audit & Advanced Features
  AuditTrail,
  OrderPaymentLog,
  UserAddresses,
  VoucherUsage,
  ProductPlayer // 30. Collection mới cho product-player many-to-many
};

// Log confirmation theo rule requirements
