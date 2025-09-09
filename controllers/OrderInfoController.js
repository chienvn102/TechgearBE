// controllers/OrderInfoController.js
// CRUD controller cho order_info collection

const { OrderInfo, Order, Customer } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

class OrderInfoController {
  // GET /api/v1/order-info - Get all order info
  static getAllOrderInfo = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { order_id, customer_id, status } = req.query;

    let query = {};
    
    if (order_id) {
      query.order_id = order_id;
    }

    if (customer_id) {
      query.customer_id = customer_id;
    }

    if (status) {
      query.of_state = { $regex: status, $options: 'i' };
    }

    const total = await OrderInfo.countDocuments(query);

    const orderInfos = await OrderInfo.find(query)
      .populate('od_id', 'od_id order_total order_datetime customer_name')
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        orderInfos,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/order-info/:id - Get order info by ID
  static getOrderInfoById = asyncHandler(async (req, res) => {
    const orderInfo = await OrderInfo.findById(req.params.id)
      .populate('order_id', 'od_id order_total order_datetime customer_name shipping_address')
      .populate('customer_id', 'c_name c_email c_phone');

    if (!orderInfo) {
      return res.status(404).json({
        success: false,
        message: 'Order info not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { orderInfo }
    });
  });

  // POST /api/v1/order-info - Create new order info
  static createOrderInfo = asyncHandler(async (req, res) => {
    const { order_id, customer_id, info_type, info_content, info_status, notes } = req.body;

    if (!order_id || !customer_id || !info_type || !info_content) {
      return res.status(400).json({
        success: false,
        message: 'Order ID, customer ID, info type, and info content are required'
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

    // Verify customer exists
    const customer = await Customer.findById(customer_id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const orderInfo = new OrderInfo({
      order_id,
      customer_id,
      info_type,
      info_content,
      info_status: info_status || 'PENDING',
      notes: notes || '',
      created_at: new Date(),
      updated_at: new Date()
    });

    await orderInfo.save();

    // Populate for response
    await orderInfo.populate('order_id', 'od_id order_total');
    await orderInfo.populate('customer_id', 'c_name c_email');

    res.status(201).json({
      success: true,
      message: 'Order info created successfully',
      data: { orderInfo }
    });
  });

  // PUT /api/v1/order-info/:id - Update order info
  static updateOrderInfo = asyncHandler(async (req, res) => {
    const { info_type, info_content, info_status, notes } = req.body;

    const orderInfo = await OrderInfo.findById(req.params.id);
    if (!orderInfo) {
      return res.status(404).json({
        success: false,
        message: 'Order info not found'
      });
    }

    // Update fields
    if (info_type) orderInfo.info_type = info_type;
    if (info_content) orderInfo.info_content = info_content;
    if (info_status) orderInfo.info_status = info_status;
    if (notes !== undefined) orderInfo.notes = notes;
    orderInfo.updated_at = new Date();

    await orderInfo.save();

    // Populate for response
    await orderInfo.populate('order_id', 'od_id order_total');
    await orderInfo.populate('customer_id', 'c_name c_email');

    res.status(200).json({
      success: true,
      message: 'Order info updated successfully',
      data: { orderInfo }
    });
  });

  // DELETE /api/v1/order-info/:id - Delete order info
  static deleteOrderInfo = asyncHandler(async (req, res) => {
    const orderInfo = await OrderInfo.findById(req.params.id);
    
    if (!orderInfo) {
      return res.status(404).json({
        success: false,
        message: 'Order info not found'
      });
    }

    await OrderInfo.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Order info deleted successfully'
    });
  });

  // GET /api/v1/order-info/order/:orderId - Get order info for specific order
  static getOrderInfoByOrder = asyncHandler(async (req, res) => {
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

    const total = await OrderInfo.countDocuments({ order_id: orderId });

    const orderInfos = await OrderInfo.find({ order_id: orderId })
      .populate('customer_id', 'c_name c_email')
      .sort({ created_at: -1 })
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
        orderInfos,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/order-info/customer/:customerId - Get order info for specific customer
  static getOrderInfoByCustomer = asyncHandler(async (req, res) => {
    const { customerId } = req.params;
    const { page, limit, skip } = req.pagination;

    // Verify customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const total = await OrderInfo.countDocuments({ customer_id: customerId });

    const orderInfos = await OrderInfo.find({ customer_id: customerId })
      .populate('order_id', 'od_id order_total order_datetime')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        customer: {
          _id: customer._id,
          c_name: customer.c_name,
          c_email: customer.c_email
        },
        orderInfos,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/order-info/statistics - Get order info statistics
  static getOrderInfoStatistics = asyncHandler(async (req, res) => {
    const totalRecords = await OrderInfo.countDocuments();

    // Status distribution
    const statusStats = await OrderInfo.aggregate([
      {
        $group: {
          _id: '$info_status',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Type distribution
    const typeStats = await OrderInfo.aggregate([
      {
        $group: {
          _id: '$info_type',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Recent info (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentInfo = await OrderInfo.countDocuments({
      created_at: { $gte: sevenDaysAgo }
    });

    // Most active customers
    const customerStats = await OrderInfo.aggregate([
      {
        $lookup: {
          from: 'customer',
          localField: 'customer_id',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: '$customer' },
      {
        $group: {
          _id: '$customer_id',
          customer_name: { $first: '$customer.c_name' },
          customer_email: { $first: '$customer.c_email' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalRecords,
        recentInfo,
        statusDistribution: statusStats,
        typeDistribution: typeStats,
        topCustomers: customerStats
      }
    });
  });

  // PUT /api/v1/order-info/:id/status - Update order info status
  static updateOrderInfoStatus = asyncHandler(async (req, res) => {
    const { info_status } = req.body;

    if (!info_status) {
      return res.status(400).json({
        success: false,
        message: 'Info status is required'
      });
    }

    const orderInfo = await OrderInfo.findById(req.params.id);
    if (!orderInfo) {
      return res.status(404).json({
        success: false,
        message: 'Order info not found'
      });
    }

    orderInfo.info_status = info_status;
    orderInfo.updated_at = new Date();

    await orderInfo.save();

    res.status(200).json({
      success: true,
      message: 'Order info status updated successfully',
      data: { orderInfo }
    });
  });
}

module.exports = OrderInfoController;
