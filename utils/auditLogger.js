// utils/auditLogger.js
// Helper functions để tạo audit trail logs

const { AuditTrail } = require('../models');

/**
 * Create audit log entry
 * @param {Object} params - Audit log parameters
 * @param {String} params.user_id - User ID (from UserManagement)
 * @param {String} params.customer_user_id - Customer User ID (from UserCustomer)
 * @param {String} params.action - Action type: CREATE, UPDATE, DELETE
 * @param {String} params.table_name - Table/collection name
 * @param {Object} params.old_value - Old value before change (for UPDATE/DELETE)
 * @param {String} params.userType - 'admin' hoặc 'customer'
 */
async function createAuditLog({ user_id, customer_user_id, action, table_name, old_value = null, userType = 'admin' }) {
  try {
    // Generate unique audit_id
    const audit_id = `AUD${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const auditData = {
      audit_id,
      action: action.toUpperCase(),
      table_name,
      old_value: old_value ? JSON.stringify(old_value) : null,
    };

    // Set appropriate user_id based on userType
    if (userType === 'admin' || userType === 'manager') {
      auditData.user_id = user_id || null;
    } else if (userType === 'customer') {
      auditData.customer_user_id = customer_user_id || null;
    }

    const auditLog = await AuditTrail.create(auditData);
    console.log(`✅ Audit log created: ${action} on ${table_name} by ${userType} ${user_id || customer_user_id || 'system'}`);
    return auditLog;
  } catch (error) {
    console.error('❌ Error creating audit log:', error);
    // Don't throw error - audit logging should not break main functionality
    return null;
  }
}

/**
 * Log order creation
 */
async function logOrderCreate(customer_user_id, orderData, userType = 'customer') {
  return createAuditLog({
    customer_user_id,
    action: 'CREATE',
    table_name: 'order',
    userType
  });
}

/**
 * Log order update
 */
async function logOrderUpdate(user_id, oldOrder, userType = 'admin') {
  return createAuditLog({
    user_id,
    action: 'UPDATE',
    table_name: 'order',
    old_value: oldOrder,
    userType
  });
}

/**
 * Log product review creation
 */
async function logReviewCreate(customer_user_id, reviewData) {
  return createAuditLog({
    customer_user_id,
    action: 'CREATE',
    table_name: 'product_review',
    userType: 'customer'
  });
}

/**
 * Log product review update
 */
async function logReviewUpdate(user_id, oldReview, userType = 'admin') {
  return createAuditLog({
    user_id,
    action: 'UPDATE',
    table_name: 'product_review',
    old_value: oldReview,
    userType
  });
}

/**
 * Log product review deletion
 */
async function logReviewDelete(user_id, review, userType = 'admin') {
  return createAuditLog({
    user_id,
    action: 'DELETE',
    table_name: 'product_review',
    old_value: review,
    userType
  });
}

/**
 * Log product creation
 */
async function logProductCreate(user_id, productData) {
  return createAuditLog({
    user_id,
    action: 'CREATE',
    table_name: 'product',
    userType: 'admin'
  });
}

/**
 * Log product update
 */
async function logProductUpdate(user_id, oldProduct) {
  return createAuditLog({
    user_id,
    action: 'UPDATE',
    table_name: 'product',
    old_value: oldProduct,
    userType: 'admin'
  });
}

/**
 * Log product deletion
 */
async function logProductDelete(user_id, product) {
  return createAuditLog({
    user_id,
    action: 'DELETE',
    table_name: 'product',
    old_value: product,
    userType: 'admin'
  });
}

module.exports = {
  createAuditLog,
  logOrderCreate,
  logOrderUpdate,
  logReviewCreate,
  logReviewUpdate,
  logReviewDelete,
  logProductCreate,
  logProductUpdate,
  logProductDelete
};
