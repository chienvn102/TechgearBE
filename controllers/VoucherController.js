// controllers/VoucherController.js
// CRUD controller cho voucher collection 

const { Voucher, VoucherUsage, Order } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

class VoucherController {
  // GET /api/v1/vouchers - Get all vouchers
  static getAllVouchers = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { search, voucher_type, is_active, min_amount } = req.query;

    let query = {};
    
    if (search) {
      query.$or = [
        { voucher_code: { $regex: search, $options: 'i' } },
        { voucher_name: { $regex: search, $options: 'i' } }
      ];
    }

    if (voucher_type) {
      query.voucher_type = voucher_type;
    }

    if (is_active !== undefined) {
      query.is_active = is_active === 'true';
    }

    if (min_amount) {
      query.min_order_amount = { $lte: parseFloat(min_amount) };
    }

    const total = await Voucher.countDocuments(query);

    const vouchers = await Voucher.find(query)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        vouchers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/vouchers/:id - Get voucher by ID
  static getVoucherById = asyncHandler(async (req, res) => {
    const voucher = await Voucher.findById(req.params.id);

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found'
      });
    }

    // Get usage statistics
    const usageCount = await VoucherUsage.countDocuments({ voucher_id: voucher._id });

    res.status(200).json({
      success: true,
      data: { 
        voucher: {
          ...voucher.toObject(),
          usage_count: usageCount,
          remaining_uses: Math.max(0, voucher.max_uses - usageCount)
        }
      }
    });
  });

  // POST /api/v1/vouchers - Create new voucher
  static createVoucher = asyncHandler(async (req, res) => {
    const {
      voucher_code,
      voucher_name,
      voucher_type,
      discount_value,
      max_discount_amount,
      min_order_amount,
      max_uses,
      start_date,
      end_date,
      is_active = true
    } = req.body;

    if (!voucher_code || !voucher_name || !voucher_type || !discount_value) {
      return res.status(400).json({
        success: false,
        message: 'Voucher code, name, type and discount value are required'
      });
    }

    // Validate voucher type
    const validTypes = ['percentage', 'fixed'];
    if (!validTypes.includes(voucher_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid voucher type. Must be percentage or fixed'
      });
    }

    // Validate percentage discount
    if (voucher_type === 'percentage' && (discount_value < 0 || discount_value > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Percentage discount must be between 0 and 100'
      });
    }

    // Check if voucher code already exists
    const existingVoucher = await Voucher.findOne({ voucher_code: voucher_code.toUpperCase() });
    if (existingVoucher) {
      return res.status(400).json({
        success: false,
        message: 'Voucher code already exists'
      });
    }

    // Validate dates
    if (start_date && end_date && new Date(start_date) >= new Date(end_date)) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date'
      });
    }

    const voucher = new Voucher({
      voucher_code: voucher_code.toUpperCase(),
      voucher_name,
      voucher_type,
      discount_value,
      max_discount_amount: max_discount_amount || null,
      min_order_amount: min_order_amount || 0,
      max_uses: max_uses || null,
      start_date: start_date ? new Date(start_date) : null,
      end_date: end_date ? new Date(end_date) : null,
      is_active,
      created_at: new Date()
    });

    await voucher.save();

    res.status(201).json({
      success: true,
      message: 'Voucher created successfully',
      data: { voucher }
    });
  });

  // PUT /api/v1/vouchers/:id - Update voucher
  static updateVoucher = asyncHandler(async (req, res) => {
    const {
      voucher_code,
      voucher_name,
      voucher_type,
      discount_value,
      max_discount_amount,
      min_order_amount,
      max_uses,
      start_date,
      end_date,
      is_active
    } = req.body;

    const voucher = await Voucher.findById(req.params.id);
    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found'
      });
    }

    // Check unique constraint if voucher_code changed
    if (voucher_code && voucher_code.toUpperCase() !== voucher.voucher_code) {
      const existingVoucher = await Voucher.findOne({ voucher_code: voucher_code.toUpperCase() });
      if (existingVoucher) {
        return res.status(400).json({
          success: false,
          message: 'Voucher code already exists'
        });
      }
    }

    // Validate voucher type if provided
    if (voucher_type) {
      const validTypes = ['percentage', 'fixed'];
      if (!validTypes.includes(voucher_type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid voucher type. Must be percentage or fixed'
        });
      }
    }

    // Validate percentage discount
    if (voucher_type === 'percentage' && discount_value && (discount_value < 0 || discount_value > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Percentage discount must be between 0 and 100'
      });
    }

    // Validate dates
    const newStartDate = start_date ? new Date(start_date) : voucher.start_date;
    const newEndDate = end_date ? new Date(end_date) : voucher.end_date;
    
    if (newStartDate && newEndDate && newStartDate >= newEndDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date'
      });
    }

    // Update fields
    if (voucher_code) voucher.voucher_code = voucher_code.toUpperCase();
    if (voucher_name) voucher.voucher_name = voucher_name;
    if (voucher_type) voucher.voucher_type = voucher_type;
    if (discount_value !== undefined) voucher.discount_value = discount_value;
    if (max_discount_amount !== undefined) voucher.max_discount_amount = max_discount_amount;
    if (min_order_amount !== undefined) voucher.min_order_amount = min_order_amount;
    if (max_uses !== undefined) voucher.max_uses = max_uses;
    if (start_date) voucher.start_date = new Date(start_date);
    if (end_date) voucher.end_date = new Date(end_date);
    if (is_active !== undefined) voucher.is_active = is_active;

    await voucher.save();

    res.status(200).json({
      success: true,
      message: 'Voucher updated successfully',
      data: { voucher }
    });
  });

  // DELETE /api/v1/vouchers/:id - Delete voucher
  static deleteVoucher = asyncHandler(async (req, res) => {
    const voucher = await Voucher.findById(req.params.id);
    
    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found'
      });
    }

    // Check if voucher has been used
    const usageCount = await VoucherUsage.countDocuments({ voucher_id: voucher._id });
    if (usageCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete voucher that has been used'
      });
    }

    await Voucher.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Voucher deleted successfully'
    });
  });

  // POST /api/v1/vouchers/validate - Validate voucher code
  static validateVoucher = asyncHandler(async (req, res) => {
    const { voucher_code, order_amount, uc_id } = req.body;

    if (!voucher_code || !order_amount) {
      return res.status(400).json({
        success: false,
        message: 'Voucher code and order amount are required'
      });
    }

    const voucher = await Voucher.findOne({ 
      voucher_code: voucher_code.toUpperCase(),
      is_active: true
    });

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or inactive voucher code'
      });
    }

    // Check if voucher is within date range
    const now = new Date();
    if (voucher.start_date && now < voucher.start_date) {
      return res.status(400).json({
        success: false,
        message: 'Voucher is not yet active'
      });
    }

    if (voucher.end_date && now > voucher.end_date) {
      return res.status(400).json({
        success: false,
        message: 'Voucher has expired'
      });
    }

    // Check minimum order amount
    if (order_amount < voucher.min_order_amount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount is ${voucher.min_order_amount}`
      });
    }

    // Check usage limit
    if (voucher.max_uses) {
      const usageCount = await VoucherUsage.countDocuments({ voucher_id: voucher._id });
      if (usageCount >= voucher.max_uses) {
        return res.status(400).json({
          success: false,
          message: 'Voucher usage limit exceeded'
        });
      }
    }

    // Check if user has already used this voucher
    if (uc_id) {
      const userUsage = await VoucherUsage.findOne({
        voucher_id: voucher._id,
        uc_id: uc_id
      });

      if (userUsage) {
        return res.status(400).json({
          success: false,
          message: 'You have already used this voucher'
        });
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (voucher.voucher_type === 'percentage') {
      discountAmount = (order_amount * voucher.discount_value) / 100;
      if (voucher.max_discount_amount && discountAmount > voucher.max_discount_amount) {
        discountAmount = voucher.max_discount_amount;
      }
    } else {
      discountAmount = voucher.discount_value;
    }

    // Ensure discount doesn't exceed order amount
    discountAmount = Math.min(discountAmount, order_amount);

    res.status(200).json({
      success: true,
      message: 'Voucher is valid',
      data: {
        voucher: {
          _id: voucher._id,
          voucher_code: voucher.voucher_code,
          voucher_name: voucher.voucher_name,
          voucher_type: voucher.voucher_type,
          discount_value: voucher.discount_value
        },
        discount_amount: Math.round(discountAmount * 100) / 100,
        final_amount: Math.round((order_amount - discountAmount) * 100) / 100
      }
    });
  });

  // POST /api/v1/vouchers/apply - Apply voucher to order (create usage record)
  static applyVoucher = asyncHandler(async (req, res) => {
    const { voucher_id, uc_id, order_id, discount_amount } = req.body;

    if (!voucher_id || !uc_id || !order_id || discount_amount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check if voucher exists
    const voucher = await Voucher.findById(voucher_id);
    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found'
      });
    }

    // Check if order exists
    const order = await Order.findById(order_id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if voucher has already been applied to this order
    const existingUsage = await VoucherUsage.findOne({
      voucher_id,
      order_id
    });

    if (existingUsage) {
      return res.status(400).json({
        success: false,
        message: 'Voucher has already been applied to this order'
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

    res.status(201).json({
      success: true,
      message: 'Voucher applied successfully',
      data: { voucherUsage }
    });
  });

  // GET /api/v1/vouchers/:id/usage - Get voucher usage history
  static getVoucherUsage = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const voucherId = req.params.id;

    const total = await VoucherUsage.countDocuments({ voucher_id: voucherId });

    const usages = await VoucherUsage.find({ voucher_id: voucherId })
      .populate('uc_id', 'uc_name uc_email')
      .populate('order_id', 'order_code order_total')
      .sort({ used_at: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        usages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/vouchers/active - Get active vouchers for customers
  static getActiveVouchers = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { min_order_amount, voucher_type } = req.query;

    const now = new Date();
    let query = {
      is_active: true,
      $or: [
        { start_date: null },
        { start_date: { $lte: now } }
      ],
      $or: [
        { end_date: null },
        { end_date: { $gte: now } }
      ]
    };

    if (min_order_amount) {
      query.min_order_amount = { $lte: parseFloat(min_order_amount) };
    }

    if (voucher_type) {
      query.voucher_type = voucher_type;
    }

    const total = await Voucher.countDocuments(query);

    const vouchers = await Voucher.find(query)
      .select('-created_at')
      .sort({ discount_value: -1 })
      .skip(skip)
      .limit(limit);

    // Add usage count and remaining uses for each voucher
    const vouchersWithUsage = await Promise.all(
      vouchers.map(async (voucher) => {
        const usageCount = await VoucherUsage.countDocuments({ voucher_id: voucher._id });
        return {
          ...voucher.toObject(),
          usage_count: usageCount,
          remaining_uses: voucher.max_uses ? Math.max(0, voucher.max_uses - usageCount) : null,
          is_available: !voucher.max_uses || usageCount < voucher.max_uses
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        vouchers: vouchersWithUsage.filter(v => v.is_available),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/vouchers/available - Get available vouchers for customer based on ranking
  static getAvailableVouchers = asyncHandler(async (req, res) => {
    if (!req.user || req.userType !== 'customer') {
      return res.status(401).json({
        success: false,
        message: 'Customer authentication required'
      });
    }

    const { page, limit, skip } = req.pagination;
    const { min_order_amount, voucher_type } = req.query;

    // Get customer ranking from user data
    const customerRanking = req.user.customer_id.ranking_id;
    if (!customerRanking) {
      return res.status(400).json({
        success: false,
        message: 'Customer ranking not found'
      });
    }

    // Build query based on customer ranking
    const now = new Date();
    let query = {
      is_active: true,
      start_date: { $lte: now },
      end_date: { $gte: now },
      $or: [
        { ranking_id: null }, // Global vouchers
        { ranking_id: customerRanking._id } // Vouchers for customer's rank
      ]
    };

    if (min_order_amount) {
      query.min_order_amount = { $lte: parseFloat(min_order_amount) };
    }

    if (voucher_type) {
      query.voucher_type = voucher_type;
    }

    const total = await Voucher.countDocuments(query);

    const vouchers = await Voucher.find(query)
      .populate('ranking_id', 'rank_id rank_name')
      .select('-created_at')
      .sort({ discount_percent: -1 })
      .skip(skip)
      .limit(limit);

    // Add usage count and availability for each voucher
    const vouchersWithUsage = await Promise.all(
      vouchers.map(async (voucher) => {
        const usageCount = await VoucherUsage.countDocuments({ voucher_id: voucher._id });
        const customerUsageCount = await VoucherUsage.countDocuments({ 
          voucher_id: voucher._id,
          user_id: req.user._id
        });
        
        return {
          ...voucher.toObject(),
          usage_count: usageCount,
          customer_usage_count: customerUsageCount,
          remaining_uses: voucher.max_uses ? Math.max(0, voucher.max_uses - usageCount) : null,
          is_available: (!voucher.max_uses || usageCount < voucher.max_uses) &&
                       (!voucher.max_uses_per_customer || customerUsageCount < voucher.max_uses_per_customer),
          applicable: true // Customer có thể sử dụng voucher này
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        vouchers: vouchersWithUsage.filter(v => v.is_available),
        customer_ranking: customerRanking,
        pagination: {
          page,
          limit,
          total: vouchersWithUsage.filter(v => v.is_available).length,
          pages: Math.ceil(vouchersWithUsage.filter(v => v.is_available).length / limit)
        }
      }
    });
  });
}

module.exports = VoucherController;
