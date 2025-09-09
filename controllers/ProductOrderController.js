// controllers/ProductOrderController.js
// CRUD controller cho product_order collection 

const { ProductOrder, Product } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

class ProductOrderController {
  // GET /api/v1/product-orders - Get all product orders
  static getAllProductOrders = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { search, pd_id, min_quantity, max_quantity, min_price, max_price } = req.query;

    let query = {};
    
    if (search) {
      query.po_id = { $regex: search, $options: 'i' };
    }

    if (pd_id) {
      query.pd_id = pd_id;
    }

    if (min_quantity || max_quantity) {
      query.po_quantity = {};
      if (min_quantity) query.po_quantity.$gte = parseInt(min_quantity);
      if (max_quantity) query.po_quantity.$lte = parseInt(max_quantity);
    }

    if (min_price || max_price) {
      query.po_price = {};
      if (min_price) query.po_price.$gte = parseFloat(min_price);
      if (max_price) query.po_price.$lte = parseFloat(max_price);
    }

    const total = await ProductOrder.countDocuments(query);

    const productOrders = await ProductOrder.find(query)
      .populate('pd_id', 'product_name product_price sku')
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        productOrders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/product-orders/:id - Get product order by ID
  static getProductOrderById = asyncHandler(async (req, res) => {
    const productOrder = await ProductOrder.findById(req.params.id)
      .populate('pd_id', 'product_name product_price sku product_description');

    if (!productOrder) {
      return res.status(404).json({
        success: false,
        message: 'Product order not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { productOrder }
    });
  });

  // POST /api/v1/product-orders - Create new product order
  static createProductOrder = asyncHandler(async (req, res) => {
    const { pd_id, po_quantity, po_price } = req.body;

    if (!pd_id || !po_quantity || po_price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Product ID, quantity and price are required'
      });
    }

    // Validate quantity
    if (po_quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    // Validate price
    if (po_price < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price cannot be negative'
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

    // Generate unique po_id
    const po_id = await generateUniqueId('PO', ProductOrder, 'po_id');

    const productOrder = new ProductOrder({
      po_id,
      pd_id,
      po_quantity,
      po_price
    });

    await productOrder.save();

    const populatedProductOrder = await ProductOrder.findById(productOrder._id)
      .populate('pd_id', 'product_name product_price sku');

    res.status(201).json({
      success: true,
      message: 'Product order created successfully',
      data: { productOrder: populatedProductOrder }
    });
  });

  // PUT /api/v1/product-orders/:id - Update product order
  static updateProductOrder = asyncHandler(async (req, res) => {
    const { po_quantity, po_price } = req.body;

    const productOrder = await ProductOrder.findById(req.params.id);
    if (!productOrder) {
      return res.status(404).json({
        success: false,
        message: 'Product order not found'
      });
    }

    // Validate quantity if provided
    if (po_quantity !== undefined && po_quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    // Validate price if provided
    if (po_price !== undefined && po_price < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price cannot be negative'
      });
    }

    // Update fields
    if (po_quantity !== undefined) productOrder.po_quantity = po_quantity;
    if (po_price !== undefined) productOrder.po_price = po_price;

    await productOrder.save();

    const populatedProductOrder = await ProductOrder.findById(productOrder._id)
      .populate('pd_id', 'product_name product_price sku');

    res.status(200).json({
      success: true,
      message: 'Product order updated successfully',
      data: { productOrder: populatedProductOrder }
    });
  });

  // DELETE /api/v1/product-orders/:id - Delete product order
  static deleteProductOrder = asyncHandler(async (req, res) => {
    const productOrder = await ProductOrder.findById(req.params.id);
    
    if (!productOrder) {
      return res.status(404).json({
        success: false,
        message: 'Product order not found'
      });
    }

    await ProductOrder.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Product order deleted successfully'
    });
  });

  // GET /api/v1/product-orders/by-product/:productId - Get orders for specific product
  static getOrdersByProduct = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { productId } = req.params;

    const query = { pd_id: productId };
    const total = await ProductOrder.countDocuments(query);

    const productOrders = await ProductOrder.find(query)
      .populate('pd_id', 'product_name product_price sku')
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);

    // Calculate totals
    const totalQuantity = await ProductOrder.aggregate([
      { $match: { pd_id: productId } },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$po_quantity' },
          totalValue: { $sum: { $multiply: ['$po_quantity', '$po_price'] } },
          avgPrice: { $avg: '$po_price' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        productOrders,
        statistics: totalQuantity[0] || { totalQuantity: 0, totalValue: 0, avgPrice: 0 },
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/product-orders/statistics - Get product order statistics
  static getProductOrderStatistics = asyncHandler(async (req, res) => {
    const { start_date, end_date } = req.query;

    let matchStage = {};
    if (start_date || end_date) {
      matchStage.created_at = {};
      if (start_date) matchStage.created_at.$gte = new Date(start_date);
      if (end_date) matchStage.created_at.$lte = new Date(end_date);
    }

    const totalOrders = await ProductOrder.countDocuments(matchStage);

    // Order statistics
    const orderStats = await ProductOrder.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$po_quantity' },
          totalValue: { $sum: { $multiply: ['$po_quantity', '$po_price'] } },
          avgQuantity: { $avg: '$po_quantity' },
          avgPrice: { $avg: '$po_price' },
          maxQuantity: { $max: '$po_quantity' },
          minQuantity: { $min: '$po_quantity' }
        }
      }
    ]);

    // Top products by quantity
    const topProductsByQuantity = await ProductOrder.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$pd_id',
          totalQuantity: { $sum: '$po_quantity' },
          totalValue: { $sum: { $multiply: ['$po_quantity', '$po_price'] } },
          orderCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'product',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $project: {
          product_name: '$product.product_name',
          sku: '$product.sku',
          totalQuantity: 1,
          totalValue: 1,
          orderCount: 1
        }
      }
    ]);

    // Price distribution
    const priceDistribution = await ProductOrder.aggregate([
      { $match: matchStage },
      {
        $bucket: {
          groupBy: '$po_price',
          boundaries: [0, 100000, 500000, 1000000, 5000000, 10000000, Number.MAX_VALUE],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            totalQuantity: { $sum: '$po_quantity' }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        orderStats: orderStats[0] || {
          totalQuantity: 0,
          totalValue: 0,
          avgQuantity: 0,
          avgPrice: 0,
          maxQuantity: 0,
          minQuantity: 0
        },
        topProductsByQuantity,
        priceDistribution
      }
    });
  });

  // PUT /api/v1/product-orders/bulk-update - Bulk update product orders
  static bulkUpdateProductOrders = asyncHandler(async (req, res) => {
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        message: 'Updates array is required'
      });
    }

    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const { id, po_quantity, po_price } = update;
        
        if (!id) {
          errors.push({ update, error: 'ID is required' });
          continue;
        }

        const productOrder = await ProductOrder.findById(id);
        if (!productOrder) {
          errors.push({ update, error: 'Product order not found' });
          continue;
        }

        if (po_quantity !== undefined) productOrder.po_quantity = po_quantity;
        if (po_price !== undefined) productOrder.po_price = po_price;

        await productOrder.save();
        results.push(productOrder);
      } catch (error) {
        errors.push({ update, error: error.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk update completed. ${results.length} success, ${errors.length} errors`,
      data: {
        updated: results,
        errors
      }
    });
  });
}

module.exports = ProductOrderController;
