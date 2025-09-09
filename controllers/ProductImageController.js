// controllers/ProductImageController.js  
// CRUD controller cho product_image collection 

const { ProductImage, Product } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const path = require('path');

class ProductImageController {
  // GET /api/v1/product-images - Get all product images with pagination and filtering
  static getAllProductImages = async (req, res) => {
    try {
      const { page = 1, limit = 20, search, pd_id, is_primary } = req.query;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      let query = {};
      
      if (search) {
        query.$or = [
          { img: { $regex: search, $options: 'i' } },
          { color: { $regex: search, $options: 'i' } }
        ];
      }

      if (pd_id) {
        query.pd_id = pd_id;
      }

      const total = await ProductImage.countDocuments(query);

      const images = await ProductImage.find(query)
        .populate('pd_id', 'pd_name pd_code')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum);

      res.status(200).json({
        success: true,
        data: {
          images,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching product images',
        error: error.message
      });
    }
  };

  // GET /api/v1/product-images/:id - Get product image by ID
  static getProductImageById = asyncHandler(async (req, res) => {
    const image = await ProductImage.findById(req.params.id)
      .populate('pd_id', 'pd_name pd_code pd_description');

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Product image not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { image }
    });
  });

  // POST /api/v1/product-images - Create new product image (theo MongoDB schema: pd_id, img, color)
  static createProductImage = asyncHandler(async (req, res) => {
    const {
      pd_id,
      img,
      color
    } = req.body;

    if (!pd_id || !img || !color) {
      return res.status(400).json({
        success: false,
        message: 'Product ID, image filename, and color are required'
      });
    }

    // Verify product exists
    const product = await Product.findById(pd_id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Tạo product image theo schema MongoDB (chỉ pd_id, img, color)
    const image = new ProductImage({
      pd_id,
      img,
      color
    });

    await image.save();

    // Populate product info for response
    await image.populate('pd_id', 'pd_name pd_code');

    res.status(201).json({
      success: true,
      message: 'Product image created successfully',
      data: { image }
    });
  });

  // PUT /api/v1/product-images/:id - Update product image
  static updateProductImage = asyncHandler(async (req, res) => {
    const {
      image_url,
      alt_text,
      is_primary,
      sort_order
    } = req.body;

    const image = await ProductImage.findById(req.params.id);
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Product image not found'
      });
    }

    // Validate image URL if provided
    if (image_url) {
      const validImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
      const imageExtension = path.extname(image_url.toLowerCase());
      
      if (!validImageExtensions.includes(imageExtension) && !image_url.startsWith('http')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid image URL format'
        });
      }
    }

    // If setting as primary, unset other primary images for this product
    if (is_primary === true) {
      await ProductImage.updateMany(
        { pd_id: image.pd_id, _id: { $ne: image._id }, is_primary: true },
        { is_primary: false }
      );
    }

    // Check if trying to unset primary when it's the only image
    if (is_primary === false && image.is_primary) {
      const imageCount = await ProductImage.countDocuments({ pd_id: image.pd_id });
      if (imageCount === 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot unset primary for the only image. Product must have at least one primary image.'
        });
      }

      // If unsetting primary, set another image as primary
      const anotherImage = await ProductImage.findOne({
        pd_id: image.pd_id,
        _id: { $ne: image._id }
      }).sort({ sort_order: 1 });

      if (anotherImage) {
        anotherImage.is_primary = true;
        await anotherImage.save();
      }
    }

    // Update fields
    if (image_url) image.image_url = image_url;
    if (alt_text !== undefined) image.alt_text = alt_text;
    if (is_primary !== undefined) image.is_primary = is_primary;
    if (sort_order !== undefined) image.sort_order = sort_order;

    await image.save();
    await image.populate('pd_id', 'pd_name pd_code');

    res.status(200).json({
      success: true,
      message: 'Product image updated successfully',
      data: { image }
    });
  });

  // DELETE /api/v1/product-images/:id - Delete product image
  static deleteProductImage = asyncHandler(async (req, res) => {
    const image = await ProductImage.findById(req.params.id);
    
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Product image not found'
      });
    }

    // Check if this is the primary image
    if (image.is_primary) {
      const imageCount = await ProductImage.countDocuments({ pd_id: image.pd_id });
      
      if (imageCount > 1) {
        // Set another image as primary before deleting
        const anotherImage = await ProductImage.findOne({
          pd_id: image.pd_id,
          _id: { $ne: image._id }
        }).sort({ sort_order: 1 });

        if (anotherImage) {
          anotherImage.is_primary = true;
          await anotherImage.save();
        }
      }
    }

    await ProductImage.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Product image deleted successfully'
    });
  });

  // GET /api/v1/products/:productId/images - Get images for specific product
  static getProductImages = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const { include_primary_first } = req.query;

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    let sortQuery = { sort_order: 1, created_at: 1 };
    if (include_primary_first === 'true') {
      sortQuery = { is_primary: -1, sort_order: 1, created_at: 1 };
    }

    const images = await ProductImage.find({ pd_id: productId })
      .sort(sortQuery);

    res.status(200).json({
      success: true,
      data: {
        product: {
          _id: product._id,
          pd_name: product.pd_name,
          pd_code: product.pd_code
        },
        images,
        total: images.length,
        primary_image: images.find(img => img.is_primary) || null
      }
    });
  });

  // GET /api/v1/products/:productId/images/primary - Get primary image for product
  static getProductPrimaryImage = asyncHandler(async (req, res) => {
    const { productId } = req.params;

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const primaryImage = await ProductImage.findOne({
      pd_id: productId,
      is_primary: true
    });

    if (!primaryImage) {
      return res.status(404).json({
        success: false,
        message: 'No primary image found for this product'
      });
    }

    res.status(200).json({
      success: true,
      data: { image: primaryImage }
    });
  });

  // PUT /api/v1/product-images/:id/set-primary - Set image as primary
  static setAsPrimary = asyncHandler(async (req, res) => {
    const image = await ProductImage.findById(req.params.id);
    
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Product image not found'
      });
    }

    if (image.is_primary) {
      return res.status(400).json({
        success: false,
        message: 'Image is already the primary'
      });
    }

    // Unset other primary images for this product
    await ProductImage.updateMany(
      { pd_id: image.pd_id, is_primary: true },
      { is_primary: false }
    );

    // Set this image as primary
    image.is_primary = true;
    await image.save();
    await image.populate('pd_id', 'pd_name pd_code');

    res.status(200).json({
      success: true,
      message: 'Image set as primary successfully',
      data: { image }
    });
  });

  // PUT /api/v1/product-images/reorder - Reorder product images
  static reorderProductImages = asyncHandler(async (req, res) => {
    const { pd_id, image_orders } = req.body;

    if (!pd_id || !Array.isArray(image_orders)) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and image orders array are required'
      });
    }

    // Verify product exists
    const product = await Product.findById(pd_id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const updatePromises = image_orders.map(async (item) => {
      if (!item.image_id || item.sort_order === undefined) {
        throw new Error('Each item must have image_id and sort_order');
      }

      return ProductImage.findByIdAndUpdate(
        item.image_id,
        { sort_order: item.sort_order },
        { new: true }
      );
    });

    const updatedImages = await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      message: 'Product images reordered successfully',
      data: { images: updatedImages }
    });
  });

  // GET /api/v1/product-images/statistics - Get product image statistics
  static getProductImageStatistics = asyncHandler(async (req, res) => {
    const totalImages = await ProductImage.countDocuments();
    
    // Products with multiple images
    const productsWithMultipleImages = await ProductImage.aggregate([
      {
        $group: {
          _id: '$pd_id',
          image_count: { $sum: 1 }
        }
      },
      {
        $match: {
          image_count: { $gt: 1 }
        }
      },
      {
        $count: 'products_with_multiple'
      }
    ]);

    // Image distribution by product
    const imageDistribution = await ProductImage.aggregate([
      {
        $group: {
          _id: '$pd_id',
          image_count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$image_count',
          product_count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Primary images count
    const primaryImagesCount = await ProductImage.countDocuments({ is_primary: true });

    // Products without images
    const totalProducts = await Product.countDocuments();
    const productsWithImages = await ProductImage.distinct('pd_id');
    const productsWithoutImages = totalProducts - productsWithImages.length;

    // Image format distribution
    const imageFormats = await ProductImage.aggregate([
      {
        $project: {
          extension: {
            $toLower: {
              $arrayElemAt: [
                { $split: ['$image_url', '.'] },
                -1
              ]
            }
          }
        }
      },
      {
        $group: {
          _id: '$extension',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalImages,
        primaryImagesCount,
        productsWithoutImages,
        productsWithMultipleImages: productsWithMultipleImages[0]?.products_with_multiple || 0,
        imageDistribution,
        imageFormats
      }
    });
  });

  // POST /api/v1/product-images/bulk-create - Create multiple images for a product
  static bulkCreateImages = asyncHandler(async (req, res) => {
    const { pd_id, images } = req.body;

    if (!pd_id || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and images array are required'
      });
    }

    // Verify product exists
    const product = await Product.findById(pd_id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const results = [];
    const errors = [];

    // Check existing image count
    const existingCount = await ProductImage.countDocuments({ pd_id });
    
    for (let i = 0; i < images.length; i++) {
      try {
        const imageData = images[i];
        
        if (!imageData.image_url) {
          errors.push({
            index: i,
            error: 'Image URL is required'
          });
          continue;
        }

        const shouldBePrimary = (existingCount + results.length) === 0 || imageData.is_primary;

        // If setting as primary, unset others
        if (shouldBePrimary) {
          await ProductImage.updateMany(
            { pd_id, is_primary: true },
            { is_primary: false }
          );
          
          // Also unset primary in current batch
          results.forEach(img => img.is_primary = false);
        }

        const image = new ProductImage({
          pd_id,
          image_url: imageData.image_url,
          alt_text: imageData.alt_text || '',
          is_primary: shouldBePrimary,
          sort_order: imageData.sort_order || (existingCount + results.length + 1),
          created_at: new Date()
        });

        await image.save();
        results.push(image);

      } catch (error) {
        errors.push({
          index: i,
          error: error.message
        });
      }
    }

    res.status(results.length > 0 ? 201 : 400).json({
      success: results.length > 0,
      message: `Bulk create completed. ${results.length} success, ${errors.length} errors`,
      data: {
        created: results,
        errors: errors
      }
    });
  });
}

module.exports = ProductImageController;
