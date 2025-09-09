// controllers/BrandController.js
// CRUD controller cho brand collection 

const { Brand, Product } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

class BrandController {
  // GET /api/v1/brands - Get all brands
  static getAllBrands = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { search, is_active } = req.query;

    let query = {};
    
    if (search) {
      query.$or = [
        { br_name: { $regex: search, $options: 'i' } },
        { brand_description: { $regex: search, $options: 'i' } }
      ];
    }

    if (is_active !== undefined) {
      query.is_active = is_active === 'true';
    }

    const total = await Brand.countDocuments(query);

    const brands = await Brand.find(query)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);

    // Add product count for each brand
    const brandsWithCount = await Promise.all(
      brands.map(async (brand) => {
        const productCount = await Product.countDocuments({ brand_id: brand._id });
        return {
          ...brand.toObject(),
          product_count: productCount
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        brands: brandsWithCount,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/brands/:id - Get brand by ID
  static getBrandById = asyncHandler(async (req, res) => {
    const brand = await Brand.findById(req.params.id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    // Get product count
    const productCount = await Product.countDocuments({ brand_id: brand._id });

    res.status(200).json({
      success: true,
      data: { 
        brand: {
          ...brand.toObject(),
          product_count: productCount
        }
      }
    });
  });

  // POST /api/v1/brands - Create new brand
  static createBrand = asyncHandler(async (req, res) => {
    const { br_id, br_name, brand_description, br_img, website_url, is_active = true } = req.body;

    if (!br_name) {
      return res.status(400).json({
        success: false,
        message: 'Brand name is required'
      });
    }

    if (!br_id) {
      return res.status(400).json({
        success: false,
        message: 'Brand ID is required'
      });
    }

    // Check if brand ID already exists
    const existingBrandId = await Brand.findOne({ br_id });
    if (existingBrandId) {
      return res.status(400).json({
        success: false,
        message: 'Brand ID already exists'
      });
    }

    // Check if brand name already exists
    const existingBrand = await Brand.findOne({ br_name });
    if (existingBrand) {
      return res.status(400).json({
        success: false,
        message: 'Brand name already exists'
      });
    }

    const brand = new Brand({
      br_id,
      br_name,
      brand_description,
      br_img,
      website_url,
      is_active
    });

    await brand.save();

    res.status(201).json({
      success: true,
      message: 'Brand created successfully',
      data: { brand }
    });
  });

  // PUT /api/v1/brands/:id - Update brand
  static updateBrand = asyncHandler(async (req, res) => {
    const { br_id, br_name, brand_description, br_img, website_url, is_active } = req.body;

    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    // Check unique constraint if br_id changed
    if (br_id && br_id !== brand.br_id) {
      const existingBrandId = await Brand.findOne({ br_id });
      if (existingBrandId) {
        return res.status(400).json({
          success: false,
          message: 'Brand ID already exists'
        });
      }
    }

    // Check unique constraint if br_name changed
    if (br_name && br_name !== brand.br_name) {
      const existingBrand = await Brand.findOne({ br_name });
      if (existingBrand) {
        return res.status(400).json({
          success: false,
          message: 'Brand name already exists'
        });
      }
    }

    // Update fields
    if (br_id) brand.br_id = br_id;
    if (br_name) brand.br_name = br_name;
    if (brand_description !== undefined) brand.brand_description = brand_description;
    if (br_img !== undefined) brand.br_img = br_img;
    if (website_url !== undefined) brand.website_url = website_url;
    if (is_active !== undefined) brand.is_active = is_active;

    await brand.save();

    res.status(200).json({
      success: true,
      message: 'Brand updated successfully',
      data: { brand }
    });
  });

  // DELETE /api/v1/brands/:id - Delete brand
  static deleteBrand = asyncHandler(async (req, res) => {
    const brand = await Brand.findById(req.params.id);
    
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    // Check if brand has products
    const productCount = await Product.countDocuments({ brand_id: brand._id });
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete brand that has products'
      });
    }

    await Brand.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Brand deleted successfully'
    });
  });

  // GET /api/v1/brands/:id/products - Get products for specific brand
  static getBrandProducts = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { min_price, max_price, category_id, sort_by } = req.query;

    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    let query = { brand_id: brand._id };

    if (min_price || max_price) {
      query.product_price = {};
      if (min_price) query.product_price.$gte = parseFloat(min_price);
      if (max_price) query.product_price.$lte = parseFloat(max_price);
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
      .populate('category_id', 'category_name')
      .populate('product_type_id', 'type_name')
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        brand,
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

  // GET /api/v1/brands/statistics - Get brand statistics
  static getBrandStatistics = asyncHandler(async (req, res) => {
    const totalBrands = await Brand.countDocuments();
    const activeBrands = await Brand.countDocuments({ is_active: true });

    // Brands with product count
    const brandsWithProducts = await Brand.aggregate([
      {
        $lookup: {
          from: 'product',
          localField: '_id',
          foreignField: 'brand_id',
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
          brands_with_products: {
            $sum: { $cond: [{ $gt: ['$product_count', 0] }, 1, 0] }
          },
          empty_brands: {
            $sum: { $cond: [{ $eq: ['$product_count', 0] }, 1, 0] }
          }
        }
      }
    ]);

    // Top brands by product count
    const topBrands = await Brand.aggregate([
      {
        $lookup: {
          from: 'product',
          localField: '_id',
          foreignField: 'brand_id',
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
          br_name: 1,
          product_count: 1,
          is_active: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalBrands,
        activeBrands,
        productStats: brandsWithProducts[0] || {
          total_products: 0,
          brands_with_products: 0,
          empty_brands: totalBrands
        },
        topBrands
      }
    });
  });

  // GET /api/v1/brands/active - Get only active brands
  static getActiveBrands = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;

    const query = { is_active: true };
    const total = await Brand.countDocuments(query);

    const brands = await Brand.find(query)
      .select('br_name brand_description')
      .sort({ br_name: 1 })
      .skip(skip)
      .limit(limit);

    // Add product count for each brand
    const brandsWithCount = await Promise.all(
      brands.map(async (brand) => {
        const productCount = await Product.countDocuments({ 
          brand_id: brand._id,
          is_active: true 
        });
        return {
          ...brand.toObject(),
          active_product_count: productCount
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        brands: brandsWithCount,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });
}

module.exports = BrandController;
