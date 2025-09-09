// controllers/PaymentStatusController.js
// CRUD controller cho payment_status collection 

const { PaymentStatus, Order } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

class PaymentStatusController {
  // GET /api/v1/payment-status - Get all payment statuses
  static getAllPaymentStatuses = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { search, is_active } = req.query;

    let query = {};
    
    if (search) {
      query.$or = [
        { ps_name: { $regex: search, $options: 'i' } },
        { ps_description: { $regex: search, $options: 'i' } }
      ];
    }

    if (is_active !== undefined) {
      query.is_active = is_active === 'true';
    }

    const total = await PaymentStatus.countDocuments(query);

    const paymentStatuses = await PaymentStatus.find(query)
      .sort({ ps_id: 1 })
      .skip(skip)
      .limit(limit);

    // Add order count for each status
    const statusesWithCount = await Promise.all(
      paymentStatuses.map(async (status) => {
        const orderCount = await Order.countDocuments({ payment_status_id: status._id });
        return {
          ...status.toObject(),
          order_count: orderCount
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        paymentStatuses: statusesWithCount,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/payment-status/:id - Get payment status by ID
  static getPaymentStatusById = asyncHandler(async (req, res) => {
    const paymentStatus = await PaymentStatus.findById(req.params.id);

    if (!paymentStatus) {
      return res.status(404).json({
        success: false,
        message: 'Payment status not found'
      });
    }

    // Get order count
    const orderCount = await Order.countDocuments({ payment_status_id: paymentStatus._id });

    res.status(200).json({
      success: true,
      data: { 
        paymentStatus: {
          ...paymentStatus.toObject(),
          order_count: orderCount
        }
      }
    });
  });

  // POST /api/v1/payment-status - Create new payment status
  static createPaymentStatus = asyncHandler(async (req, res) => {
    const { ps_id, ps_name, ps_description, color_code, is_active = true } = req.body;

    if (!ps_id || !ps_name) {
      return res.status(400).json({
        success: false,
        message: 'Payment status ID and name are required'
      });
    }

    // Check if ps_id already exists
    const existingStatusById = await PaymentStatus.findOne({ ps_id });
    if (existingStatusById) {
      return res.status(400).json({
        success: false,
        message: 'Payment status ID already exists'
      });
    }

    // Check if ps_name already exists
    const existingStatusByName = await PaymentStatus.findOne({ ps_name });
    if (existingStatusByName) {
      return res.status(400).json({
        success: false,
        message: 'Payment status name already exists'
      });
    }

    const paymentStatus = new PaymentStatus({
      ps_id,
      ps_name,
      ps_description: ps_description || '',
      color_code: color_code || '#000000',
      is_active,
      created_at: new Date()
    });

    await paymentStatus.save();

    res.status(201).json({
      success: true,
      message: 'Payment status created successfully',
      data: { paymentStatus }
    });
  });

  // PUT /api/v1/payment-status/:id - Update payment status
  static updatePaymentStatus = asyncHandler(async (req, res) => {
    const { ps_id, ps_name, ps_description, color_code, is_active } = req.body;

    const paymentStatus = await PaymentStatus.findById(req.params.id);
    if (!paymentStatus) {
      return res.status(404).json({
        success: false,
        message: 'Payment status not found'
      });
    }

    // Check unique constraints if changed
    if (ps_id && ps_id !== paymentStatus.ps_id) {
      const existingStatus = await PaymentStatus.findOne({ ps_id });
      if (existingStatus) {
        return res.status(400).json({
          success: false,
          message: 'Payment status ID already exists'
        });
      }
    }

    if (ps_name && ps_name !== paymentStatus.ps_name) {
      const existingStatus = await PaymentStatus.findOne({ ps_name });
      if (existingStatus) {
        return res.status(400).json({
          success: false,
          message: 'Payment status name already exists'
        });
      }
    }

    // Update fields
    if (ps_id) paymentStatus.ps_id = ps_id;
    if (ps_name) paymentStatus.ps_name = ps_name;
    if (ps_description !== undefined) paymentStatus.ps_description = ps_description;
    if (color_code) paymentStatus.color_code = color_code;
    if (is_active !== undefined) paymentStatus.is_active = is_active;

    await paymentStatus.save();

    res.status(200).json({
      success: true,
      message: 'Payment status updated successfully',
      data: { paymentStatus }
    });
  });

  // DELETE /api/v1/payment-status/:id - Delete payment status
  static deletePaymentStatus = asyncHandler(async (req, res) => {
    const paymentStatus = await PaymentStatus.findById(req.params.id);
    
    if (!paymentStatus) {
      return res.status(404).json({
        success: false,
        message: 'Payment status not found'
      });
    }

    // Check if payment status has orders
    const orderCount = await Order.countDocuments({ payment_status_id: paymentStatus._id });
    if (orderCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete payment status that has orders'
      });
    }

    await PaymentStatus.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Payment status deleted successfully'
    });
  });

  // GET /api/v1/payment-status/:id/orders - Get orders with specific payment status
  static getPaymentStatusOrders = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;

    const paymentStatus = await PaymentStatus.findById(req.params.id);
    if (!paymentStatus) {
      return res.status(404).json({
        success: false,
        message: 'Payment status not found'
      });
    }

    const total = await Order.countDocuments({ payment_status_id: paymentStatus._id });

    const orders = await Order.find({ payment_status_id: paymentStatus._id })
      .populate('customer_id', 'c_name c_email')
      .populate('pm_id', 'pm_name')
      .sort({ order_datetime: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        paymentStatus,
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/payment-status/active - Get only active payment statuses
  static getActivePaymentStatuses = asyncHandler(async (req, res) => {
    const paymentStatuses = await PaymentStatus.find({ is_active: true })
      .select('ps_id ps_name ps_description color_code')
      .sort({ ps_id: 1 });

    res.status(200).json({
      success: true,
      data: { paymentStatuses }
    });
  });

  // GET /api/v1/payment-status/statistics - Get payment status statistics
  static getPaymentStatusStatistics = asyncHandler(async (req, res) => {
    const totalStatuses = await PaymentStatus.countDocuments();
    const activeStatuses = await PaymentStatus.countDocuments({ is_active: true });

    // Payment status distribution
    const statusDistribution = await Order.aggregate([
      {
        $lookup: {
          from: 'payment_status',
          localField: 'payment_status_id',
          foreignField: '_id',
          as: 'payment_status'
        }
      },
      { $unwind: '$payment_status' },
      {
        $group: {
          _id: '$payment_status_id',
          status_name: { $first: '$payment_status.ps_name' },
          status_id: { $first: '$payment_status.ps_id' },
          color_code: { $first: '$payment_status.color_code' },
          order_count: { $sum: 1 },
          total_amount: { $sum: '$order_total' }
        }
      },
      { $sort: { order_count: -1 } }
    ]);

    // Payment trend (last 30 days by status)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const paymentTrend = await Order.aggregate([
      {
        $match: {
          order_datetime: { $gte: thirtyDaysAgo }
        }
      },
      {
        $lookup: {
          from: 'payment_status',
          localField: 'payment_status_id',
          foreignField: '_id',
          as: 'payment_status'
        }
      },
      { $unwind: '$payment_status' },
      {
        $group: {
          _id: {
            year: { $year: '$order_datetime' },
            month: { $month: '$order_datetime' },
            day: { $dayOfMonth: '$order_datetime' },
            status: '$payment_status.ps_name'
          },
          count: { $sum: 1 },
          total_amount: { $sum: '$order_total' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalStatuses,
        activeStatuses,
        statusDistribution,
        paymentTrend
      }
    });
  });

  // PUT /api/v1/payment-status/:id/toggle-status - Toggle payment status active state
  static togglePaymentStatusStatus = asyncHandler(async (req, res) => {
    const paymentStatus = await PaymentStatus.findById(req.params.id);
    
    if (!paymentStatus) {
      return res.status(404).json({
        success: false,
        message: 'Payment status not found'
      });
    }

    paymentStatus.is_active = !paymentStatus.is_active;
    await paymentStatus.save();

    res.status(200).json({
      success: true,
      message: `Payment status ${paymentStatus.is_active ? 'activated' : 'deactivated'} successfully`,
      data: { paymentStatus }
    });
  });
}

module.exports = PaymentStatusController;
