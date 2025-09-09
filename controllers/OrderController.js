// controllers/OrderController.js
// CRUD controller cho order collection 

const { Order, ProductOrder, Customer, PaymentMethod, PaymentStatus, Voucher, Product, OrderInfo, VoucherUsage, UserCustomer } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

class OrderController {
  // GET /api/v1/orders - Get all orders with advanced filtering
  static getAllOrders = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { search, customer_id, payment_status_id, pm_id, start_date, end_date } = req.query;

    // Build query object
    let query = {};
    
    if (search) {
      query.$or = [
        { od_id: { $regex: search, $options: 'i' } },
        { customer_name: { $regex: search, $options: 'i' } }
      ];
    }

    if (customer_id) query.customer_id = customer_id;
    if (payment_status_id) query.payment_status_id = payment_status_id;
    if (pm_id) query.pm_id = pm_id;

    // Date range filter
    if (start_date || end_date) {
      query.order_datetime = {};
      if (start_date) query.order_datetime.$gte = new Date(start_date);
      if (end_date) query.order_datetime.$lte = new Date(end_date);
    }

    // Get total count for pagination
    const total = await Order.countDocuments(query);

    // Get orders with all references populated theo README_MongoDB.md
    const orders = await Order.find(query)
      .populate('customer_id', 'customer_id name email phone_number')
      .populate('po_id', 'po_id pd_id po_quantity po_price')
      .populate('pm_id', 'pm_id pm_name pm_img')
      .populate('payment_status_id', 'ps_id ps_name ps_description')
      .populate('voucher_id', 'voucher_id voucher_code voucher_name discount_percent')
      .sort({ order_datetime: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
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

  // GET /api/v1/orders/:id - Get order by ID
  static getOrderById = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id)
      .populate('customer_id', 'customer_id name email phone_number')
      .populate('po_id', 'po_id pd_id po_quantity po_price')
      .populate('pm_id', 'pm_id pm_name pm_img')
      .populate('payment_status_id', 'ps_id ps_name ps_description')
      .populate('voucher_id', 'voucher_id voucher_code voucher_name discount_percent');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { order }
    });
  });

  // GET /api/v1/orders/my-orders - Get orders for the logged in customer
  static getMyOrders = asyncHandler(async (req, res) => {
    if (!req.user || req.userType !== 'customer') {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { page, limit, skip } = req.pagination;
    
    // Get customer ID from user
    const customerId = req.user.customer_id._id;

    // Build query object
    let query = { customer_id: customerId };

    // Get total count for pagination
    const total = await Order.countDocuments(query);

    // Get orders with all references populated
    const orders = await Order.find(query)
      .populate('po_id', 'po_id pd_id po_quantity po_price')
      .populate('pm_id', 'pm_id pm_name pm_img')
      .populate('payment_status_id', 'ps_id ps_name ps_description')
      .populate('voucher_id', 'voucher_id voucher_code voucher_name discount_percent')
      .sort({ order_datetime: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
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

  // GET /api/v1/orders/customer/:customerId - Get orders by customer
  static getOrdersByCustomer = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const customerId = req.params.customerId;

    // Find customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Build query object
    let query = { customer_id: customerId };

    // Get total count for pagination
    const total = await Order.countDocuments(query);

    // Get orders with all references populated
    const orders = await Order.find(query)
      .populate('po_id', 'po_id pd_id po_quantity po_price')
      .populate('pm_id', 'pm_id pm_name pm_img')
      .populate('payment_status_id', 'ps_id ps_name ps_description')
      .populate('voucher_id', 'voucher_id voucher_code voucher_name discount_percent')
      .sort({ order_datetime: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
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

  // POST /api/v1/orders - Create new order
  static createOrder = asyncHandler(async (req, res) => {
    const {
      od_id, po_id, customer_id, customer_name, shipping_address,
      pm_id, order_note, voucher_id, payment_status_id, order_total
    } = req.body;

    // Validate required fields theo schema
    if (!od_id || !po_id || !customer_id || !customer_name || 
        !shipping_address || !pm_id || !payment_status_id || order_total === undefined) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // Check unique constraint
    const existingOrder = await Order.findOne({ od_id });
    if (existingOrder) {
      return res.status(400).json({
        success: false,
        message: 'Order ID already exists'
      });
    }

    // Validate foreign key references
    const customer = await Customer.findById(customer_id);
    if (!customer) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID'
      });
    }

    const productOrder = await ProductOrder.findById(po_id);
    if (!productOrder) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product order ID'
      });
    }

    const paymentMethod = await PaymentMethod.findById(pm_id);
    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method ID'
      });
    }

    const paymentStatus = await PaymentStatus.findById(payment_status_id);
    if (!paymentStatus) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status ID'
      });
    }

    // Validate voucher if provided
    let voucher = null;
    if (voucher_id) {
      voucher = await Voucher.findById(voucher_id);
      if (!voucher) {
        return res.status(400).json({
          success: false,
          message: 'Invalid voucher ID'
        });
      }

      // Check voucher validity
      const now = new Date();
      if (voucher.start_date > now || voucher.end_date < now) {
        return res.status(400).json({
          success: false,
          message: 'Voucher is not valid'
        });
      }

      if (!voucher.is_active) {
        return res.status(400).json({
          success: false,
          message: 'Voucher is not active'
        });
      }

      if (voucher.current_uses >= voucher.max_uses) {
        return res.status(400).json({
          success: false,
          message: 'Voucher usage limit exceeded'
        });
      }
    }

    // Check product availability
    const product = await Product.findById(productOrder.pd_id);
    if (!product) {
      return res.status(400).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (!product.is_available) {
      return res.status(400).json({
        success: false,
        message: 'Product is not available'
      });
    }

    if (product.stock_quantity < productOrder.po_quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock'
      });
    }

    // Create order
    const order = new Order({
      od_id,
      po_id,
      customer_id,
      customer_name,
      shipping_address,
      order_datetime: new Date(),
      pm_id,
      order_note,
      voucher_id,
      payment_status_id,
      order_total
    });

    await order.save();

    // Update product stock
    product.stock_quantity -= productOrder.po_quantity;
    product.pd_quantity = product.stock_quantity; // Sync theo schema
    await product.save();

    // Update voucher usage if used
    if (voucher) {
      voucher.current_uses += 1;
      await voucher.save();

      // Create voucher usage record
      const voucherUsage = new VoucherUsage({
        usage_id: `USAGE_${Date.now()}`,
        voucher_id: voucher._id,
        order_id: order._id,
        user_id: req.user ? req.user._id : null,
        discount_applied: voucher.discount_amount
      });
      await voucherUsage.save();
    }

    // Create order info with initial status
    const orderInfo = new OrderInfo({
      oi_id: `OI_${Date.now()}`,
      od_id: order._id,
      of_state: 'PENDING'
    });
    await orderInfo.save();

    // Populate references for response
    await order.populate([
      { path: 'customer_id', select: 'customer_id name email' },
      { path: 'po_id', select: 'po_id pd_id po_quantity po_price' },
      { path: 'pm_id', select: 'pm_id pm_name' },
      { path: 'payment_status_id', select: 'ps_id ps_name' },
      { path: 'voucher_id', select: 'voucher_id voucher_code' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: { 
        order,
        orderInfo
      }
    });
  });

  // PUT /api/v1/orders/:id - Update order
  static updateOrder = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const updateData = { ...req.body };
    
    // Check unique constraint if od_id changed
    if (updateData.od_id && updateData.od_id !== order.od_id) {
      const existingOrder = await Order.findOne({ od_id: updateData.od_id });
      if (existingOrder) {
        return res.status(400).json({
          success: false,
          message: 'Order ID already exists'
        });
      }
    }

    // Validate foreign keys if provided
    if (updateData.customer_id && updateData.customer_id !== order.customer_id.toString()) {
      const customer = await Customer.findById(updateData.customer_id);
      if (!customer) {
        return res.status(400).json({
          success: false,
          message: 'Invalid customer ID'
        });
      }
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'customer_id', select: 'customer_id name email' },
      { path: 'po_id', select: 'po_id pd_id po_quantity po_price' },
      { path: 'pm_id', select: 'pm_id pm_name' },
      { path: 'payment_status_id', select: 'ps_id ps_name' },
      { path: 'voucher_id', select: 'voucher_id voucher_code' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data: { order: updatedOrder }
    });
  });

  // PUT /api/v1/orders/:id/status - Update order status
  static updateOrderStatus = asyncHandler(async (req, res) => {
    const { of_state } = req.body;

    if (!of_state) {
      return res.status(400).json({
        success: false,
        message: 'Order state is required'
      });
    }

    const validStates = ['PENDING', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED'];
    if (!validStates.includes(of_state)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order state'
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update order info
    const orderInfo = await OrderInfo.findOneAndUpdate(
      { od_id: order._id },
      { of_state },
      { new: true }
    );

    if (!orderInfo) {
      return res.status(404).json({
        success: false,
        message: 'Order info not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: { orderInfo }
    });
  });

  // DELETE /api/v1/orders/:id - Delete order
  static deleteOrder = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Delete related records
    await OrderInfo.deleteOne({ od_id: order._id });
    await VoucherUsage.deleteMany({ order_id: order._id });

    await Order.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully'
    });
  });

  // Các method khác giữ nguyên...
}

module.exports = OrderController;
