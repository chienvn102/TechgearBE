// controllers/ProductReviewController.js
// Enhanced Product Review Controller với Image Upload + Purchase Verification + Admin Moderation

const ProductReview = require('../models/ProductReview');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const ProductOrder = require('../models/ProductOrder');
const { asyncHandler } = require('../middleware/errorHandler');
const cloudinary = require('../config/cloudinary.config');
const multer = require('multer');
const path = require('path');
const { createAuditTrailFromRequest } = require('../utils/auditTrailHelper');

// ==========================================================================
// HELPER FUNCTIONS
// ==========================================================================

// Generate unique review ID
const generateReviewId = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `REV${timestamp}${random}`;
};

// Verify purchase - Check if customer bought this product
const verifyPurchase = async (customer_id, pd_id, order_id) => {
  try {
    // Check if order exists and belongs to customer
    const order = await Order.findOne({
      _id: order_id,
      customer_id: customer_id
    }).populate('po_id'); // Populate ProductOrder array

    if (!order) {
      return { verified: false, message: 'Order not found or does not belong to you' };
    }

    // Check if product is in this order's product array
    let productOrder = null;
    if (order.po_id && Array.isArray(order.po_id)) {
      productOrder = order.po_id.find(po => {
        if (po && po.pd_id) {
          return po.pd_id.toString() === pd_id.toString();
        }
        return false;
      });
    }

    if (!productOrder) {
      return { verified: false, message: 'Product not found in this order' };
    }

    // TODO: Uncomment when order status field is added to Order model
    // Check order status - only allow reviews for completed orders
    // if (order.of_state !== 'DELIVERED' && order.of_state !== 'ORDER_SUCCESS') {
    //   return { verified: false, message: 'Can only review delivered products' };
    // }

    return { verified: true, order, productOrder };
  } catch (error) {
    console.error('Error verifying purchase:', error);
    return { verified: false, message: 'Error verifying purchase' };
  }
};

// Upload images to Cloudinary
const uploadImagesToCloudinary = async (files) => {
  const uploadedImages = [];
  
  try {
    for (const file of files) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'ecommerce/reviews',
        transformation: [
          { width: 800, height: 800, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ]
      });

      uploadedImages.push({
        image_url: result.secure_url,
        cloudinary_public_id: result.public_id,
        cloudinary_secure_url: result.secure_url,
        uploaded_at: new Date()
      });
    }

    return { success: true, images: uploadedImages };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    
    // Cleanup uploaded images if error occurred
    for (const img of uploadedImages) {
      try {
        await cloudinary.uploader.destroy(img.cloudinary_public_id);
      } catch (cleanupError) {
        console.error('Error cleaning up image:', cleanupError);
      }
    }

    return { success: false, error: error.message };
  }
};

// Multer configuration for review images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/temp/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'review-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, and WebP images are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max per image
    files: 5 // Max 5 images per review
  }
});

// ==========================================================================
// PUBLIC ROUTES
// ==========================================================================

class ProductReviewController {
  // GET /api/v1/product-reviews - Get all reviews (public)
  static getAllReviews = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { product_id, rating, verified_only, search } = req.query;

    let query = { is_hidden: false }; // Only show non-hidden reviews to public

    if (product_id) {
      query.pd_id = product_id;
    }

    if (rating) {
      query.rating = parseInt(rating);
    }

    if (verified_only === 'true') {
      query.is_verified_purchase = true;
    }

    if (search) {
      query.review_comment = { $regex: search, $options: 'i' };
    }

    const total = await ProductReview.countDocuments(query);

    const reviews = await ProductReview.find(query)
      .populate('pd_id', 'pd_name pd_price pd_id')
      .populate('customer_id', 'cus_name cus_id')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRecords: total,
          limit
        }
      }
    });
  });

  // GET /api/v1/product-reviews/product/:productId - Get reviews for specific product
  static getProductReviews = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const { page, limit, skip } = req.pagination;
    const { rating, verified_only, sort_by } = req.query;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    let query = { 
      pd_id: productId,
      is_hidden: false 
    };

    if (rating) {
      query.rating = parseInt(rating);
    }

    if (verified_only === 'true') {
      query.is_verified_purchase = true;
    }

    // Sorting
    let sortOption = { created_at: -1 }; // Default: newest first
    if (sort_by === 'rating_high') sortOption = { rating: -1, created_at: -1 };
    if (sort_by === 'rating_low') sortOption = { rating: 1, created_at: -1 };
    if (sort_by === 'helpful') sortOption = { helpful_count: -1, created_at: -1 };

    const total = await ProductReview.countDocuments(query);

    const reviews = await ProductReview.find(query)
      .populate('customer_id', 'cus_name cus_id')
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRecords: total,
          limit
        }
      }
    });
  });

  // GET /api/v1/product-reviews/product/:productId/stats - Get review statistics
  static getProductReviewStats = asyncHandler(async (req, res) => {
    const { productId } = req.params;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get rating breakdown
    const ratingBreakdown = await ProductReview.aggregate([
      { 
        $match: { 
          pd_id: product._id,
          is_hidden: false 
        } 
      },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    // Get average rating and total reviews
    const stats = await ProductReview.aggregate([
      { 
        $match: { 
          pd_id: product._id,
          is_hidden: false 
        } 
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          verifiedPurchases: {
            $sum: { $cond: ['$is_verified_purchase', 1, 0] }
          },
          totalImages: {
            $sum: { $size: { $ifNull: ['$review_images', []] } }
          }
        }
      }
    ]);

    const statistics = stats[0] || {
      averageRating: 0,
      totalReviews: 0,
      verifiedPurchases: 0,
      totalImages: 0
    };

    // Format rating breakdown
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingBreakdown.forEach(item => {
      ratingCounts[item._id] = item.count;
    });

    res.status(200).json({
      success: true,
      data: {
        averageRating: Math.round(statistics.averageRating * 10) / 10,
        totalReviews: statistics.totalReviews,
        verifiedPurchases: statistics.verifiedPurchases,
        totalImages: statistics.totalImages,
        ratingBreakdown: ratingCounts
      }
    });
  });

  // GET /api/v1/product-reviews/:id - Get review by ID
  static getReviewById = asyncHandler(async (req, res) => {
    const review = await ProductReview.findById(req.params.id)
      .populate('pd_id', 'pd_name pd_price pd_id')
      .populate('customer_id', 'cus_name cus_id cus_email')
      .populate('order_id', 'od_id order_datetime')
      .lean();

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Don't show hidden reviews to public
    if (review.is_hidden && !req.user) {
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

  // ==========================================================================
  // CUSTOMER ROUTES
  // ==========================================================================

  // GET /api/v1/product-reviews/product/:productId/check-purchase - Check purchase verification
  static checkPurchaseVerification = asyncHandler(async (req, res) => {
    const { productId } = req.params;

    // Get customer_id from authenticated user
    const customer_id = req.user.customer_id;

    if (!customer_id) {
      return res.status(400).json({
        success: false,
        message: 'Customer ID not found in user profile'
      });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if customer already reviewed this product
    const existingReview = await ProductReview.findOne({
      pd_id: productId,
      customer_id
    });

    if (existingReview) {
      return res.status(200).json({
        success: true,
        data: {
          hasPurchased: true,
          hasReviewed: true,
          orders: []
        }
      });
    }

    // Find all orders containing this product
    // Strategy: Find orders by customer, check if they contain this product via po_id array
    const orders = await Order.find({
      customer_id: customer_id
    }).populate('po_id').lean();

    // Filter orders that contain this product
    const customerOrders = [];
    for (const order of orders) {
      // Check if po_id array contains product orders with this product
      if (order.po_id && Array.isArray(order.po_id)) {
        const hasProduct = order.po_id.some(po => {
          // po might be populated or just ObjectId
          if (po && po.pd_id) {
            return po.pd_id.toString() === productId.toString();
          }
          return false;
        });

        if (hasProduct) {
          // TODO: Check order status via order_info if needed
          // For now, accept all orders that contain the product
          customerOrders.push({
            _id: order._id,
            od_id: order.od_id,
            order_datetime: order.order_datetime
          });
        }
      }
    }

    if (customerOrders.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          hasPurchased: false,
          hasReviewed: false,
          orders: []
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        hasPurchased: true,
        hasReviewed: false,
        orders: customerOrders
      }
    });
  });

  // POST /api/v1/product-reviews - Create new review
  static createReview = asyncHandler(async (req, res) => {
    const { pd_id, order_id, rating, review_comment } = req.body;

    // Get customer_id from authenticated user
    const customer_id = req.user.customer_id;

    if (!customer_id) {
      return res.status(400).json({
        success: false,
        message: 'Customer ID not found in user profile'
      });
    }

    // Check if customer already reviewed this product
    const existingReview = await ProductReview.findOne({
      pd_id,
      customer_id
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    // Verify purchase
    const verification = await verifyPurchase(customer_id, pd_id, order_id);
    if (!verification.verified) {
      return res.status(403).json({
        success: false,
        message: verification.message
      });
    }

    // Create review
    const review = new ProductReview({
      review_id: generateReviewId(),
      pd_id,
      customer_id,
      order_id,
      rating,
      review_comment,
      is_verified_purchase: true,
      created_at: new Date()
    });

    await review.save();

    // Populate data for response
    const populatedReview = await ProductReview.findById(review._id)
      .populate('pd_id', 'pd_name pd_price')
      .populate('customer_id', 'cus_name cus_id')
      .populate('order_id', 'od_id');

    // Create audit trail for customer review creation
    await createAuditTrailFromRequest(req, 'CREATE', 'product-reviews', {
      review_id: review.review_id,
      pd_id,
      customer_id,
      rating
    });

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: { review: populatedReview }
    });
  });

  // POST /api/v1/product-reviews/:id/images - Upload review images
  static uploadReviewImages = [
    upload.array('images', 5), // Max 5 images
    asyncHandler(async (req, res) => {
      const reviewId = req.params.id;

      // Find review
      const review = await ProductReview.findById(reviewId);
      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Review not found'
        });
      }

      // Verify ownership
      const customer_id = req.user.customer_id;
      if (review.customer_id.toString() !== customer_id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only upload images to your own reviews'
        });
      }

      // Check if files were uploaded
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No images provided'
        });
      }

      // Check total images limit
      const currentImageCount = review.review_images?.length || 0;
      if (currentImageCount + req.files.length > 5) {
        return res.status(400).json({
          success: false,
          message: `Cannot upload more than 5 images total. Current: ${currentImageCount}`
        });
      }

      // Upload to Cloudinary
      const uploadResult = await uploadImagesToCloudinary(req.files);
      if (!uploadResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to upload images',
          error: uploadResult.error
        });
      }

      // Add images to review
      if (!review.review_images) {
        review.review_images = [];
      }
      review.review_images.push(...uploadResult.images);

      await review.save();

      res.status(200).json({
        success: true,
        message: 'Images uploaded successfully',
        data: {
          uploadedImages: uploadResult.images,
          totalImages: review.review_images.length
        }
      });
    })
  ];

  // PUT /api/v1/product-reviews/:id - Update review
  static updateReview = asyncHandler(async (req, res) => {
    const { rating, review_comment } = req.body;
    const reviewId = req.params.id;

    // Find review
    const review = await ProductReview.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Verify ownership
    const customer_id = req.user.customer_id;
    if (review.customer_id.toString() !== customer_id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own reviews'
      });
    }

    // Update fields
    if (rating) review.rating = rating;
    if (review_comment) review.review_comment = review_comment;

    await review.save();

    // Populate data for response
    const populatedReview = await ProductReview.findById(review._id)
      .populate('pd_id', 'pd_name pd_price')
      .populate('customer_id', 'cus_name cus_id');

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: { review: populatedReview }
    });
  });

  // DELETE /api/v1/product-reviews/:id - Delete own review
  static deleteReview = asyncHandler(async (req, res) => {
    const reviewId = req.params.id;

    // Find review
    const review = await ProductReview.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Verify ownership
    const customer_id = req.user.customer_id;
    if (review.customer_id.toString() !== customer_id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own reviews'
      });
    }

    // Delete images from Cloudinary
    if (review.review_images && review.review_images.length > 0) {
      for (const img of review.review_images) {
        try {
          await cloudinary.uploader.destroy(img.cloudinary_public_id);
        } catch (error) {
          console.error('Error deleting image from Cloudinary:', error);
        }
      }
    }

    await ProductReview.findByIdAndDelete(reviewId);

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  });

  // POST /api/v1/product-reviews/:id/helpful - Mark review as helpful
  static markHelpful = asyncHandler(async (req, res) => {
    const reviewId = req.params.id;

    const review = await ProductReview.findByIdAndUpdate(
      reviewId,
      { $inc: { helpful_count: 1 } },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Marked as helpful',
      data: {
        helpful_count: review.helpful_count
      }
    });
  });

  // POST /api/v1/product-reviews/:id/report - Report review
  static reportReview = asyncHandler(async (req, res) => {
    const reviewId = req.params.id;
    const { reason } = req.body;

    const review = await ProductReview.findByIdAndUpdate(
      reviewId,
      { $inc: { reported_count: 1 } },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // TODO: Create notification for admin about reported review
    // Can implement notification system later

    res.status(200).json({
      success: true,
      message: 'Review reported successfully. Our team will review it.'
    });
  });

  // ==========================================================================
  // ADMIN ROUTES
  // ==========================================================================

  // GET /api/v1/product-reviews/admin/all - Get all reviews (including hidden)
  static getAllReviewsAdmin = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { status, product_id, rating, search } = req.query;

    let query = {};

    // Filter by visibility status
    if (status === 'visible') {
      query.is_hidden = false;
    } else if (status === 'hidden') {
      query.is_hidden = true;
    }
    // status === 'all' shows everything

    if (product_id) {
      query.pd_id = product_id;
    }

    if (rating) {
      query.rating = parseInt(rating);
    }

    if (search) {
      query.review_comment = { $regex: search, $options: 'i' };
    }

    const total = await ProductReview.countDocuments(query);

    const reviews = await ProductReview.find(query)
      .populate('pd_id', 'pd_name pd_price pd_id')
      .populate('customer_id', 'cus_name cus_id cus_email')
      .populate('hidden_by', 'username name')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRecords: total,
          limit
        }
      }
    });
  });

  // PUT /api/v1/product-reviews/:id/hide - Hide/unhide review
  static hideReview = asyncHandler(async (req, res) => {
    const reviewId = req.params.id;
    const { is_hidden, reason } = req.body;

    const review = await ProductReview.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    review.is_hidden = is_hidden;
    if (is_hidden) {
      review.hidden_at = new Date();
      review.hidden_by = req.user._id; // Admin user ID
      if (reason) review.hidden_reason = reason;
    } else {
      review.hidden_at = null;
      review.hidden_by = null;
      review.hidden_reason = null;
    }

    await review.save();

    const populatedReview = await ProductReview.findById(review._id)
      .populate('pd_id', 'pd_name')
      .populate('customer_id', 'cus_name')
      .populate('hidden_by', 'username name');

    res.status(200).json({
      success: true,
      message: is_hidden ? 'Review hidden successfully' : 'Review made visible',
      data: { review: populatedReview }
    });
  });

  // DELETE /api/v1/product-reviews/:id/admin - Permanently delete review
  static deleteReviewAdmin = asyncHandler(async (req, res) => {
    const reviewId = req.params.id;

    const review = await ProductReview.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Delete images from Cloudinary
    if (review.review_images && review.review_images.length > 0) {
      for (const img of review.review_images) {
        try {
          await cloudinary.uploader.destroy(img.cloudinary_public_id);
        } catch (error) {
          console.error('Error deleting image from Cloudinary:', error);
        }
      }
    }

    await ProductReview.findByIdAndDelete(reviewId);

    res.status(200).json({
      success: true,
      message: 'Review permanently deleted'
    });
  });

  // GET /api/v1/product-reviews/admin/reported - Get reported reviews
  static getReportedReviews = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;

    const query = {
      reported_count: { $gt: 0 }
    };

    const total = await ProductReview.countDocuments(query);

    const reviews = await ProductReview.find(query)
      .populate('pd_id', 'pd_name pd_price')
      .populate('customer_id', 'cus_name cus_id')
      .sort({ reported_count: -1, created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRecords: total,
          limit
        }
      }
    });
  });
}

module.exports = ProductReviewController;
