// controllers/OrderPaymentLogController.js
// CRUD controller cho order_payment_log collection 

const { OrderPaymentLog, Order, PaymentMethod } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

class OrderPaymentLogController {
  // GET /api/v1/order-payment-logs - Get all order payment logs
  static getAllOrderPaymentLogs = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { order_id, payment_method_id, status, start_date, end_date } = req.query;

    let query = {};
    
    if (order_id) {
      query.order_id = order_id;
    }

    if (payment_method_id) {
      query.payment_method_id = payment_method_id;
    }

    if (status) {
      query.payment_status = { $regex: status, $options: 'i' };
    }

    if (start_date || end_date) {
      query.payment_datetime = {};
      if (start_date) query.payment_datetime.$gte = new Date(start_date);
      if (end_date) query.payment_datetime.$lte = new Date(end_date);
    }

    const total = await OrderPaymentLog.countDocuments(query);

    const paymentLogs = await OrderPaymentLog.find(query)
      .populate('order_id', 'od_id order_total customer_name')
      .populate('payment_method_id', 'pm_name pm_description')
      .sort({ payment_datetime: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        paymentLogs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/order-payment-logs/:id - Get order payment log by ID
  static getOrderPaymentLogById = asyncHandler(async (req, res) => {
    const paymentLog = await OrderPaymentLog.findById(req.params.id)
      .populate('order_id', 'od_id order_total customer_name shipping_address')
      .populate('payment_method_id', 'pm_name pm_description');

    if (!paymentLog) {
      return res.status(404).json({
        success: false,
        message: 'Order payment log not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { paymentLog }
    });
  });

  // POST /api/v1/order-payment-logs - Create new order payment log
  static createOrderPaymentLog = asyncHandler(async (req, res) => {
    const { 
      order_id, 
      payment_method_id, 
      payment_amount, 
      payment_status, 
      transaction_id, 
      gateway_response, 
      notes 
    } = req.body;

    if (!order_id || !payment_method_id || !payment_amount || !payment_status) {
      return res.status(400).json({
        success: false,
        message: 'Order ID, payment method ID, payment amount, and payment status are required'
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

    // Verify payment method exists
    const paymentMethod = await PaymentMethod.findById(payment_method_id);
    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    // Validate payment amount
    if (payment_amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than 0'
      });
    }

    const paymentLog = new OrderPaymentLog({
      order_id,
      payment_method_id,
      payment_amount,
      payment_status,
      transaction_id: transaction_id || null,
      gateway_response: gateway_response || null,
      notes: notes || '',
      payment_datetime: new Date(),
      created_at: new Date()
    });

    await paymentLog.save();

    // Populate for response
    await paymentLog.populate('order_id', 'od_id order_total customer_name');
    await paymentLog.populate('payment_method_id', 'pm_name');

    res.status(201).json({
      success: true,
      message: 'Order payment log created successfully',
      data: { paymentLog }
    });
  });

  // PUT /api/v1/order-payment-logs/:id - Update order payment log
  static updateOrderPaymentLog = asyncHandler(async (req, res) => {
    const { payment_status, transaction_id, gateway_response, notes } = req.body;

    const paymentLog = await OrderPaymentLog.findById(req.params.id);
    if (!paymentLog) {
      return res.status(404).json({
        success: false,
        message: 'Order payment log not found'
      });
    }

    // Update fields
    if (payment_status) paymentLog.payment_status = payment_status;
    if (transaction_id !== undefined) paymentLog.transaction_id = transaction_id;
    if (gateway_response !== undefined) paymentLog.gateway_response = gateway_response;
    if (notes !== undefined) paymentLog.notes = notes;

    await paymentLog.save();

    // Populate for response
    await paymentLog.populate('order_id', 'od_id order_total customer_name');
    await paymentLog.populate('payment_method_id', 'pm_name');

    res.status(200).json({
      success: true,
      message: 'Order payment log updated successfully',
      data: { paymentLog }
    });
  });

  // DELETE /api/v1/order-payment-logs/:id - Delete order payment log
  static deleteOrderPaymentLog = asyncHandler(async (req, res) => {
    const paymentLog = await OrderPaymentLog.findById(req.params.id);
    
    if (!paymentLog) {
      return res.status(404).json({
        success: false,
        message: 'Order payment log not found'
      });
    }

    await OrderPaymentLog.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Order payment log deleted successfully'
    });
  });

  // GET /api/v1/order-payment-logs/order/:orderId - Get payment logs for specific order
  static getPaymentLogsByOrder = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const { page, limit, skip } = req.pagination;

    // Verify order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const total = await OrderPaymentLog.countDocuments({ order_id: orderId });

    const paymentLogs = await OrderPaymentLog.find({ order_id: orderId })
      .populate('payment_method_id', 'pm_name pm_description')
      .sort({ payment_datetime: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        order: {
          _id: order._id,
          od_id: order.od_id,
          order_total: order.order_total,
          customer_name: order.customer_name
        },
        paymentLogs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/order-payment-logs/statistics - Get payment log statistics
  static getPaymentLogStatistics = asyncHandler(async (req, res) => {
    const totalLogs = await OrderPaymentLog.countDocuments();

    // Payment status distribution
    const statusStats = await OrderPaymentLog.aggregate([
      {
        $group: {
          _id: '$payment_status',
          count: { $sum: 1 },
          total_amount: { $sum: '$payment_amount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Payment method distribution
    const methodStats = await OrderPaymentLog.aggregate([
      {
        $lookup: {
          from: 'payment_method',
          localField: 'payment_method_id',
          foreignField: '_id',
          as: 'payment_method'
        }
      },
      { $unwind: '$payment_method' },
      {
        $group: {
          _id: '$payment_method_id',
          payment_method_name: { $first: '$payment_method.pm_name' },
          count: { $sum: 1 },
          total_amount: { $sum: '$payment_amount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Daily payment volume (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dailyVolume = await OrderPaymentLog.aggregate([
      {
        $match: {
          payment_datetime: { $gte: thirtyDaysAgo },
          payment_status: 'SUCCESS'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$payment_datetime' },
            month: { $month: '$payment_datetime' },
            day: { $dayOfMonth: '$payment_datetime' }
          },
          count: { $sum: 1 },
          total_amount: { $sum: '$payment_amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Failed payments (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const failedPayments = await OrderPaymentLog.countDocuments({
      payment_datetime: { $gte: sevenDaysAgo },
      payment_status: { $in: ['FAILED', 'CANCELLED', 'TIMEOUT'] }
    });

    // Total successful payment amount
    const totalSuccessAmount = await OrderPaymentLog.aggregate([
      {
        $match: { payment_status: 'SUCCESS' }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$payment_amount' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalLogs,
        failedPayments,
        totalSuccessAmount: totalSuccessAmount[0]?.total || 0,
        statusDistribution: statusStats,
        methodDistribution: methodStats,
        dailyVolume
      }
    });
  });

  // GET /api/v1/order-payment-logs/failed - Get failed payment logs
  static getFailedPaymentLogs = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;

    const query = {
      payment_status: { $in: ['FAILED', 'CANCELLED', 'TIMEOUT', 'ERROR'] }
    };

    const total = await OrderPaymentLog.countDocuments(query);

    const paymentLogs = await OrderPaymentLog.find(query)
      .populate('order_id', 'od_id order_total customer_name')
      .populate('payment_method_id', 'pm_name')
      .sort({ payment_datetime: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        paymentLogs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // PUT /api/v1/order-payment-logs/:id/retry - Retry failed payment
  static retryPayment = asyncHandler(async (req, res) => {
    const paymentLog = await OrderPaymentLog.findById(req.params.id);
    
    if (!paymentLog) {
      return res.status(404).json({
        success: false,
        message: 'Order payment log not found'
      });
    }

    if (!['FAILED', 'CANCELLED', 'TIMEOUT', 'ERROR'].includes(paymentLog.payment_status)) {
      return res.status(400).json({
        success: false,
        message: 'Can only retry failed payments'
      });
    }

    // Create new payment log for retry
    const retryLog = new OrderPaymentLog({
      order_id: paymentLog.order_id,
      payment_method_id: paymentLog.payment_method_id,
      payment_amount: paymentLog.payment_amount,
      payment_status: 'PENDING',
      notes: `Retry of payment log ${paymentLog._id}`,
      payment_datetime: new Date(),
      created_at: new Date()
    });

    await retryLog.save();

    await retryLog.populate('order_id', 'od_id order_total customer_name');
    await retryLog.populate('payment_method_id', 'pm_name');

    res.status(201).json({
      success: true,
      message: 'Payment retry initiated successfully',
      data: { paymentLog: retryLog }
    });
  });
}

module.exports = OrderPaymentLogController;
