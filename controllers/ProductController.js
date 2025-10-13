// controllers/ProductController.js
// CRUD controller cho product collection 

const { Product, Brand, ProductType, Category, Player, ProductImage } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

class ProductController {
  // GET /api/v1/products - Get all products with advanced filtering
  static getAllProducts = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { search, br_id, pdt_id, category_id, player_id, color, is_available, in_stock_only, min_price, max_price, sort_by } = req.query;

    // Build query object
    let query = {};
    
    if (search) {
      query.$or = [
        { pd_id: { $regex: search, $options: 'i' } },
        { pd_name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    // Handle pdt_id: Convert from pdt_id string to ObjectId reference
    if (pdt_id) {
      const productType = await ProductType.findOne({ pdt_id: pdt_id });
      if (productType) {
        query.pdt_id = productType._id;
      } else {
        // If product type not found, return empty result
        return res.status(200).json({
          success: true,
          data: {
            products: [],
            pagination: {
              page,
              limit,
              total: 0,
              pages: 0
            }
          }
        });
      }
    }

    // Handle br_id: Convert from br_id string to ObjectId reference
    if (br_id) {
      const brand = await Brand.findOne({ br_id: br_id });
      if (brand) {
        query.br_id = brand._id;
      } else {
        return res.status(200).json({
          success: true,
          data: {
            products: [],
            pagination: { page, limit, total: 0, pages: 0 }
          }
        });
      }
    }

    // Handle player_id: Convert from player_id string to ObjectId reference
    if (player_id) {
      const player = await Player.findOne({ player_id: player_id });
      if (player) {
        query.player_id = player._id;
      } else {
        return res.status(200).json({
          success: true,
          data: {
            products: [],
            pagination: { page, limit, total: 0, pages: 0 }
          }
        });
      }
    }

    // Handle category_id: Convert from cg_id string to ObjectId reference
    if (category_id) {
      const category = await Category.findOne({ cg_id: category_id });
      if (category) {
        query.category_id = category._id;
      } else {
        return res.status(200).json({
          success: true,
          data: {
            products: [],
            pagination: { page, limit, total: 0, pages: 0 }
          }
        });
      }
    }

    if (color) query.color = { $regex: color, $options: 'i' };
    if (is_available !== undefined) query.is_available = is_available === 'true';
    
    // Filter by stock (in_stock_only parameter)
    if (in_stock_only === 'true') {
      query.pd_quantity = { $gt: 0 };
    }

    // Price range filter - Fix: Check for undefined instead of falsy
    if (min_price !== undefined || max_price !== undefined) {
      query.pd_price = {};
      if (min_price !== undefined) query.pd_price.$gte = Number(min_price);
      if (max_price !== undefined) query.pd_price.$lte = Number(max_price);
    }

    // Build sort object based on sort_by parameter
    let sortOptions = {};
    switch (sort_by) {
      case 'created_at_desc':
        sortOptions = { created_at: -1 }; // Mới nhất
        break;
      case 'created_at_asc':
        sortOptions = { created_at: 1 }; // Cũ nhất
        break;
      case 'price_asc':
        sortOptions = { pd_price: 1 }; // Giá thấp đến cao
        break;
      case 'price_desc':
        sortOptions = { pd_price: -1 }; // Giá cao đến thấp
        break;
      case 'name_asc':
        sortOptions = { pd_name: 1 }; // Tên A-Z
        break;
      case 'name_desc':
        sortOptions = { pd_name: -1 }; // Tên Z-A
        break;
      default:
        sortOptions = { created_at: -1 }; // Mặc định: mới nhất
    }

    // Get total count for pagination
    const total = await Product.countDocuments(query);

    // Get products with all references populated theo README_MongoDB.md
    const products = await Product.find(query)
      .populate('br_id', 'br_id br_name br_img')
      .populate('pdt_id', 'pdt_id pdt_name pdt_img')
      .populate('category_id', 'cg_id cg_name')
      .populate('player_id', 'player_id player_name player_img') // Có thể null
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    // Add images to each product với sắp xếp primary image đầu tiên
    const productsWithImages = await Promise.all(
      products.map(async (product) => {
        const images = await ProductImage.find({ pd_id: product._id });
        // Sắp xếp trong JavaScript: primary images lên đầu
        const sortedImages = images.sort((a, b) => {
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          return 0; // Giữ nguyên thứ tự nếu cùng loại
        });
        return {
          ...product.toObject(),
          images: sortedImages
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        products: productsWithImages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/products/:id - Get product by ID with images
  static getProductById = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id)
      .populate('br_id', 'br_id br_name br_img brand_description website_url')
      .populate('pdt_id', 'pdt_id pdt_name pdt_img pdt_note')
      .populate('category_id', 'cg_id cg_name category_description')
      .populate('player_id', 'player_id player_name player_img player_content achievements team_name position');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get product images theo README_MongoDB.md với sắp xếp primary đầu tiên
    const images = await ProductImage.find({ pd_id: product._id });
    // Sắp xếp primary images lên đầu
    const sortedImages = images.sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return 0;
    });

    res.status(200).json({
      success: true,
      data: { 
        product,
        images: sortedImages
      }
    });
  });

  // POST /api/v1/products - Create new product
  static createProduct = asyncHandler(async (req, res) => {
    // Temporary debug log
    console.log('🔍 BACKEND RECEIVED:');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Required fields check:');
    
    const {
      pd_id, pd_name, pd_price, pd_quantity, pd_note,
      br_id, pdt_id, category_id, player_id,
      product_description, stock_quantity, is_available,
      color, sku
    } = req.body;

    console.log('- pd_id:', pd_id, '(type:', typeof pd_id, ')');
    console.log('- pd_name:', pd_name, '(type:', typeof pd_name, ')');
    console.log('- pd_price:', pd_price, '(type:', typeof pd_price, ')');
    console.log('- pd_quantity:', pd_quantity, '(type:', typeof pd_quantity, ')');
    console.log('- br_id:', br_id, '(type:', typeof br_id, ')');
    console.log('- pdt_id:', pdt_id, '(type:', typeof pdt_id, ')');
    console.log('- category_id:', category_id, '(type:', typeof category_id, ')');
    console.log('- stock_quantity:', stock_quantity, '(type:', typeof stock_quantity, ')');
    console.log('- color:', color, '(type:', typeof color, ')');
    console.log('- sku:', sku, '(type:', typeof sku, ')');

    // Validate required fields theo schema
    if (!pd_id || !pd_name || pd_price === undefined || pd_quantity === undefined || 
        !br_id || !pdt_id || !category_id || stock_quantity === undefined || !color || !sku) {
      console.log('❌ VALIDATION FAILED - Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // Check unique constraints
    const existingPdId = await Product.findOne({ pd_id });
    if (existingPdId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID already exists'
      });
    }

    const existingSku = await Product.findOne({ sku });
    if (existingSku) {
      return res.status(400).json({
        success: false,
        message: 'SKU already exists'
      });
    }

    // Validate foreign key references
    const brand = await Brand.findById(br_id);
    if (!brand) {
      return res.status(400).json({
        success: false,
        message: 'Invalid brand ID'
      });
    }

    const productType = await ProductType.findById(pdt_id);
    if (!productType) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product type ID'
      });
    }

    const category = await Category.findById(category_id);
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
    }

    // Validate player_id if provided (có thể null theo README_MongoDB.md)
    if (player_id) {
      const player = await Player.findById(player_id);
      if (!player) {
        return res.status(400).json({
          success: false,
          message: 'Invalid player ID'
        });
      }
    }

    // Create product
    const product = new Product({
      pd_id,
      pd_name,
      pd_price,
      pd_quantity,
      pd_note,
      br_id,
      pdt_id,
      category_id,
      player_id: player_id || null, // Có thể null
      product_description,
      stock_quantity,
      is_available: is_available !== undefined ? is_available : true,
      color,
      sku,
      pd_day_updated: new Date(),
      created_at: new Date()
    });

    await product.save();

    // Populate references for response
    await product.populate([
      { path: 'br_id', select: 'br_id br_name' },
      { path: 'pdt_id', select: 'pdt_id pdt_name' },
      { path: 'category_id', select: 'cg_id cg_name' },
      { path: 'player_id', select: 'player_id player_name' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product }
    });
  });

  // PUT /api/v1/products/:id - Update product
  static updateProduct = asyncHandler(async (req, res) => {
    // Debug log
    console.log('🔍 BACKEND UPDATE RECEIVED:');
    console.log('Product ID:', req.params.id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const updateData = { ...req.body };
    
    // Check unique constraints if changed
    if (updateData.pd_id && updateData.pd_id !== product.pd_id) {
      const existingPdId = await Product.findOne({ pd_id: updateData.pd_id });
      if (existingPdId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID already exists'
        });
      }
    }

    if (updateData.sku && updateData.sku !== product.sku) {
      const existingSku = await Product.findOne({ sku: updateData.sku });
      if (existingSku) {
        return res.status(400).json({
          success: false,
          message: 'SKU already exists'
        });
      }
    }

    // Validate foreign keys if provided
    if (updateData.br_id && updateData.br_id !== product.br_id.toString()) {
      const brand = await Brand.findById(updateData.br_id);
      if (!brand) {
        return res.status(400).json({
          success: false,
          message: 'Invalid brand ID'
        });
      }
    }

    // Update pd_day_updated
    updateData.pd_day_updated = new Date();

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'br_id', select: 'br_id br_name' },
      { path: 'pdt_id', select: 'pdt_id pdt_name' },
      { path: 'category_id', select: 'cg_id cg_name' },
      { path: 'player_id', select: 'player_id player_name' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: { product: updatedProduct }
    });
  });

  // DELETE /api/v1/products/:id - Delete product
  static deleteProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Delete associated product images
    await ProductImage.deleteMany({ pd_id: product._id });

    await Product.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  });

  // GET /api/v1/products/:id/images - Get product images with color filter
  static getProductImages = asyncHandler(async (req, res) => {
    const { color } = req.query;
    
    let query = { pd_id: req.params.id };
    
    // Filter by color theo README_MongoDB.md
    if (color) {
      query.color = { $regex: color, $options: 'i' };
    }

    const images = await ProductImage.find(query);

    res.status(200).json({
      success: true,
      data: { images }
    });
  });

  // GET /api/v1/products/by-color/:color - Get products by color
  static getProductsByColor = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const color = req.params.color;

    const query = { color: { $regex: color, $options: 'i' } };
    
    const total = await Product.countDocuments(query);

    const products = await Product.find(query)
      .populate('br_id', 'br_id br_name')
      .populate('pdt_id', 'pdt_id pdt_name')
      .populate('category_id', 'cg_id cg_name')
      .populate('player_id', 'player_id player_name')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        products: productsWithImages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/products/by-player/:playerId - Get products by player
  static getProductsByPlayer = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const playerId = req.params.playerId;

    // Validate player exists
    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    const query = { player_id: playerId };
    
    const total = await Product.countDocuments(query);

    const products = await Product.find(query)
      .populate('br_id', 'br_id br_name')
      .populate('pdt_id', 'pdt_id pdt_name')
      .populate('category_id', 'cg_id cg_name')
      .populate('player_id', 'player_id player_name player_img')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        products: productsWithImages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // DELETE /api/v1/products/:id - Delete product (Admin only)
  static deleteProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check if product exists
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Delete related product images first
    await ProductImage.deleteMany({ pd_id: id });

    // Delete the product
    await Product.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: `Product "${product.pd_name}" deleted successfully`
    });
  });
}

module.exports = ProductController;
