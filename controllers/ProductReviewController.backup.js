// controllers/ProductReviewController.js
// CRUD controller cho product_review collection 

const { ProductReview, Product, Customer } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

class ProductReviewController {
  // GET /api/v1/product-reviews - Get all reviews
  static getAllReviews = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { search, product_id, rating, order_by } = req.query;

    let query = {};
    
    if (search) {
      query.review_comment = { $regex: search, $options: 'i' };
    }

    if (product_id) {
      query.pd_id = product_id;
    }

    if (rating) {
      query.review_rating = parseInt(rating);
    }

    const total = await ProductReview.countDocuments(query);

    let sortOption = { _id: -1 };
    if (order_by === 'rating_desc') sortOption = { review_rating: -1 };
    if (order_by === 'rating_asc') sortOption = { review_rating: 1 };
    if (order_by === 'date_asc') sortOption = { review_date: 1 };

    const reviews = await ProductReview.find(query)
      .populate('pd_id', 'product_name product_price')
      .populate('customer_id', 'customer_id name email')
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/product-reviews/:id - Get review by ID
  static getReviewById = asyncHandler(async (req, res) => {
    const review = await ProductReview.findById(req.params.id)
      .populate('pd_id', 'product_name product_price')
      .populate('customer_id', 'customer_id name email');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { review }
    });
  });

  // POST /api/v1/product-reviews - Create new review
  static createReview = asyncHandler(async (req, res) => {
    const { pd_id, customer_id, review_rating, review_comment } = req.body;

    if (!pd_id || !customer_id || !review_rating) {
      return res.status(400).json({
        success: false,
        message: 'Product ID, Customer ID and rating are required'
      });
    }

    // Validate rating range
    if (review_rating < 1 || review_rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Check if product exists
    const product = await Product.findById(pd_id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if customer exists
    const customer = await Customer.findById(customer_id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check if customer already reviewed this product
    const existingReview = await ProductReview.findOne({ pd_id, customer_id });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    const review = new ProductReview({
      pd_id,
      customer_id,
      rating: review_rating,
      review_comment: review_comment || '',
      created_at: new Date()
    });

    await review.save();

    // Update product average rating
    await this.updateProductRating(pd_id);

    const populatedReview = await ProductReview.findById(review._id)
      .populate('pd_id', 'product_name product_price')
      .populate('customer_id', 'customer_id name email');

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: { review: populatedReview }
    });
  });

  // PUT /api/v1/product-reviews/:id - Update review
  static updateReview = asyncHandler(async (req, res) => {
    const { review_rating, review_comment } = req.body;

    const review = await ProductReview.findById(req.params.id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Validate rating if provided
    if (review_rating && (review_rating < 1 || review_rating > 5)) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    if (review_rating) review.review_rating = review_rating;
    if (review_comment !== undefined) review.review_comment = review_comment;

    await review.save();

    // Update product average rating
    await this.updateProductRating(review.pd_id);

    const populatedReview = await ProductReview.findById(review._id)
      .populate('pd_id', 'product_name product_price')
      .populate('customer_id', 'customer_id name email');

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: { review: populatedReview }
    });
  });

  // DELETE /api/v1/product-reviews/:id - Delete review
  static deleteReview = asyncHandler(async (req, res) => {
    const review = await ProductReview.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    const productId = review.pd_id;
    
    await ProductReview.findByIdAndDelete(req.params.id);

    // Update product average rating
    await this.updateProductRating(productId);

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  });

  // GET /api/v1/products/:productId/reviews - Get reviews for specific product
  static getProductReviews = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { productId } = req.params;
    const { rating, order_by } = req.query;

    let query = { pd_id: productId };

    if (rating) {
      query.review_rating = parseInt(rating);
    }

    const total = await ProductReview.countDocuments(query);

    let sortOption = { review_date: -1 };
    if (order_by === 'rating_desc') sortOption = { review_rating: -1 };
    if (order_by === 'rating_asc') sortOption = { review_rating: 1 };
    if (order_by === 'date_asc') sortOption = { review_date: 1 };

    const reviews = await ProductReview.find(query)
      .populate('customer_id', 'uc_name')
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    // Get rating statistics
    const ratingStats = await ProductReview.aggregate([
      { $match: { pd_id: productId } },
      {
        $group: {
          _id: '$review_rating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    const avgRating = await ProductReview.aggregate([
      { $match: { pd_id: productId } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$review_rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        reviews,
        statistics: {
          averageRating: avgRating[0]?.averageRating || 0,
          totalReviews: avgRating[0]?.totalReviews || 0,
          ratingBreakdown: ratingStats
        },
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // Helper method to update product average rating
  static updateProductRating = async (productId) => {
    const stats = await ProductReview.aggregate([
      { $match: { pd_id: productId } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$review_rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    const avgRating = stats[0]?.averageRating || 0;
    const totalReviews = stats[0]?.totalReviews || 0;

    await Product.findByIdAndUpdate(productId, {
      product_rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
      review_count: totalReviews
    });
  };
}

module.exports = ProductReviewController;
