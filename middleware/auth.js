// middleware/auth.js
// Authentication & Authorization middleware 

const jwt = require('jsonwebtoken');
const { UserManagement, UserCustomer, Role, RolePermission, Permission } = require('../models');
const config = require('../config');

// JWT Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.JWT_SECRET);
    
    // First try finding in user_management collection (admin users)
    let user = await UserManagement.findById(decoded.userId)
      .populate('role_id')
      .select('-password');

    if (user) {
      // Admin user found
      req.user = user;
      req.userType = 'admin';
      return next();
    }

    // If not found in user_management, try user_customer collection
    const { UserCustomer, CustomerRanking } = require('../models');
    user = await UserCustomer.findById(decoded.userId)
      .populate('customer_id')
      .select('-password');

    if (user) {
      // Get customer ranking
      const customerRanking = await CustomerRanking.findOne({ 
        customer_id: user.customer_id._id 
      }).populate('rank_id', 'rank_id rank_name min_spending max_spending');

      // Add ranking info to customer data
      if (customerRanking) {
        user.customer_id.ranking_id = customerRanking.rank_id;
        user.customer_id.total_spending = customerRanking.total_spending || 0;
      }

      // Customer user found
      req.user = user;
      req.userType = 'customer';
      return next();
    }

    // If user not found in either collection
    return res.status(401).json({
      success: false,
      message: 'User not found'
    });
    // Đã có return nên không cần next() ở đây, đây là lỗi logic
  } catch (error) {
    console.error('🚨 Authentication error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication'
    });
  }
};

// Role-based authorization middleware
const authorize = (...requiredRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Check if user's role is in required roles
      // Sửa lỗi: Kiểm tra nếu là customer, họ không có role_id
      if (req.userType === 'customer') {
        // Nếu chức năng yêu cầu role CUSTOMER hoặc không yêu cầu role nào
        if (requiredRoles.includes('CUSTOMER') || requiredRoles.length === 0) {
          return next();
        } else {
          return res.status(403).json({
            success: false,
            message: 'Insufficient permissions'
          });
        }
      }

      // Nếu là admin, kiểm tra role
      const userRole = req.user.role_id.role_id;
      
      if (!requiredRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Server error during authorization'
      });
    }
  };
};

// Permission-based authorization middleware - sử dụng role_permission collection
const requirePermission = (permissionId) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Nếu là customer, kiểm tra chức năng dành riêng cho customer
      if (req.userType === 'customer') {
        const customerPermissions = ['VIEW_OWN_PROFILE', 'EDIT_OWN_PROFILE', 'VIEW_OWN_ORDERS'];
        if (customerPermissions.includes(permissionId)) {
          return next();
        } else {
          return res.status(403).json({
            success: false,
            message: 'Permission denied'
          });
        }
      }
      
      console.log('🔍 Checking permission:', permissionId);
      console.log('👤 User:', req.user.username);
      console.log('🎭 Role:', req.user.role_id.role_id);
      console.log('🆔 Role ID:', req.user.role_id._id);

      // Check if user's role has required permission - sửa populate query
      const rolePermissions = await RolePermission.find({
        role_id: req.user.role_id._id
      }).populate('permission_id');

      console.log('🔐 All RolePermissions found:', rolePermissions);

      // Find the specific permission
      const hasPermission = rolePermissions.some(rp => 
        rp.permission_id && rp.permission_id.permission_id === permissionId
      );

      console.log('📋 Has permission?', hasPermission);

      if (!hasPermission) {
        console.log('❌ Permission denied for:', permissionId);
        return res.status(403).json({
          success: false,
          message: 'Permission denied'
        });
      }

      console.log('✅ Permission granted for:', permissionId);
      next();
    } catch (error) {
      console.error('🚨 Error in requirePermission:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error during permission check'
      });
    }
  };
};

// Generate JWT token function
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRE }
  );
};

module.exports = {
  authenticateToken,
  authorize,
  requirePermission,
  generateToken
};
