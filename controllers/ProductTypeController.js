// controllers/ProductTypeController.js
// CRUD controller cho product_type collection 

const { ProductType, Product } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

class ProductTypeController {
  // GET /api/v1/product-types - Get all product types
  static getAllProductTypes = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { search, is_active } = req.query;

    let query = {};
    
    if (search) {
      query.$or = [
        { pdt_name: { $regex: search, $options: 'i' } },
        { pdt_note: { $regex: search, $options: 'i' } }
      ];
    }

    if (is_active !== undefined) {
      query.is_active = is_active === 'true';
    }

    const total = await ProductType.countDocuments(query);

    const productTypes = await ProductType.find(query)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);

    // Add product count for each type
    const typesWithCount = await Promise.all(
      productTypes.map(async (type) => {
        const productCount = await Product.countDocuments({ product_type_id: type._id });
        return {
          ...type.toObject(),
          product_count: productCount
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        productTypes: typesWithCount,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/product-types/:id - Get product type by ID
  static getProductTypeById = asyncHandler(async (req, res) => {
    const productType = await ProductType.findById(req.params.id);

    if (!productType) {
      return res.status(404).json({
        success: false,
        message: 'Product type not found'
      });
    }

    // Get product count
    const productCount = await Product.countDocuments({ product_type_id: productType._id });

    res.status(200).json({
      success: true,
      data: { 
        productType: {
          ...productType.toObject(),
          product_count: productCount
        }
      }
    });
  });

  // POST /api/v1/product-types - Create new product type
  static createProductType = asyncHandler(async (req, res) => {
    const { pdt_id, pdt_name, pdt_note, is_active = true } = req.body;

    if (!pdt_name) {
      return res.status(400).json({
        success: false,
        message: 'Product type name is required'
      });
    }

    if (!pdt_id) {
      return res.status(400).json({
        success: false,
        message: 'Product type ID is required'
      });
    }

    // Check if product type ID already exists
    const existingTypeId = await ProductType.findOne({ pdt_id });
    if (existingTypeId) {
      return res.status(400).json({
        success: false,
        message: 'Product type ID already exists'
      });
    }

    // Check if type name already exists
    const existingType = await ProductType.findOne({ pdt_name });
    if (existingType) {
      return res.status(400).json({
        success: false,
        message: 'Product type name already exists'
      });
    }

    const productType = new ProductType({
      pdt_id,
      pdt_name,
      pdt_note,
      is_active
    });

    await productType.save();

    res.status(201).json({
      success: true,
      message: 'Product type created successfully',
      data: { productType }
    });
  });

  // PUT /api/v1/product-types/:id - Update product type
  static updateProductType = asyncHandler(async (req, res) => {
    const { pdt_name, pdt_note, is_active } = req.body;

    const productType = await ProductType.findById(req.params.id);
    if (!productType) {
      return res.status(404).json({
        success: false,
        message: 'Product type not found'
      });
    }

    // Check unique constraint if pdt_name changed
    if (pdt_name && pdt_name !== productType.pdt_name) {
      const existingType = await ProductType.findOne({ pdt_name });
      if (existingType) {
        return res.status(400).json({
          success: false,
          message: 'Product type name already exists'
        });
      }
    }

    // Update fields
    if (pdt_name) productType.pdt_name = pdt_name;
    if (pdt_note !== undefined) productType.pdt_note = pdt_note;

    await productType.save();

    res.status(200).json({
      success: true,
      message: 'Product type updated successfully',
      data: { productType }
    });
  });

  // DELETE /api/v1/product-types/:id - Delete product type
  static deleteProductType = asyncHandler(async (req, res) => {
    const productType = await ProductType.findById(req.params.id);
    
    if (!productType) {
      return res.status(404).json({
        success: false,
        message: 'Product type not found'
      });
    }

    // Check if product type has products
    const productCount = await Product.countDocuments({ product_type_id: productType._id });
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete product type that has products'
      });
    }

    await ProductType.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Product type deleted successfully'
    });
  });

  // GET /api/v1/product-types/:id/products - Get products for specific type
  static getProductTypeProducts = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { min_price, max_price, brand_id, category_id, sort_by } = req.query;

    const productType = await ProductType.findById(req.params.id);
    if (!productType) {
      return res.status(404).json({
        success: false,
        message: 'Product type not found'
      });
    }

    let query = { product_type_id: productType._id };

    if (min_price || max_price) {
      query.product_price = {};
      if (min_price) query.product_price.$gte = parseFloat(min_price);
      if (max_price) query.product_price.$lte = parseFloat(max_price);
    }

    if (brand_id) {
      query.brand_id = brand_id;
    }

    if (category_id) {
      query.category_id = category_id;
    }

    const total = await Product.countDocuments(query);

    let sortOption = { _id: -1 };
    if (sort_by === 'price_asc') sortOption = { product_price: 1 };
    if (sort_by === 'price_desc') sortOption = { product_price: -1 };
    if (sort_by === 'name_asc') sortOption = { product_name: 1 };
    if (sort_by === 'name_desc') sortOption = { product_name: -1 };

    const products = await Product.find(query)
      .populate('brand_id', 'brand_name')
      .populate('category_id', 'category_name')
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        productType,
        products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/product-types/active - Get only active product types
  static getActiveProductTypes = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;

    const query = { is_active: true };
    const total = await ProductType.countDocuments(query);

    const productTypes = await ProductType.find(query)
      .select('pdt_name pdt_note')
      .sort({ pdt_name: 1 })
      .skip(skip)
      .limit(limit);

    // Add active product count for each type
    const typesWithCount = await Promise.all(
      productTypes.map(async (type) => {
        const productCount = await Product.countDocuments({ 
          product_type_id: type._id,
          is_active: true 
        });
        return {
          ...type.toObject(),
          active_product_count: productCount
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        productTypes: typesWithCount,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/product-types/statistics - Get product type statistics
  static getProductTypeStatistics = asyncHandler(async (req, res) => {
    const totalTypes = await ProductType.countDocuments();
    const activeTypes = await ProductType.countDocuments({ is_active: true });

    // Product types with product count
    const typesWithProducts = await ProductType.aggregate([
      {
        $lookup: {
          from: 'product',
          localField: '_id',
          foreignField: 'product_type_id',
          as: 'products'
        }
      },
      {
        $addFields: {
          product_count: { $size: '$products' }
        }
      },
      {
        $group: {
          _id: null,
          total_products: { $sum: '$product_count' },
          types_with_products: {
            $sum: { $cond: [{ $gt: ['$product_count', 0] }, 1, 0] }
          },
          empty_types: {
            $sum: { $cond: [{ $eq: ['$product_count', 0] }, 1, 0] }
          }
        }
      }
    ]);

    // Top product types by product count
    const topProductTypes = await ProductType.aggregate([
      {
        $lookup: {
          from: 'product',
          localField: '_id',
          foreignField: 'product_type_id',
          as: 'products'
        }
      },
      {
        $addFields: {
          product_count: { $size: '$products' }
        }
      },
      { $sort: { product_count: -1 } },
      { $limit: 10 },
      {
        $project: {
          pdt_name: 1,
          product_count: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalTypes,
        activeTypes,
        productStats: typesWithProducts[0] || {
          total_products: 0,
          types_with_products: 0,
          empty_types: totalTypes
        },
        topProductTypes
      }
    });
  });

  // PUT /api/v1/product-types/:id/toggle-status - Toggle product type status
  static toggleProductTypeStatus = asyncHandler(async (req, res) => {
    const productType = await ProductType.findById(req.params.id);
    
    if (!productType) {
      return res.status(404).json({
        success: false,
        message: 'Product type not found'
      });
    }

    productType.is_active = !productType.is_active;
    await productType.save();

    res.status(200).json({
      success: true,
      message: `Product type ${productType.is_active ? 'activated' : 'deactivated'} successfully`,
      data: { productType }
    });
  });
}

module.exports = ProductTypeController;
