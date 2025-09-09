// middleware/pagination.js
// Pagination middleware 

/**
 * Pagination middleware
 * Xử lý phân trang cho các API endpoint
 */
const paginate = (req, res, next) => {
  try {
    // Lấy page và limit từ query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Validate page và limit
    if (page < 1) {
      return res.status(400).json({
        success: false,
        message: 'Page must be greater than 0'
      });
    }

    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be between 1 and 100'
      });
    }

    // Tính skip
    const skip = (page - 1) * limit;

    // Thêm pagination data vào request object
    req.pagination = {
      page,
      limit,
      skip
    };

    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid pagination parameters',
      error: error.message
    });
  }
};

/**
 * Generate pagination response
 * Helper function để tạo response pagination
 */
const createPaginationResponse = (data, page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      pages: totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
};

module.exports = {
  paginate,
  createPaginationResponse
};
