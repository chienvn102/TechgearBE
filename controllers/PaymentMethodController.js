// controllers/PaymentMethodController.js
// CRUD controller cho payment_method collection 

const { PaymentMethod, Order } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

class PaymentMethodController {
  // GET /api/v1/payment-methods - Get all payment methods
  static getAllPaymentMethods = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { search, is_active } = req.query;

    let query = {};
    
    if (search) {
      query.$or = [
        { method_name: { $regex: search, $options: 'i' } },
        { method_description: { $regex: search, $options: 'i' } }
      ];
    }

    if (is_active !== undefined) {
      query.is_active = is_active === 'true';
    }

    const total = await PaymentMethod.countDocuments(query);

    const paymentMethods = await PaymentMethod.find(query)
      .sort({ method_order: 1, _id: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        paymentMethods,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/payment-methods/:id - Get payment method by ID
  static getPaymentMethodById = asyncHandler(async (req, res) => {
    const paymentMethod = await PaymentMethod.findById(req.params.id);

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { paymentMethod }
    });
  });

  // POST /api/v1/payment-methods - Create new payment method
  static createPaymentMethod = asyncHandler(async (req, res) => {
    const {
      method_name,
      method_description,
      method_type,
      method_order,
      processing_fee,
      is_active = true
    } = req.body;

    if (!method_name || !method_type) {
      return res.status(400).json({
        success: false,
        message: 'Method name and type are required'
      });
    }

    // Validate method type
    const validTypes = ['cash', 'card', 'bank_transfer', 'e_wallet', 'crypto'];
    if (!validTypes.includes(method_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid method type'
      });
    }

    // Check if method name already exists
    const existingMethod = await PaymentMethod.findOne({ method_name });
    if (existingMethod) {
      return res.status(400).json({
        success: false,
        message: 'Payment method name already exists'
      });
    }

    // Set method order if not provided
    let order = method_order;
    if (!order) {
      const maxOrder = await PaymentMethod.findOne().sort({ method_order: -1 });
      order = maxOrder ? maxOrder.method_order + 1 : 1;
    }

    const paymentMethod = new PaymentMethod({
      method_name,
      method_description: method_description || '',
      method_type,
      method_order: order,
      processing_fee: processing_fee || 0,
      is_active,
      created_at: new Date()
    });

    await paymentMethod.save();

    res.status(201).json({
      success: true,
      message: 'Payment method created successfully',
      data: { paymentMethod }
    });
  });

  // PUT /api/v1/payment-methods/:id - Update payment method
  static updatePaymentMethod = asyncHandler(async (req, res) => {
    const {
      method_name,
      method_description,
      method_type,
      method_order,
      processing_fee,
      is_active
    } = req.body;

    const paymentMethod = await PaymentMethod.findById(req.params.id);
    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    // Validate method type if provided
    if (method_type) {
      const validTypes = ['cash', 'card', 'bank_transfer', 'e_wallet', 'crypto'];
      if (!validTypes.includes(method_type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid method type'
        });
      }
    }

    // Check unique constraint if method_name changed
    if (method_name && method_name !== paymentMethod.method_name) {
      const existingMethod = await PaymentMethod.findOne({ method_name });
      if (existingMethod) {
        return res.status(400).json({
          success: false,
          message: 'Payment method name already exists'
        });
      }
    }

    // Update fields
    if (method_name) paymentMethod.method_name = method_name;
    if (method_description !== undefined) paymentMethod.method_description = method_description;
    if (method_type) paymentMethod.method_type = method_type;
    if (method_order !== undefined) paymentMethod.method_order = method_order;
    if (processing_fee !== undefined) paymentMethod.processing_fee = processing_fee;
    if (is_active !== undefined) paymentMethod.is_active = is_active;

    await paymentMethod.save();

    res.status(200).json({
      success: true,
      message: 'Payment method updated successfully',
      data: { paymentMethod }
    });
  });

  // DELETE /api/v1/payment-methods/:id - Delete payment method
  static deletePaymentMethod = asyncHandler(async (req, res) => {
    const paymentMethod = await PaymentMethod.findById(req.params.id);
    
    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    // Check if payment method is being used by orders
    const orderCount = await Order.countDocuments({ payment_method_id: paymentMethod._id });
    if (orderCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete payment method that is used in orders'
      });
    }

    await PaymentMethod.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Payment method deleted successfully'
    });
  });

  // GET /api/v1/payment-methods/active - Get active payment methods for checkout
  static getActivePaymentMethods = asyncHandler(async (req, res) => {
    const paymentMethods = await PaymentMethod.find({ is_active: true })
      .select('method_name method_description method_type processing_fee method_order')
      .sort({ method_order: 1 });

    res.status(200).json({
      success: true,
      data: { paymentMethods }
    });
  });

  // PUT /api/v1/payment-methods/:id/toggle-status - Toggle payment method status
  static togglePaymentMethodStatus = asyncHandler(async (req, res) => {
    const paymentMethod = await PaymentMethod.findById(req.params.id);
    
    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    paymentMethod.is_active = !paymentMethod.is_active;
    await paymentMethod.save();

    res.status(200).json({
      success: true,
      message: `Payment method ${paymentMethod.is_active ? 'activated' : 'deactivated'} successfully`,
      data: { paymentMethod }
    });
  });

  // PUT /api/v1/payment-methods/reorder - Reorder payment methods
  static reorderPaymentMethods = asyncHandler(async (req, res) => {
    const { method_orders } = req.body;

    if (!method_orders || !Array.isArray(method_orders)) {
      return res.status(400).json({
        success: false,
        message: 'Method orders array is required'
      });
    }

    const updatePromises = method_orders.map(({ method_id, order }) => 
      PaymentMethod.findByIdAndUpdate(method_id, { method_order: order })
    );

    await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      message: 'Payment methods reordered successfully'
    });
  });

  // GET /api/v1/payment-methods/statistics - Get payment method statistics
  static getPaymentMethodStatistics = asyncHandler(async (req, res) => {
    const totalMethods = await PaymentMethod.countDocuments();
    const activeMethods = await PaymentMethod.countDocuments({ is_active: true });

    // Payment method usage statistics
    const methodUsage = await Order.aggregate([
      {
        $lookup: {
          from: 'payment_method',
          localField: 'payment_method_id',
          foreignField: '_id',
          as: 'paymentMethod'
        }
      },
      { $unwind: '$paymentMethod' },
      {
        $group: {
          _id: '$payment_method_id',
          method_name: { $first: '$paymentMethod.method_name' },
          method_type: { $first: '$paymentMethod.method_type' },
          order_count: { $sum: 1 },
          total_amount: { $sum: '$order_total' },
          avg_amount: { $avg: '$order_total' }
        }
      },
      { $sort: { order_count: -1 } }
    ]);

    // Payment methods by type
    const methodsByType = await PaymentMethod.aggregate([
      {
        $group: {
          _id: '$method_type',
          count: { $sum: 1 },
          active_count: {
            $sum: { $cond: ['$is_active', 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Average processing fees by type
    const avgProcessingFees = await PaymentMethod.aggregate([
      {
        $group: {
          _id: '$method_type',
          avg_processing_fee: { $avg: '$processing_fee' },
          min_processing_fee: { $min: '$processing_fee' },
          max_processing_fee: { $max: '$processing_fee' }
        }
      },
      { $sort: { avg_processing_fee: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalMethods,
        activeMethods,
        methodUsage,
        methodsByType,
        avgProcessingFees
      }
    });
  });

  // GET /api/v1/payment-methods/by-type/:type - Get payment methods by type
  static getPaymentMethodsByType = asyncHandler(async (req, res) => {
    const { type } = req.params;
    const { is_active } = req.query;

    let query = { method_type: type };
    if (is_active !== undefined) {
      query.is_active = is_active === 'true';
    }

    const paymentMethods = await PaymentMethod.find(query)
      .sort({ method_order: 1 });

    res.status(200).json({
      success: true,
      data: { paymentMethods }
    });
  });
}

module.exports = PaymentMethodController;
