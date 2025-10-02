// controllers/OrderController.js
// CRUD controller cho order collection 

const { Order, ProductOrder, Customer, PaymentMethod, PaymentStatus, Voucher, Product, OrderInfo, VoucherUsage, UserCustomer, CustomerRanking, Ranking } = require('../models');
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
      .populate('voucher_id', 'voucher_id voucher_code voucher_name discount_percent discount_amount max_discount_amount')
      .sort({ order_datetime: -1 })
      .skip(skip)
      .limit(limit);

    // Populate order_info for each order để hiển thị trạng thái đơn hàng
    const ordersWithInfo = await Promise.all(
      orders.map(async (order) => {
        const orderInfo = await OrderInfo.findOne({ od_id: order._id }).select('oi_id of_state');
        return {
          ...order.toObject(),
          order_info: orderInfo
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        orders: ordersWithInfo,
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
    console.log('🔍 OrderController.getOrderById called with:', req.params.id);
    
    let order;
    
    // Check if the ID is a valid ObjectId format (24 hex characters)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
    
    if (isValidObjectId) {
      console.log('🔍 ID is valid ObjectId format, trying findById');
      order = await Order.findById(req.params.id);
    } else {
      console.log('🔍 ID is not ObjectId format, trying findOne by od_id (SKU)');
      order = await Order.findOne({ od_id: req.params.id });
    }
    
    if (!order) {
      console.log('❌ Order not found');
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    console.log('✅ Order found:', order.od_id);
    console.log('🔍 Order before populate:', {
      _id: order._id,
      od_id: order.od_id,
      po_id: order.po_id,
      customer_id: order.customer_id,
      order_total: order.order_total
    });
    
    // Populate the order with all references
    order = await Order.findById(order._id)
      .populate('customer_id', 'customer_id customer_name email phone_number')
      .populate({
        path: 'po_id',
        select: 'po_id pd_id po_quantity po_price',
        populate: {
          path: 'pd_id',
          select: 'pd_id pd_name pd_price pd_quantity pd_description',
          populate: [
            {
              path: 'br_id',
              select: 'br_id br_name'
            },
            {
              path: 'pdt_id',
              select: 'pdt_id pdt_name'
            },
            {
              path: 'category_id',
              select: 'cg_id cg_name'
            },
          ]
        }
      })
      .populate('pm_id', 'pm_id pm_name pm_img')
      .populate('payment_status_id', 'ps_id ps_name ps_description')
      .populate('voucher_id', 'voucher_id voucher_code voucher_name discount_percent discount_amount max_discount_amount');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Manually populate product images
    if (order.po_id && order.po_id.length > 0) {
      for (let i = 0; i < order.po_id.length; i++) {
        const productOrder = order.po_id[i];
        if (productOrder.pd_id && productOrder.pd_id._id) {
          const ProductImage = require('../models/ProductImage');
          const images = await ProductImage.find({ pd_id: productOrder.pd_id._id });
          productOrder.pd_id.images = images;
        }
      }
    }

    console.log('🔍 Order after populate:', {
      _id: order._id,
      od_id: order.od_id,
      po_id: order.po_id,
      customer_id: order.customer_id,
      order_total: order.order_total,
      po_id_type: Array.isArray(order.po_id) ? 'array' : 'single',
      po_id_length: Array.isArray(order.po_id) ? order.po_id.length : 1
    });

    // Get order_info để hiển thị trạng thái đơn hàng
    const orderInfo = await OrderInfo.findOne({ od_id: order._id }).select('oi_id of_state');
    
    // Get product images for all products in the order
    let productImages = [];
    let productOrders = [];
    
    // Handle both single product and multiple products
    if (order.po_id) {
      if (Array.isArray(order.po_id)) {
        productOrders = order.po_id;
        console.log('🔍 Processing product images for', order.po_id.length, 'products (array)');
      } else {
        productOrders = [order.po_id];
        console.log('🔍 Processing product images for 1 product (single object)');
      }
      
      const ProductImage = require('../models/ProductImage');
      for (const productOrder of productOrders) {
        console.log('🔍 ProductOrder:', {
          po_id: productOrder.po_id,
          pd_id: productOrder.pd_id,
          po_quantity: productOrder.po_quantity,
          po_price: productOrder.po_price
        });
        if (productOrder.pd_id && productOrder.pd_id._id) {
          const images = await ProductImage.find({ 
            pd_id: productOrder.pd_id._id,
            is_primary: true 
          }).select('img cloudinary_secure_url storage_type');
          console.log('🔍 Found', images.length, 'images for product', productOrder.pd_id._id);
          productImages.push(...images);
        }
      }
    } else {
      console.log('🔍 No po_id found');
    }
    
    // Calculate ranking discount for display (for old orders that don't have it stored)
    let rankingDiscount = 0;
    if (order.customer_id && typeof order.customer_id === 'object') {
      try {
        const CustomerRanking = require('../models/CustomerRanking');
        const customerRanking = await CustomerRanking.findOne({ 
          customer_id: order.customer_id._id 
        }).populate('rank_id');
        
        if (customerRanking && customerRanking.rank_id.discount_percent > 0) {
          // Calculate subtotal from product orders
          const subtotal = productOrders.reduce((sum, po) => sum + (po.po_price * po.po_quantity), 0);
          rankingDiscount = Math.round((subtotal * customerRanking.rank_id.discount_percent) / 100);
        }
      } catch (error) {
        console.log('⚠️ Could not calculate ranking discount:', error.message);
      }
    }

    const orderWithInfo = {
      ...order.toObject(),
      order_info: orderInfo,
      product_images: productImages,
      ranking_discount: rankingDiscount
    };

    console.log('🔍 OrderController.getOrderById response:', {
      od_id: orderWithInfo.od_id,
      customer_name: orderWithInfo.customer_name,
      order_total: orderWithInfo.order_total,
      po_id_count: productOrders.length,
      product_images_count: productImages.length
    });

    res.status(200).json({
      success: true,
      data: orderWithInfo
    });
  });

  // GET /api/v1/orders/my-orders - Get orders for the logged in customer
  static getMyOrders = asyncHandler(async (req, res) => {
    console.log('🔍 getMyOrders called');
    console.log('- req.user:', req.user ? 'exists' : 'null');
    console.log('- req.userType:', req.userType);
    console.log('- req.user.customer_id:', req.user?.customer_id ? 'exists' : 'null');
    
    if (!req.user || req.userType !== 'customer') {
      console.log('❌ Authentication failed:', {
        hasUser: !!req.user,
        userType: req.userType
      });
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { page, limit, skip } = req.pagination;
    const { search } = req.query;
    
    // Get customer ID from user
    const customerId = req.user.customer_id._id;
    console.log('🔍 Customer ID:', customerId);
    console.log('🔍 Search query:', search);

    // Build query object
    let query = { customer_id: customerId };
    
    // Add search functionality
    if (search) {
      // Search by product name through populated po_id.pd_id.pd_name
      query = {
        ...query,
        'po_id.pd_id.pd_name': { $regex: search, $options: 'i' }
      };
    }

    // Get total count for pagination
    const total = await Order.countDocuments(query);
    console.log('🔍 Total orders found:', total);

    // Get orders with all references populated
    const orders = await Order.find(query)
      .populate({
        path: 'po_id',
        select: 'po_id pd_id po_quantity po_price',
        populate: {
          path: 'pd_id',
          select: 'pd_id pd_name pd_price br_id',
          populate: {
            path: 'br_id',
            select: 'br_id br_name'
          }
        }
      })
      .populate('pm_id', 'pm_id pm_name pm_img')
      .populate('payment_status_id', 'ps_id ps_name ps_description')
      .populate('voucher_id', 'voucher_id voucher_code voucher_name discount_percent discount_amount max_discount_amount')
      .sort({ order_datetime: -1 })
      .skip(skip)
      .limit(limit);

    // Manually populate product images for all orders
    for (const order of orders) {
      if (order.po_id && order.po_id.length > 0) {
        for (let i = 0; i < order.po_id.length; i++) {
          const productOrder = order.po_id[i];
          if (productOrder.pd_id && productOrder.pd_id._id) {
            const ProductImage = require('../models/ProductImage');
            const images = await ProductImage.find({ pd_id: productOrder.pd_id._id });
            productOrder.pd_id.images = images;
          }
        }
      }
    }

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
      .populate('voucher_id', 'voucher_id voucher_code voucher_name discount_percent discount_amount max_discount_amount')
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
      of_state: 'ORDER_SUCCESS'
    });
    await orderInfo.save();

    // Update customer total spending and ranking
    await updateCustomerSpendingAndRanking(customer._id, order_total);

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

    const validStates = ['ORDER_SUCCESS', 'TRANSFER_TO_SHIPPING', 'SHIPPING', 'DELIVERED', 'CANCELLED'];
    if (!validStates.includes(of_state)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order state. Valid states are: ' + validStates.join(', ')
      });
    }

    const order = await Order.findById(req.params.id)
      .populate('customer_id', 'customer_id name email');
    
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

    // Create notification for order status change
    const NotificationControllerV2 = require('./NotificationControllerV2');
    
    let notificationType = null;
    switch (of_state) {
      case 'ORDER_SUCCESS':
        notificationType = 'CONFIRMED';
        break;
      case 'TRANSFER_TO_SHIPPING':
      case 'SHIPPING':
        notificationType = 'SHIPPED';
        break;
      case 'DELIVERED':
        notificationType = 'DELIVERED';
        break;
      case 'CANCELLED':
        notificationType = 'CANCELLED';
        break;
    }

    if (notificationType && order.customer_id) {
      await NotificationControllerV2.createOrderStatusNotification(
        order._id,
        order.customer_id._id,
        notificationType,
        {
          od_id: order.od_id,
          order_total: order.order_total
        }
      );
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

  // POST /api/v1/orders/checkout - Create order from cart (multiple products)
  static createOrderFromCart = asyncHandler(async (req, res) => {
    try {
      console.log('🛒 OrderController.createOrderFromCart called');
      console.log('🛒 Request body:', req.body);
      console.log('🛒 Request headers:', req.headers);
      console.log('🛒 User from auth:', req.user);

      const {
        customer_name,
        phone_number,
        email,
        shipping_address,
        payment_method_id,
        order_note,
        items,
        voucher_code // Thêm voucher_code
      } = req.body;

      console.log('🛒 Creating order from cart:', { customer_name, items: items.length, voucher_code });

      // Validate payment method
      console.log('🔍 Looking for payment method:', payment_method_id);
      const paymentMethod = await PaymentMethod.findById(payment_method_id);
      console.log('🔍 Payment method found:', paymentMethod);
      if (!paymentMethod) {
        console.log('❌ Payment method not found');
        return res.status(400).json({
          success: false,
          message: 'Payment method not found'
        });
      }

      // Get default payment status (PENDING)
      console.log('🔍 Looking for payment status: PENDING');
      const pendingPaymentStatus = await PaymentStatus.findOne({ ps_id: 'PENDING' });
      console.log('🔍 Payment status found:', pendingPaymentStatus);
      if (!pendingPaymentStatus) {
        console.log('❌ Payment status not found');
        return res.status(500).json({
          success: false,
          message: 'Default payment status not found'
        });
      }

      // Generate unique order ID
      const od_id = `OD_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Validate all products and check stock
      const productOrders = [];
      let subtotal = 0;

      for (const item of items) {
        console.log('🔍 Processing item:', item);
        
        let product;
        
        // First try to find product by _id (ObjectId) if it exists
        if (item._id && /^[0-9a-fA-F]{24}$/.test(item._id)) {
          product = await Product.findById(item._id);
          console.log('🔍 Product by _id (ObjectId):', product);
        }
        
        // If not found by _id, try by pd_id (SKU)
        if (!product && item.pd_id) {
          product = await Product.findOne({ pd_id: item.pd_id });
          console.log('🔍 Product by pd_id (SKU):', product);
        }
        
        if (!product) {
          console.log('❌ Product not found:', item.pd_id);
          return res.status(400).json({
            success: false,
            message: `Product ${item.pd_id} not found`
          });
        }

        if (!product.is_available) {
          return res.status(400).json({
            success: false,
            message: `Product ${product.pd_name} is not available`
          });
        }

        if (product.stock_quantity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for product ${product.pd_name}. Available: ${product.stock_quantity}, Requested: ${item.quantity}`
          });
        }

        // Create product order
        const po_id = `PO_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const productOrder = new ProductOrder({
          po_id,
          pd_id: product._id, // Use product._id (ObjectId) instead of item.pd_id (SKU)
          po_quantity: item.quantity,
          po_price: item.pd_price
        });
        await productOrder.save();
        productOrders.push(productOrder);

        subtotal += item.pd_price * item.quantity;

        // Update product stock
        product.stock_quantity -= item.quantity;
        product.pd_quantity = product.stock_quantity; // Sync theo schema
        await product.save();

        console.log(`📦 Updated stock for ${product.pd_name}: ${product.stock_quantity} remaining`);
      }

      // Find or create customer
      let customer = await Customer.findOne({ email: email || 'guest@example.com' });
      if (!customer) {
        const customer_id = `CUST_${Date.now()}`;
        customer = new Customer({
          customer_id,
          name: customer_name,
          email: email || 'guest@example.com',
          phone_number
        });
        await customer.save();
      }

      // Get customer ranking for automatic discount
      let customerRanking = null;
      let rankingDiscount = 0;
      
      if (req.user && req.user.customer_id) {
        customerRanking = await CustomerRanking.findOne({ 
          customer_id: req.user.customer_id._id 
        }).populate('rank_id');
        
        if (customerRanking && customerRanking.rank_id.discount_percent > 0) {
          rankingDiscount = Math.round((subtotal * customerRanking.rank_id.discount_percent) / 100);
          console.log(`🎯 Ranking discount applied: ${customerRanking.rank_id.rank_name} - ${customerRanking.rank_id.discount_percent}% = ${rankingDiscount}đ`);
        }
      }

      // Validate and apply voucher if provided
      let voucher = null;
      let discountAmount = 0;
      let finalTotal = subtotal - rankingDiscount; // Apply ranking discount first

      if (voucher_code) {
        console.log('🎫 Validating voucher:', voucher_code);
        
        // Find voucher by code
        voucher = await Voucher.findOne({ 
          voucher_code: voucher_code.toUpperCase(),
          is_active: true 
        }).populate('ranking_id');

        if (!voucher) {
          return res.status(400).json({
            success: false,
            message: 'Voucher không hợp lệ hoặc đã hết hạn'
          });
        }

        // Check voucher validity
        const now = new Date();
        if (voucher.start_date > now || voucher.end_date < now) {
          return res.status(400).json({
            success: false,
            message: 'Voucher đã hết hạn'
          });
        }

        if (voucher.current_uses >= voucher.max_uses) {
          return res.status(400).json({
            success: false,
            message: 'Voucher đã hết lượt sử dụng'
          });
        }

        // Check minimum order value
        if (subtotal < voucher.min_order_value) {
          return res.status(400).json({
            success: false,
            message: `Đơn hàng phải tối thiểu ${voucher.min_order_value.toLocaleString('vi-VN')}đ để sử dụng voucher này`
          });
        }

        // Get customer ranking to check voucher eligibility
        const customerRanking = await CustomerRanking.findOne({ customer_id: customer._id })
          .populate('rank_id');

        if (customerRanking && voucher.ranking_id) {
          // Check if customer's ranking matches voucher requirement
          if (customerRanking.rank_id._id.toString() !== voucher.ranking_id._id.toString()) {
            return res.status(400).json({
              success: false,
              message: `Voucher chỉ dành cho khách hàng ${voucher.ranking_id.rank_name}`
            });
          }
        }

        // Calculate discount (apply on subtotal after ranking discount)
        if (voucher.discount_percent > 0) {
          discountAmount = Math.min(
            (finalTotal * voucher.discount_percent) / 100,
            voucher.max_discount_amount
          );
        } else {
          discountAmount = Math.min(voucher.discount_amount, voucher.max_discount_amount);
        }

        finalTotal = finalTotal - discountAmount;
        console.log(`🎫 Voucher applied: ${discountAmount}đ discount`);
      }

      // Calculate tax and final total
      const tax = Math.round(subtotal * 0.1); // 10% tax on subtotal, not on discounted amount
      const order_total = finalTotal + tax; // finalTotal is already after discounts

      // Create the main order with all product orders
      const order = new Order({
        od_id,
        po_id: productOrders.map(po => po._id), // Link to all product orders
        customer_id: customer._id,
        customer_name,
        shipping_address,
        order_datetime: new Date(),
        pm_id: paymentMethod._id,
        order_note: order_note || '',
        voucher_id: voucher ? voucher._id : null,
        payment_status_id: pendingPaymentStatus._id,
        order_total
      });
      await order.save();

      // Create order info with initial status
      const orderInfo = new OrderInfo({
        oi_id: `OI_${Date.now()}`,
        od_id: order._id,
        of_state: 'ORDER_SUCCESS'
      });
      await orderInfo.save();

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
          discount_applied: discountAmount
        });
        await voucherUsage.save();
      }

      // Update customer total spending and ranking
      await updateCustomerSpendingAndRanking(customer._id, order_total);

      // Populate references for response
      await order.populate([
        { path: 'customer_id', select: 'customer_id name email' },
        { 
          path: 'po_id', 
          select: 'po_id pd_id po_quantity po_price',
          populate: {
            path: 'pd_id',
            select: 'pd_id pd_name pd_price br_id',
            populate: {
              path: 'br_id',
              select: 'br_id br_name'
            }
          }
        },
        { path: 'pm_id', select: 'pm_id pm_name' },
        { path: 'payment_status_id', select: 'ps_id ps_name' },
        { path: 'voucher_id', select: 'voucher_id voucher_code voucher_name discount_percent discount_amount max_discount_amount' }
      ]);

      console.log(`✅ Order created successfully: ${od_id}, Total: ${order_total}, Discount: ${discountAmount}`);

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: {
          order,
          productOrders,
          orderInfo,
          voucher: voucher ? {
            voucher_code: voucher.voucher_code,
            voucher_name: voucher.voucher_name,
            discount_applied: discountAmount
          } : null,
          ranking: customerRanking ? {
            rank_name: customerRanking.rank_id.rank_name,
            discount_percent: customerRanking.rank_id.discount_percent,
            discount_applied: rankingDiscount
          } : null,
          summary: {
            subtotal,
            ranking_discount: rankingDiscount,
            voucher_discount: discountAmount,
            total_discount: rankingDiscount + discountAmount,
            tax,
            total: order_total
          }
        }
      });
    } catch (error) {
      console.error('❌ Error in createOrderFromCart:', error);
      console.error('❌ Error stack:', error.stack);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  });

  // POST /api/v1/orders/validate-voucher - Validate voucher code
  static validateVoucher = asyncHandler(async (req, res) => {
    try {
      const { voucher_code, customer_id, order_total } = req.body;

      if (!voucher_code) {
        return res.status(400).json({
          success: false,
          message: 'Voucher code is required'
        });
      }

      console.log('🎫 Validating voucher:', { voucher_code, customer_id, order_total });

      // Find voucher by code
      const voucher = await Voucher.findOne({ 
        voucher_code: voucher_code.toUpperCase(),
        is_active: true 
      }).populate('ranking_id');

      if (!voucher) {
        return res.status(400).json({
          success: false,
          message: 'Voucher không hợp lệ hoặc đã hết hạn'
        });
      }

      // Check voucher validity
      const now = new Date();
      if (voucher.start_date > now || voucher.end_date < now) {
        return res.status(400).json({
          success: false,
          message: 'Voucher đã hết hạn'
        });
      }

      if (voucher.current_uses >= voucher.max_uses) {
        return res.status(400).json({
          success: false,
          message: 'Voucher đã hết lượt sử dụng'
        });
      }

      // Check minimum order value
      if (order_total && order_total < voucher.min_order_value) {
        return res.status(400).json({
          success: false,
          message: `Đơn hàng phải tối thiểu ${voucher.min_order_value.toLocaleString('vi-VN')}đ để sử dụng voucher này`
        });
      }

      // Check customer ranking if customer_id provided
      if (customer_id) {
        const customerRanking = await CustomerRanking.findOne({ customer_id })
          .populate('rank_id');

        if (customerRanking && voucher.ranking_id) {
          // Check if customer's ranking matches voucher requirement
          if (customerRanking.rank_id._id.toString() !== voucher.ranking_id._id.toString()) {
            return res.status(400).json({
              success: false,
              message: `Voucher chỉ dành cho khách hàng ${voucher.ranking_id.rank_name}`
            });
          }
        }
      }

      // Calculate potential discount
      let discountAmount = 0;
      if (order_total) {
        if (voucher.discount_percent > 0) {
          discountAmount = Math.min(
            (order_total * voucher.discount_percent) / 100,
            voucher.max_discount_amount
          );
        } else {
          discountAmount = Math.min(voucher.discount_amount, voucher.max_discount_amount);
        }
      }

      res.status(200).json({
        success: true,
        message: 'Voucher hợp lệ',
        data: {
          voucher: {
            voucher_id: voucher.voucher_id,
            voucher_code: voucher.voucher_code,
            voucher_name: voucher.voucher_name,
            discount_percent: voucher.discount_percent,
            discount_amount: voucher.discount_amount,
            max_discount_amount: voucher.max_discount_amount,
            min_order_value: voucher.min_order_value,
            ranking_requirement: voucher.ranking_id ? voucher.ranking_id.rank_name : null
          },
          discount_calculated: discountAmount,
          final_amount: order_total ? order_total - discountAmount : null
        }
      });

    } catch (error) {
      console.error('❌ Error validating voucher:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  });

  // Các method khác giữ nguyên...
}

/**
 * Cập nhật ranking của khách hàng dựa trên tổng chi tiêu
 */
async function updateCustomerSpendingAndRanking(customerId, orderAmount) {
  try {
    console.log(`🔄 Updating customer ranking: ${customerId}, order amount: ${orderAmount}`);
    
    // Tính tổng chi tiêu từ tất cả orders của customer
    const totalSpendingResult = await Order.aggregate([
      { $match: { customer_id: customerId } },
      { $group: { _id: null, total: { $sum: "$order_total" } } }
    ]);
    
    const totalSpending = totalSpendingResult.length > 0 ? totalSpendingResult[0].total : 0;
    console.log(`💰 Customer total spending: ${totalSpending}`);
    
    // Tìm hoặc tạo customer ranking record
    let customerRanking = await CustomerRanking.findOne({ customer_id: customerId });
    
    if (!customerRanking) {
      // Tạo mới customer ranking với rank mặc định (Bronze)
      const defaultRank = await Ranking.findOne({ rank_id: 'BRONZE' });
      if (!defaultRank) {
        console.error('❌ Default rank BRONZE not found');
        return;
      }
      
      customerRanking = new CustomerRanking({
        customer_id: customerId,
        rank_id: defaultRank._id
      });
    }
    
    // Lấy tất cả ranking levels để xét lại rank
    const allRanks = await Ranking.find().sort({ min_spending: 1 });
    
    // Tìm rank phù hợp với tổng chi tiêu
    let newRank = null;
    for (const rank of allRanks) {
      if (totalSpending >= rank.min_spending && 
          totalSpending <= rank.max_spending) {
        newRank = rank;
        break;
      }
    }
    
    // Nếu không tìm thấy rank phù hợp, sử dụng rank cao nhất
    if (!newRank && allRanks.length > 0) {
      newRank = allRanks[allRanks.length - 1];
    }
    
    if (newRank && customerRanking.rank_id.toString() !== newRank._id.toString()) {
      console.log(`🎯 Customer rank upgraded from ${customerRanking.rank_id} to ${newRank._id}`);
      customerRanking.rank_id = newRank._id;
    }
    
    await customerRanking.save();
    
    console.log(`✅ Customer ranking updated: total spending ${totalSpending}, rank: ${customerRanking.rank_id}`);
    
  } catch (error) {
    console.error('❌ Error updating customer ranking:', error);
  }
}

module.exports = OrderController;
