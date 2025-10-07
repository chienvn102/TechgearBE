// middleware/auditLogger.js
// Automatic Audit Trail Logging Middleware
// Tự động ghi lại CREATE, UPDATE, DELETE operations

const { AuditTrail } = require('../models');

/**
 * Middleware để tự động log audit trail
 * @param {string} action - Action type: 'CREATE', 'UPDATE', 'DELETE'
 * @returns {Function} Express middleware
 */
const auditLogger = (action) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    // Override res.json để capture response
    res.json = function(data) {
      // Only log successful operations (2xx status)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Async log - không block response
        setImmediate(() => {
          createAuditLog(req, action, data).catch(err => {
            console.error('❌ Audit logging error:', err.message);
          });
        });
      }
      return originalJson(data);
    };

    // Override res.send
    res.send = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setImmediate(() => {
          createAuditLog(req, action, data).catch(err => {
            console.error('❌ Audit logging error:', err.message);
          });
        });
      }
      return originalSend(data);
    };

    next();
  };
};

/**
 * Create audit log entry
 * @param {Object} req - Express request object
 * @param {string} action - Action type
 * @param {Object} responseData - Response data
 */
const createAuditLog = async (req, action, responseData) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      console.log('⚠️ Audit log skipped: No authenticated user');
      return;
    }

    // Extract table name from URL
    const table_name = extractTableName(req.originalUrl);
    
    // Skip if table_name is not valid
    if (!table_name || table_name === 'unknown') {
      console.log(`⚠️ Audit log skipped: Invalid table name from URL ${req.originalUrl}`);
      return;
    }

    // Extract record ID from URL or response
    const record_id = extractRecordId(req, responseData);

    // Generate unique audit_id
    const audit_id = `AUD${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    // Prepare old_value (for UPDATE/DELETE, capture request body)
    let old_value = null;
    if (action === 'UPDATE' || action === 'DELETE') {
      if (req.body && Object.keys(req.body).length > 0) {
        // Remove sensitive fields
        const sanitizedBody = { ...req.body };
        delete sanitizedBody.password;
        delete sanitizedBody.currentPassword;
        delete sanitizedBody.newPassword;
        old_value = JSON.stringify(sanitizedBody);
      }
    }

    // Create audit trail
    await AuditTrail.create({
      audit_id,
      user_id: req.user._id,
      action: action.toUpperCase(),
      table_name: table_name.toLowerCase(),
      old_value,
      created_at: new Date()
    });

    console.log(`✅ Audit logged: ${action} on ${table_name} by ${req.user.username || req.user._id}`);
  } catch (error) {
    // Log error but don't throw (don't break the main request)
    console.error('❌ Failed to create audit log:', error.message);
  }
};

/**
 * Extract table name from URL
 * @param {string} url - Request URL
 * @returns {string} Table name
 */
const extractTableName = (url) => {
  // Remove /api/v1/ prefix and query params
  const cleanUrl = url.replace(/^\/api\/v1\//, '').split('?')[0];
  
  // Extract first path segment
  const segments = cleanUrl.split('/');
  let tableName = segments[0];

  // Handle special cases
  if (tableName === 'products' || tableName === 'product') {
    return 'product';
  }
  if (tableName === 'orders' || tableName === 'order') {
    return 'order';
  }
  if (tableName === 'customers' || tableName === 'customer') {
    return 'customer';
  }
  if (tableName === 'users' || tableName === 'user-management') {
    return 'user_management';
  }
  if (tableName === 'banners' || tableName === 'banner') {
    return 'banner';
  }
  if (tableName === 'brands' || tableName === 'brand') {
    return 'brand';
  }
  if (tableName === 'categories' || tableName === 'category') {
    return 'category';
  }
  if (tableName === 'vouchers' || tableName === 'voucher') {
    return 'voucher';
  }
  if (tableName === 'posts' || tableName === 'post') {
    return 'post';
  }
  if (tableName === 'players' || tableName === 'player') {
    return 'player';
  }
  if (tableName === 'product-types' || tableName === 'product-type') {
    return 'product_type';
  }
  if (tableName === 'reviews' || tableName === 'product-review') {
    return 'product_review';
  }
  if (tableName === 'notifications' || tableName === 'notification') {
    return 'notification';
  }
  if (tableName === 'roles' || tableName === 'role') {
    return 'role';
  }
  if (tableName === 'permissions' || tableName === 'permission') {
    return 'permission';
  }

  // Return as-is for other cases
  return tableName || 'unknown';
};

/**
 * Extract record ID from request or response
 * @param {Object} req - Express request
 * @param {Object} responseData - Response data
 * @returns {string|null} Record ID
 */
const extractRecordId = (req, responseData) => {
  // Try to get from URL params
  if (req.params && req.params.id) {
    return req.params.id;
  }

  // Try to get from response data
  try {
    if (typeof responseData === 'string') {
      responseData = JSON.parse(responseData);
    }

    if (responseData && responseData.data) {
      if (responseData.data._id) {
        return responseData.data._id;
      }
      if (responseData.data.id) {
        return responseData.data.id;
      }
    }
  } catch (error) {
    // Ignore parse errors
  }

  return null;
};

/**
 * Middleware để skip audit logging cho specific routes
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
const skipAuditLog = (req, res, next) => {
  req.skipAudit = true;
  next();
};

module.exports = {
  auditLogger,
  skipAuditLog
};
