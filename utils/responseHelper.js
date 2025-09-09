// utils/responseHelper.js
// Response helper utilities 

class ResponseHelper {
  // Success response format
  static success(res, data = null, message = 'Success', statusCode = 200) {
    const response = {
      success: true,
      message
    };

    if (data !== null) {
      response.data = data;
    }

    return res.status(statusCode).json(response);
  }

  // Error response format
  static error(res, message = 'Error occurred', statusCode = 500, errors = null) {
    const response = {
      success: false,
      message
    };

    if (errors) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  }

  // Paginated response format
  static paginated(res, data, pagination, message = 'Data retrieved successfully') {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        pages: pagination.pages,
        hasNext: pagination.page < pagination.pages,
        hasPrev: pagination.page > 1
      }
    });
  }

  // Created response
  static created(res, data, message = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  // Not found response
  static notFound(res, message = 'Resource not found') {
    return this.error(res, message, 404);
  }

  // Validation error response
  static validationError(res, errors, message = 'Validation failed') {
    return this.error(res, message, 400, errors);
  }

  // Unauthorized response
  static unauthorized(res, message = 'Unauthorized access') {
    return this.error(res, message, 401);
  }

  // Forbidden response
  static forbidden(res, message = 'Access forbidden') {
    return this.error(res, message, 403);
  }

  // Conflict response
  static conflict(res, message = 'Resource conflict') {
    return this.error(res, message, 409);
  }

  // Internal server error response
  static internalError(res, message = 'Internal server error') {
    return this.error(res, message, 500);
  }
}

module.exports = ResponseHelper;
