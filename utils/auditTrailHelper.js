// utils/auditTrailHelper.js
// Helper function để tạo audit trail cho cả admin và customer

const { AuditTrail, UserManagement, UserCustomer, Role } = require('../models');

/**
 * Get or create UserManagement for customer
 * Mỗi UserCustomer sẽ có một UserManagement tương ứng với role USER
 */
async function getOrCreateUserManagementForCustomer(userCustomerId) {
  try {
    // Tìm UserCustomer
    const userCustomer = await UserCustomer.findById(userCustomerId).populate('customer_id');
    if (!userCustomer) {
      console.warn(`⚠️ UserCustomer ${userCustomerId} not found`);
      return null;
    }

    // Tìm role USER
    let userRole = await Role.findOne({ role_name: 'USER' });
    if (!userRole) {
      // Tạo role USER nếu chưa có
      userRole = await Role.create({
        role_id: `ROLE_USER_${Date.now()}`,
        role_name: 'USER',
        role_description: 'Customer user role'
      });
    }

    // Tìm UserManagement với username giống UserCustomer
    let userManagement = await UserManagement.findOne({ 
      username: userCustomer.username 
    });

    if (!userManagement) {
      // Tạo UserManagement mới cho customer này
      userManagement = new UserManagement({
        um_id: `UM_CUSTOMER_${Date.now()}`,
        username: userCustomer.username,
        password: userCustomer.password, // Copy password đã hash
        name: userCustomer.customer_id?.cus_name || userCustomer.username,
        role_id: userRole._id
      });
      await userManagement.save();
      console.log(`✅ Created UserManagement for customer: ${userCustomer.username}`);
    }

    return userManagement._id;
  } catch (error) {
    console.error('❌ Error getting/creating UserManagement for customer:', error);
    return null;
  }
}

/**
 * Create audit trail entry
 * @param {Object} data - Audit trail data
 * @param {String} data.userId - ID của user (có thể là UserManagement hoặc UserCustomer)
 * @param {String} data.userType - 'admin' hoặc 'customer'
 * @param {String} data.action - 'CREATE', 'UPDATE', 'DELETE'
 * @param {String} data.tableName - Tên bảng bị thay đổi
 * @param {String} data.oldValue - Giá trị cũ (optional)
 */
async function createAuditTrail({ userId, userType, action, tableName, oldValue = null }) {
  try {
    const auditData = {
      audit_id: `AUD${Date.now()}${Math.floor(Math.random() * 1000)}`,
      action: action.toUpperCase(),
      table_name: tableName.toLowerCase(),
      old_value: oldValue ? JSON.stringify(oldValue) : undefined
    };

    // Set appropriate user_id based on userType
    if (userType === 'customer') {
      auditData.customer_user_id = userId; // Use customer_user_id for customers
    } else {
      auditData.user_id = userId; // Use user_id for admin/manager
    }

    const auditTrail = await AuditTrail.create(auditData);
    console.log(`✅ Audit trail created: ${action} on ${tableName} by ${userType} user ${userId}`);
    return auditTrail;
  } catch (error) {
    console.error('❌ Error creating audit trail:', error);
    return null;
  }
}

/**
 * Create audit trail from request
 * Automatically detects user type from req.user and req.userType
 */
async function createAuditTrailFromRequest(req, action, tableName, oldValue = null) {
  if (!req.user) {
    console.warn('⚠️ Cannot create audit trail: No user in request');
    return null;
  }

  return await createAuditTrail({
    userId: req.user._id,
    userType: req.userType || 'admin',
    action,
    tableName,
    oldValue
  });
}

module.exports = {
  createAuditTrail,
  createAuditTrailFromRequest,
  getOrCreateUserManagementForCustomer
};
