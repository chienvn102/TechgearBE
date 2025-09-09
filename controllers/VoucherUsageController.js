// controllers/VoucherUsageController.js
// CRUD controller cho voucher_usage collection 

const { VoucherUsage, Voucher, UserCustomer, Order } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

class VoucherUsageController {
  // GET /api/v1/voucher-usage - Get all voucher usages
  static getAllVoucherUsages = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { voucher_id, uc_id, order_id, start_date, end_date } = req.query;

    let query = {};
    
    if (voucher_id) {
      query.voucher_id = voucher_id;
    }

    if (uc_id) {
      query.uc_id = uc_id;
    }

    if (order_id) {
      query.order_id = order_id;
    }

    if (start_date || end_date) {
      query.used_at = {};
      if (start_date) query.used_at.$gte = new Date(start_date);
      if (end_date) query.used_at.$lte = new Date(end_date);
    }

    const total = await VoucherUsage.countDocuments(query);

    const voucherUsages = await VoucherUsage.find(query)
      .populate('voucher_id', 'voucher_code voucher_name voucher_type discount_value')
      .populate('uc_id', 'uc_name uc_email')
      .populate('order_id', 'od_id order_total')
      .sort({ used_at: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        voucherUsages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/voucher-usage/:id - Get voucher usage by ID
  static getVoucherUsageById = asyncHandler(async (req, res) => {
    const voucherUsage = await VoucherUsage.findById(req.params.id)
      .populate('voucher_id', 'voucher_code voucher_name voucher_type discount_value')
      .populate('uc_id', 'uc_name uc_email uc_phone')
      .populate('order_id', 'od_id order_total order_datetime customer_name');

    if (!voucherUsage) {
      return res.status(404).json({
        success: false,
        message: 'Voucher usage not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { voucherUsage }
    });
  });

  // POST /api/v1/voucher-usage - Create new voucher usage
  static createVoucherUsage = asyncHandler(async (req, res) => {
    const { voucher_id, uc_id, order_id, discount_amount } = req.body;

    if (!voucher_id || !uc_id || !order_id || discount_amount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Voucher ID, user ID, order ID, and discount amount are required'
      });
    }

    // Verify voucher exists and is valid
    const voucher = await Voucher.findById(voucher_id);
    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found'
      });
    }

    if (!voucher.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Voucher is not active'
      });
    }

    // Check voucher validity dates
    const now = new Date();
    if (voucher.start_date && voucher.start_date > now) {
      return res.status(400).json({
        success: false,
        message: 'Voucher is not yet valid'
      });
    }

    if (voucher.end_date && voucher.end_date < now) {
      return res.status(400).json({
        success: false,
        message: 'Voucher has expired'
      });
    }

    // Check usage limit
    const currentUsageCount = await VoucherUsage.countDocuments({ voucher_id });
    if (voucher.max_uses && currentUsageCount >= voucher.max_uses) {
      return res.status(400).json({
        success: false,
        message: 'Voucher usage limit reached'
      });
    }

    // Verify user exists
    const user = await UserCustomer.findById(uc_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify order exists
    const order = await Order.findById(order_id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if voucher has already been used for this order
    const existingUsage = await VoucherUsage.findOne({ voucher_id, order_id });
    if (existingUsage) {
      return res.status(400).json({
        success: false,
        message: 'Voucher has already been used for this order'
      });
    }

    // Validate discount amount
    if (discount_amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Discount amount must be greater than 0'
      });
    }

    const voucherUsage = new VoucherUsage({
      voucher_id,
      uc_id,
      order_id,
      discount_amount,
      used_at: new Date()
    });

    await voucherUsage.save();

    // Populate for response
    await voucherUsage.populate('voucher_id', 'voucher_code voucher_name');
    await voucherUsage.populate('uc_id', 'uc_name uc_email');
    await voucherUsage.populate('order_id', 'od_id order_total');

    res.status(201).json({
      success: true,
      message: 'Voucher usage created successfully',
      data: { voucherUsage }
    });
  });

  // DELETE /api/v1/voucher-usage/:id - Delete voucher usage (for refunds)
  static deleteVoucherUsage = asyncHandler(async (req, res) => {
    const voucherUsage = await VoucherUsage.findById(req.params.id);
    
    if (!voucherUsage) {
      return res.status(404).json({
        success: false,
        message: 'Voucher usage not found'
      });
    }

    await VoucherUsage.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Voucher usage deleted successfully (refund processed)'
    });
  });

  // GET /api/v1/voucher-usage/voucher/:voucherId - Get usage for specific voucher
  static getUsageByVoucher = asyncHandler(async (req, res) => {
    const { voucherId } = req.params;
    const { page, limit, skip } = req.pagination;

    // Verify voucher exists
    const voucher = await Voucher.findById(voucherId);
    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found'
      });
    }

    const total = await VoucherUsage.countDocuments({ voucher_id: voucherId });

    const voucherUsages = await VoucherUsage.find({ voucher_id: voucherId })
      .populate('uc_id', 'uc_name uc_email')
      .populate('order_id', 'od_id order_total order_datetime')
      .sort({ used_at: -1 })
      .skip(skip)
      .limit(limit);

    // Calculate total discount given
    const totalDiscount = await VoucherUsage.aggregate([
      { $match: { voucher_id: voucher._id } },
      { $group: { _id: null, total: { $sum: '$discount_amount' } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        voucher: {
          _id: voucher._id,
          voucher_code: voucher.voucher_code,
          voucher_name: voucher.voucher_name,
          max_uses: voucher.max_uses,
          current_uses: total
        },
        voucherUsages,
        totalDiscountGiven: totalDiscount[0]?.total || 0,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/voucher-usage/user/:userId - Get usage for specific user
  static getUsageByUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page, limit, skip } = req.pagination;

    // Verify user exists
    const user = await UserCustomer.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const total = await VoucherUsage.countDocuments({ uc_id: userId });

    const voucherUsages = await VoucherUsage.find({ uc_id: userId })
      .populate('voucher_id', 'voucher_code voucher_name voucher_type discount_value')
      .populate('order_id', 'od_id order_total order_datetime')
      .sort({ used_at: -1 })
      .skip(skip)
      .limit(limit);

    // Calculate total savings
    const totalSavings = await VoucherUsage.aggregate([
      { $match: { uc_id: user._id } },
      { $group: { _id: null, total: { $sum: '$discount_amount' } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          uc_name: user.uc_name,
          uc_email: user.uc_email
        },
        voucherUsages,
        totalSavings: totalSavings[0]?.total || 0,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/voucher-usage/order/:orderId - Get usage for specific order
  static getUsageByOrder = asyncHandler(async (req, res) => {
    const { orderId } = req.params;

    // Verify order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const voucherUsages = await VoucherUsage.find({ order_id: orderId })
      .populate('voucher_id', 'voucher_code voucher_name voucher_type discount_value')
      .populate('uc_id', 'uc_name uc_email')
      .sort({ used_at: -1 });

    // Calculate total discount for this order
    const totalDiscount = voucherUsages.reduce((sum, usage) => sum + usage.discount_amount, 0);

    res.status(200).json({
      success: true,
      data: {
        order: {
          _id: order._id,
          od_id: order.od_id,
          order_total: order.order_total,
          customer_name: order.customer_name
        },
        voucherUsages,
        totalDiscount
      }
    });
  });

  // GET /api/v1/voucher-usage/statistics - Get voucher usage statistics
  static getVoucherUsageStatistics = asyncHandler(async (req, res) => {
    const totalUsages = await VoucherUsage.countDocuments();

    // Total discount given
    const totalDiscountStats = await VoucherUsage.aggregate([
      {
        $group: {
          _id: null,
          total_discount: { $sum: '$discount_amount' },
          avg_discount: { $avg: '$discount_amount' },
          min_discount: { $min: '$discount_amount' },
          max_discount: { $max: '$discount_amount' }
        }
      }
    ]);

    // Most used vouchers
    const mostUsedVouchers = await VoucherUsage.aggregate([
      {
        $lookup: {
          from: 'voucher',
          localField: 'voucher_id',
          foreignField: '_id',
          as: 'voucher'
        }
      },
      { $unwind: '$voucher' },
      {
        $group: {
          _id: '$voucher_id',
          voucher_code: { $first: '$voucher.voucher_code' },
          voucher_name: { $first: '$voucher.voucher_name' },
          usage_count: { $sum: 1 },
          total_discount: { $sum: '$discount_amount' }
        }
      },
      { $sort: { usage_count: -1 } },
      { $limit: 10 }
    ]);

    // Top users by savings
    const topUsersBySavings = await VoucherUsage.aggregate([
      {
        $lookup: {
          from: 'user_customer',
          localField: 'uc_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $group: {
          _id: '$uc_id',
          user_name: { $first: '$user.uc_name' },
          user_email: { $first: '$user.uc_email' },
          total_savings: { $sum: '$discount_amount' },
          voucher_count: { $sum: 1 }
        }
      },
      { $sort: { total_savings: -1 } },
      { $limit: 10 }
    ]);

    // Monthly usage trend (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyTrend = await VoucherUsage.aggregate([
      {
        $match: {
          used_at: { $gte: twelveMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$used_at' },
            month: { $month: '$used_at' }
          },
          usage_count: { $sum: 1 },
          total_discount: { $sum: '$discount_amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Usage by voucher type
    const usageByType = await VoucherUsage.aggregate([
      {
        $lookup: {
          from: 'voucher',
          localField: 'voucher_id',
          foreignField: '_id',
          as: 'voucher'
        }
      },
      { $unwind: '$voucher' },
      {
        $group: {
          _id: '$voucher.voucher_type',
          usage_count: { $sum: 1 },
          total_discount: { $sum: '$discount_amount' },
          avg_discount: { $avg: '$discount_amount' }
        }
      },
      { $sort: { usage_count: -1 } }
    ]);

    // Recent usage (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentUsage = await VoucherUsage.countDocuments({
      used_at: { $gte: sevenDaysAgo }
    });

    res.status(200).json({
      success: true,
      data: {
        totalUsages,
        recentUsage,
        discountStats: totalDiscountStats[0] || {
          total_discount: 0,
          avg_discount: 0,
          min_discount: 0,
          max_discount: 0
        },
        mostUsedVouchers,
        topUsersBySavings,
        monthlyTrend,
        usageByType
      }
    });
  });

  // GET /api/v1/voucher-usage/validate/:voucherId - Validate voucher for usage
  static validateVoucherForUsage = asyncHandler(async (req, res) => {
    const { voucherId } = req.params;
    const { uc_id, order_amount } = req.query;

    // Verify voucher exists
    const voucher = await Voucher.findById(voucherId);
    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found'
      });
    }

    const validation = {
      is_valid: true,
      errors: [],
      warnings: []
    };

    // Check if voucher is active
    if (!voucher.is_active) {
      validation.is_valid = false;
      validation.errors.push('Voucher is not active');
    }

    // Check validity dates
    const now = new Date();
    if (voucher.start_date && voucher.start_date > now) {
      validation.is_valid = false;
      validation.errors.push('Voucher is not yet valid');
    }

    if (voucher.end_date && voucher.end_date < now) {
      validation.is_valid = false;
      validation.errors.push('Voucher has expired');
    }

    // Check usage limit
    const currentUsageCount = await VoucherUsage.countDocuments({ voucher_id: voucherId });
    if (voucher.max_uses && currentUsageCount >= voucher.max_uses) {
      validation.is_valid = false;
      validation.errors.push('Voucher usage limit reached');
    }

    // Check minimum order amount
    if (order_amount && voucher.min_order_amount && parseFloat(order_amount) < voucher.min_order_amount) {
      validation.is_valid = false;
      validation.errors.push(`Minimum order amount is ${voucher.min_order_amount}`);
    }

    // Check user usage if user_id provided
    if (uc_id) {
      const userUsageCount = await VoucherUsage.countDocuments({ voucher_id: voucherId, uc_id });
      if (userUsageCount > 0) {
        validation.warnings.push('User has already used this voucher');
      }
    }

    // Calculate discount if valid
    let calculatedDiscount = 0;
    if (validation.is_valid && order_amount) {
      const orderAmt = parseFloat(order_amount);
      if (voucher.voucher_type === 'percentage') {
        calculatedDiscount = (orderAmt * voucher.discount_value) / 100;
        if (voucher.max_discount_amount && calculatedDiscount > voucher.max_discount_amount) {
          calculatedDiscount = voucher.max_discount_amount;
        }
      } else if (voucher.voucher_type === 'fixed') {
        calculatedDiscount = Math.min(voucher.discount_value, orderAmt);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        voucher: {
          _id: voucher._id,
          voucher_code: voucher.voucher_code,
          voucher_name: voucher.voucher_name,
          voucher_type: voucher.voucher_type,
          discount_value: voucher.discount_value,
          min_order_amount: voucher.min_order_amount,
          max_discount_amount: voucher.max_discount_amount,
          max_uses: voucher.max_uses,
          current_uses: currentUsageCount
        },
        validation,
        calculated_discount: calculatedDiscount
      }
    });
  });
}

module.exports = VoucherUsageController;
