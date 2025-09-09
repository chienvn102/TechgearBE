// controllers/CategoryController.js
// CRUD controller cho category collection 

const { Category, Product } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

class CategoryController {
  // GET /api/v1/categories - Get all categories
  static getAllCategories = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { search, parent_id, is_active } = req.query;

    let query = {};
    
    if (search) {
      query.$or = [
        { cg_name: { $regex: search, $options: 'i' } },
        { category_description: { $regex: search, $options: 'i' } }
      ];
    }

    if (is_active !== undefined) {
      query.is_active = is_active === 'true';
    }

    const total = await Category.countDocuments(query);

    const categories = await Category.find(query)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);

    // Add product count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const productCount = await Product.countDocuments({ category_id: category._id });
        return {
          ...category.toObject(),
          product_count: productCount
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        categories: categoriesWithCount,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/categories/:id - Get category by ID
  static getCategoryById = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Get product count
    const productCount = await Product.countDocuments({ category_id: category._id });

    res.status(200).json({
      success: true,
      data: { 
        category: {
          ...category.toObject(),
          product_count: productCount
        }
      }
    });
  });

  // POST /api/v1/categories - Create new category
  static createCategory = asyncHandler(async (req, res) => {
    const {
      cg_id,
      cg_name,
      category_description,
      is_active = true
    } = req.body;

    if (!cg_id || !cg_name) {
      return res.status(400).json({
        success: false,
        message: 'Category ID and name are required'
      });
    }

    // Check if category ID already exists
    const existingCategoryId = await Category.findOne({ cg_id });
    if (existingCategoryId) {
      return res.status(400).json({
        success: false,
        message: 'Category ID already exists'
      });
    }

    // Check if category name already exists
    const existingCategoryName = await Category.findOne({ cg_name });
    if (existingCategoryName) {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists'
      });
    }

    const category = new Category({
      cg_id,
      cg_name,
      category_description: category_description || '',
      is_active,
      created_at: new Date()
    });

    await category.save();

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category }
    });
  });

  // PUT /api/v1/categories/:id - Update category
  static updateCategory = asyncHandler(async (req, res) => {
    const {
      cg_id,
      cg_name,
      category_description,
      is_active
    } = req.body;

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if cg_id already exists (if being changed)
    if (cg_id && cg_id !== category.cg_id) {
      const existingCategoryId = await Category.findOne({ 
        cg_id, 
        _id: { $ne: category._id } 
      });
      if (existingCategoryId) {
        return res.status(400).json({
          success: false,
          message: 'Category ID already exists'
        });
      }
    }

    // Check if cg_name already exists (if being changed)
    if (cg_name && cg_name !== category.cg_name) {
      const existingCategoryName = await Category.findOne({ 
        cg_name, 
        _id: { $ne: category._id } 
      });
      if (existingCategoryName) {
        return res.status(400).json({
          success: false,
          message: 'Category name already exists'
        });
      }
    }

    // Update fields
    if (cg_id) category.cg_id = cg_id;
    if (cg_name) category.cg_name = cg_name;
    if (category_description !== undefined) category.category_description = category_description;
    if (is_active !== undefined) category.is_active = is_active;

    await category.save();

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: { category }
    });
  });

  // DELETE /api/v1/categories/:id - Delete category
  static deleteCategory = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category has products
    const productCount = await Product.countDocuments({ category_id: category._id });
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category that has products'
      });
    }

    await Category.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  });

  // GET /api/v1/categories/:id/products - Get products in category
  static getCategoryProducts = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { min_price, max_price, brand_id, sort_by } = req.query;

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    let query = { category_id: category._id };

    if (min_price || max_price) {
      query.product_price = {};
      if (min_price) query.product_price.$gte = parseFloat(min_price);
      if (max_price) query.product_price.$lte = parseFloat(max_price);
    }

    if (brand_id) {
      query.brand_id = brand_id;
    }

    const total = await Product.countDocuments(query);

    let sortOption = { _id: -1 };
    if (sort_by === 'price_asc') sortOption = { product_price: 1 };
    if (sort_by === 'price_desc') sortOption = { product_price: -1 };
    if (sort_by === 'name_asc') sortOption = { product_name: 1 };
    if (sort_by === 'name_desc') sortOption = { product_name: -1 };

    const products = await Product.find(query)
      .populate('brand_id', 'brand_name')
      .populate('product_type_id', 'type_name')
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        category,
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

  // GET /api/v1/categories/statistics - Get category statistics
  static getCategoryStatistics = asyncHandler(async (req, res) => {
    const totalCategories = await Category.countDocuments();
    const activeCategories = await Category.countDocuments({ is_active: true });

    // Categories with product count
    const categoriesWithProducts = await Category.aggregate([
      {
        $lookup: {
          from: 'product',
          localField: '_id',
          foreignField: 'category_id',
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
          categories_with_products: {
            $sum: { $cond: [{ $gt: ['$product_count', 0] }, 1, 0] }
          },
          empty_categories: {
            $sum: { $cond: [{ $eq: ['$product_count', 0] }, 1, 0] }
          }
        }
      }
    ]);

    // Top categories by product count
    const topCategories = await Category.aggregate([
      {
        $lookup: {
          from: 'product',
          localField: '_id',
          foreignField: 'category_id',
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
          cg_name: 1,
          product_count: 1,
          is_active: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalCategories,
        activeCategories,
        productStats: categoriesWithProducts[0] || {
          total_products: 0,
          categories_with_products: 0,
          empty_categories: totalCategories
        },
        topCategories
      }
    });
  });
}

module.exports = CategoryController;
