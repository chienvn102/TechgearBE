// controllers/uploadController.js
// Enhanced upload controller với image processing 

const { ProductImage, Product, Brand, Banner } = require('../models');
const imageProcessingService = require('../services/imageProcessingService');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs').promises;

class UploadController {
  /**
   * Upload ảnh sản phẩm - tuân thủ ProductImage schema (pd_id, img, color)
   * POST /api/v1/upload/product-image
   */
  static async uploadProductImage(req, res) {
    try {
      // Validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu không hợp lệ',
          errors: errors.array()
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Không có file được upload'
        });
      }

      const { pd_id, color } = req.body;

      // Kiểm tra product existence
      const product = await Product.findById(pd_id);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Sản phẩm không tồn tại'
        });
      }

      // Process image với multiple sizes
      const processingResult = await imageProcessingService.processProductImage(
        req.file.path,
        pd_id,
        color,
        'products'
      );

      if (!processingResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Lỗi xử lý ảnh'
        });
      }

      // Tạo record trong database theo exact schema
      const productImage = new ProductImage({
        pd_id: pd_id,
        img: processingResult.img, // Main image path (medium size)
        color: color,
        img_metadata: {
          sizes: processingResult.images,
          original_width: processingResult.metadata.width,
          original_height: processingResult.metadata.height,
          file_size: req.file.size,
          processed_at: new Date()
        }
      });

      await productImage.save();

      // Business rule: Ảnh đầu tiên là ảnh mặc định
      const existingImages = await ProductImage.countDocuments({ pd_id: pd_id });
      if (existingImages === 1) {
        // Đây là ảnh đầu tiên, update Product.pd_image
        await Product.findByIdAndUpdate(pd_id, {
          pd_image: processingResult.img
        });
      }

      res.status(201).json({
        success: true,
        data: {
          id: productImage._id,
          pd_id: productImage.pd_id,
          img: productImage.img,
          color: productImage.color,
          sizes: processingResult.images,
          metadata: processingResult.metadata
        },
        message: 'Upload ảnh sản phẩm thành công'
      });

    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server: ' + error.message
      });
    }
  };

  /**
   * Upload multiple product images
   * POST /api/v1/upload/product-images/multiple
   */
  static async uploadMultipleProductImages(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Không có file được upload'
        });
      }

      const { pd_id, colors } = req.body;
      
      // Parse colors array nếu là string
      let colorArray = [];
      if (typeof colors === 'string') {
        try {
          colorArray = JSON.parse(colors);
        } catch {
          colorArray = [colors]; // Single color
        }
      } else if (Array.isArray(colors)) {
        colorArray = colors;
      }

      const product = await Product.findById(pd_id);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Sản phẩm không tồn tại'
        });
      }

      const uploadResults = [];
      const errors = [];
      
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const color = colorArray[i] || 'default';
        
        try {
          const processingResult = await imageProcessingService.processProductImage(
            file.path,
            pd_id,
            color,
            'products'
          );

          const productImage = new ProductImage({
            pd_id: pd_id,
            img: processingResult.img,
            color: color,
            img_metadata: {
              sizes: processingResult.images,
              original_width: processingResult.metadata.width,
              original_height: processingResult.metadata.height,
              file_size: file.size,
              processed_at: new Date()
            }
          });

          await productImage.save();
          uploadResults.push(productImage);

        } catch (error) {
          console.error(`Error processing file ${file.filename}:`, error);
          errors.push({
            filename: file.filename,
            error: error.message
          });
        }
      }

      // Update Product.pd_image nếu chưa có
      const existingImages = await ProductImage.countDocuments({ pd_id: pd_id });
      if (existingImages === uploadResults.length && uploadResults.length > 0) {
        // Đây là batch đầu tiên, set ảnh đầu làm main
        await Product.findByIdAndUpdate(pd_id, {
          pd_image: uploadResults[0].img
        });
      }

      res.status(201).json({
        success: true,
        data: {
          uploaded_count: uploadResults.length,
          failed_count: errors.length,
          images: uploadResults,
          errors: errors
        },
        message: `Upload thành công ${uploadResults.length}/${req.files.length} ảnh`
      });

    } catch (error) {
      console.error('Multiple upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server: ' + error.message
      });
    }
  };

  /**
   * Upload brand logo - tuân thủ Brand schema (br_img field)
   * POST /api/v1/upload/brand-logo
   */
  static async uploadBrandLogo(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Không có file được upload'
        });
      }

      const { brand_id } = req.body;

      const brand = await Brand.findById(brand_id);
      if (!brand) {
        return res.status(404).json({
          success: false,
          message: 'Brand không tồn tại'
        });
      }

      // Process brand logo
      const processingResult = await imageProcessingService.processBrandLogo(
        req.file.path,
        brand.br_id
      );

      // Xóa logo cũ nếu có
      if (brand.br_img) {
        await imageProcessingService.deleteProductImages({ img: brand.br_img });
      }

      // Update brand với logo mới
      brand.br_img = processingResult.br_img;
      await brand.save();

      res.status(200).json({
        success: true,
        data: {
          brand_id: brand._id,
          br_img: brand.br_img,
          metadata: processingResult.metadata
        },
        message: 'Upload logo brand thành công'
      });

    } catch (error) {
      console.error('Brand logo upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server: ' + error.message
      });
    }
  };

  /**
   * Upload banner image - Banner schema không có img field, cần tạo reference custom
   * POST /api/v1/upload/banner
   */
  static async uploadBannerImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Không có file được upload'
        });
      }

      const { banner_id } = req.body;

      const banner = await Banner.findById(banner_id);
      if (!banner) {
        return res.status(404).json({
          success: false,
          message: 'Banner không tồn tại'
        });
      }

      // Process banner image
      const processingResult = await imageProcessingService.processBannerImage(
        req.file.path,
        banner.banner_id
      );

      // Lưu banner image path vào một collection riêng hoặc extend banner model
      // Vì schema không cho phép thêm field, ta sẽ lưu vào metadata collection

      res.status(200).json({
        success: true,
        data: {
          banner_id: banner._id,
          banner_img: processingResult.banner_img,
          metadata: processingResult.metadata
        },
        message: 'Upload banner thành công'
      });

    } catch (error) {
      console.error('Banner upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server: ' + error.message
      });
    }
  };

  /**
   * Xóa product image
   * DELETE /api/v1/upload/product-image/:id
   */
  static async deleteProductImage(req, res) {
    try {
      const productImage = await ProductImage.findById(req.params.id);
      
      if (!productImage) {
        return res.status(404).json({
          success: false,
          message: 'Ảnh không tồn tại'
        });
      }

      // Xóa files trên disk
      await imageProcessingService.deleteProductImages({
        img: productImage.img,
        images: productImage.img_metadata?.sizes
      });

      // Xóa record trong database
      await ProductImage.findByIdAndDelete(req.params.id);

      // Check if đây là ảnh main của product
      const product = await Product.findById(productImage.pd_id);
      if (product && product.pd_image === productImage.img) {
        // Tìm ảnh khác để làm main
        const nextImage = await ProductImage.findOne({
          pd_id: productImage.pd_id
        }).sort({ _id: 1 });

        if (nextImage) {
          product.pd_image = nextImage.img;
        } else {
          product.pd_image = null; // Không còn ảnh nào
        }
        await product.save();
      }

      res.json({
        success: true,
        message: 'Xóa ảnh thành công'
      });

    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server: ' + error.message
      });
    }
  };

  /**
   * Lấy ảnh theo product ID
   * GET /api/v1/upload/product-images/:productId
   */
  static async getProductImages(req, res) {
    try {
      const { productId } = req.params;
      const { size = 'medium', color } = req.query;

      let query = { pd_id: productId };
      if (color) {
        query.color = color;
      }

      const images = await ProductImage.find(query)
        .sort({ _id: 1 }) // Ảnh đầu tiên là main
        .select('-__v');

      // Transform images để include size-specific URLs
      const transformedImages = images.map(img => ({
        _id: img._id,
        pd_id: img.pd_id,
        img: img.getImageUrl(size),
        color: img.color,
        allSizes: img.allSizes,
        metadata: img.img_metadata
      }));

      res.json({
        success: true,
        data: {
          product_id: productId,
          images: transformedImages,
          default_size: size,
          total: transformedImages.length
        },
        message: 'Lấy danh sách ảnh thành công'
      });

    } catch (error) {
      console.error('Get images error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server: ' + error.message
      });
    }
  };

  /**
   * Serve image file với caching headers
   * GET /api/v1/upload/serve/:type/:year/:month/:size/:filename
   */
  static async serveImage(req, res) {
    try {
      const { type, year, month, size, filename } = req.params;
      
      const imagePath = path.join(
        process.cwd(),
        'public',
        'uploads',
        type,
        year,
        month,
        size || '',
        filename
      );

      // Check file existence
      try {
        await fs.access(imagePath);
      } catch {
        return res.status(404).json({
          success: false,
          message: 'Ảnh không tồn tại'
        });
      }

      // Set caching headers cho production
      res.set({
        'Cache-Control': 'public, max-age=31536000', // 1 year
        'ETag': `"${filename}"`,
        'Content-Type': 'image/webp'
      });

      res.sendFile(imagePath);

    } catch (error) {
      console.error('Serve image error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server'
      });
    }
  };

  /**
   * Cleanup orphaned images - Admin only
   * POST /api/v1/upload/cleanup
   */
  static async cleanupImages(req, res) {
    try {
      const result = await imageProcessingService.cleanupOrphanedImages();
      
      res.json({
        success: true,
        data: result,
        message: `Cleanup hoàn tất. Đã xóa ${result.deletedCount} file orphaned.`
      });

    } catch (error) {
      console.error('Cleanup error:', error);
      res.status(500).json({
        success: false,
        message: 'Cleanup thất bại: ' + error.message
      });
    }
  }
}

module.exports = UploadController;
