// middleware/validation.js
// Input validation middleware 

const { validationResult } = require('express-validator');

// Validate request data
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    console.log('❌ Validation failed for:', req.path);
    console.log('❌ Request body:', req.body);
    console.log('❌ Validation errors:', errors.array());
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

// Validate ObjectId format
const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const mongoose = require('mongoose');
    let id = req.params[paramName];
    
    // Remove curly braces if present
    if (id && id.startsWith('{') && id.endsWith('}')) {
      id = id.slice(1, -1);
      req.params[paramName] = id; // Update the parameter
    }
    
    const isValid = mongoose.Types.ObjectId.isValid(id);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format`
      });
    }
    
    next();
  };
};

// Validate pagination parameters
const validatePagination = (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;
  
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  
  if (isNaN(pageNum) || pageNum < 1) {
    return res.status(400).json({
      success: false,
      message: 'Page must be a positive number'
    });
  }
  
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return res.status(400).json({
      success: false,
      message: 'Limit must be between 1 and 100'
    });
  }
  
  req.pagination = {
    page: pageNum,
    limit: limitNum,
    skip: (pageNum - 1) * limitNum
  };
  
  next();
};

// Validate unique fields để tránh duplicate
const validateUniqueField = (Model, field, excludeId = null) => {
  return async (req, res, next) => {
    try {
      const query = { [field]: req.body[field] };
      
      // Exclude current record khi update
      if (excludeId && req.params.id) {
        query._id = { $ne: req.params.id };
      }
      
      const existing = await Model.findOne(query);
      
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `${field} already exists`
        });
      }
      
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Server error during validation'
      });
    }
  };
};

// Validate foreign key references
const validateReference = (Model, field, refField = '_id') => {
  return async (req, res, next) => {
    try {
      const refValue = req.body[field];
      
      if (!refValue) {
        return next(); // Skip if not provided (might be optional)
      }
      
      const referenced = await Model.findOne({ [refField]: refValue });
      
      if (!referenced) {
        return res.status(400).json({
          success: false,
          message: `Referenced ${field} not found`
        });
      }
      
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Server error during reference validation'
      });
    }
  };
};

module.exports = {
  validateRequest,
  validateObjectId,
  validatePagination,
  validateUniqueField,
  validateReference
};
