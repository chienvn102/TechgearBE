// LOUDINARY UPLOAD CONTROLLER
// - Upload controller với Cloudinary integration

const { validationResult } = require('express-validator');
const ProductImage = require('../models/ProductImage');
const Product = require('../models/Product');
const storageService = require('../services/storageService');

class CloudinaryUploadController {

  //UPLOAD PRODUCT IMAGE: Sử dụng storageService để upload lên Cloudinary
  async uploadProductImage(req, res) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }

      const { pd_id, color, is_primary = false, pdi_note } = req.body;

      // Verify product exists
      const product = await Product.findById(pd_id);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      console.log(`Uploading image for product ${pd_id}, color: ${color}`);

      // Upload image using storage service (will use Cloudinary if configured)
      const uploadResult = await storageService.uploadImage(req.file, {
        pd_id,
        color,
        is_primary: Boolean(is_primary)
      });

      if (!uploadResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Image upload failed',
          error: uploadResult.error
        });
      }

      // Create database record with Cloudinary data
      const productImageData = {
        pd_id: pd_id,
        img: uploadResult.url || uploadResult.secure_url, // Backward compatibility
        color: color,
        storage_type: uploadResult.storage_type,
        img_metadata: {
          sizes: uploadResult.sizes,
          format: uploadResult.metadata?.format,
          width: uploadResult.metadata?.width,
          height: uploadResult.metadata?.height,
          bytes: uploadResult.metadata?.bytes
        }
      };

      // Check if this is the first image for this product
      const existingImagesCount = await ProductImage.countDocuments({ pd_id: pd_id });
      if (existingImagesCount === 0) {
        productImageData.is_primary = true; // Set first image as primary
      }

      // Add Cloudinary specific fields if using Cloudinary
      if (uploadResult.storage_type === 'cloudinary') {
        productImageData.cloudinary_public_id = uploadResult.public_id;
        productImageData.cloudinary_url = uploadResult.url;
        productImageData.cloudinary_secure_url = uploadResult.secure_url;
      }

      if (pdi_note) {
        productImageData.pdi_note = pdi_note;
      }

      // Save to database
      const productImage = new ProductImage(productImageData);
      const savedImage = await productImage.save();

      console.log('Product image saved:', savedImage._id);

      // Return response with image URLs
      const response = {
        success: true,
        message: 'Image uploaded successfully',
        data: {
          product_image: savedImage,
          image_urls: uploadResult.sizes,
          storage_type: uploadResult.storage_type
        }
      };

      if (uploadResult.storage_type === 'cloudinary') {
        response.data.cloudinary_public_id = uploadResult.public_id;
      }

      res.status(201).json(response);

    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during upload',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Upload failed'
      });
    }
  }

  // ✅ UPLOAD MULTIPLE IMAGES: Batch upload với Cloudinary
  async uploadMultipleProductImages(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No image files provided'
        });
      }

      const { pd_id, colors } = req.body;
      const colorArray = colors ? JSON.parse(colors) : [];

      // Verify product exists
      const product = await Product.findById(pd_id);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      console.log(`📸 Uploading ${req.files.length} images for product ${pd_id}`);

      const uploadPromises = req.files.map(async (file, index) => {
        try {
          const color = colorArray[index] || 'default';
          
          const uploadResult = await storageService.uploadImage(file, {
            pd_id,
            color,
            is_primary: index === 0 // First image is primary
          });

          if (!uploadResult.success) {
            throw new Error(`Upload failed for file ${index}: ${uploadResult.error}`);
          }

          // Create database record
          const productImageData = {
            pd_id: pd_id,
            img: uploadResult.url || uploadResult.secure_url,
            color: color,
            storage_type: uploadResult.storage_type,
            img_metadata: {
              sizes: uploadResult.sizes,
              format: uploadResult.metadata?.format,
              width: uploadResult.metadata?.width,
              height: uploadResult.metadata?.height,
              bytes: uploadResult.metadata?.bytes
            }
          };

          if (uploadResult.storage_type === 'cloudinary') {
            productImageData.cloudinary_public_id = uploadResult.public_id;
            productImageData.cloudinary_url = uploadResult.url;
            productImageData.cloudinary_secure_url = uploadResult.secure_url;
          }

          const productImage = new ProductImage(productImageData);
          const savedImage = await productImage.save();

          return {
            success: true,
            image: savedImage,
            urls: uploadResult.sizes,
            storage_type: uploadResult.storage_type
          };

        } catch (error) {
          console.error(`❌ Error uploading file ${index}:`, error);
          return {
            success: false,
            error: error.message,
            file_index: index
          };
        }
      });

      const results = await Promise.all(uploadPromises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      res.status(200).json({
        success: true,
        message: `Uploaded ${successful.length} of ${req.files.length} images`,
        data: {
          successful_uploads: successful.length,
          failed_uploads: failed.length,
          results: results
        }
      });

    } catch (error) {
      console.error('❌ Multiple upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during multiple upload',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Upload failed'
      });
    }
  }

  // ✅ DELETE PRODUCT IMAGE: Xóa từ Cloudinary và database
  async deleteProductImage(req, res) {
    try {
      const { pdi_id } = req.params;

      // Find image in database
      const productImage = await ProductImage.findById(pdi_id);
      if (!productImage) {
        return res.status(404).json({
          success: false,
          message: 'Product image not found'
        });
      }

      console.log(`🗑️ Deleting image ${pdi_id}, storage: ${productImage.storage_type}`);

      // Delete from storage (Cloudinary or local)
      const deleteResult = await storageService.deleteImage(productImage);
      
      if (!deleteResult.success) {
        console.warn('⚠️ Storage deletion failed, continuing with database deletion');
      }

      // Delete from database
      await ProductImage.findByIdAndDelete(pdi_id);

      res.json({
        success: true,
        message: 'Image deleted successfully',
        data: {
          deleted_image_id: pdi_id,
          storage_deletion: deleteResult.success
        }
      });

    } catch (error) {
      console.error('❌ Delete error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting image',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Delete failed'
      });
    }
  }

  // ✅ SET DEFAULT IMAGE: Set an image as default for a product
  async setDefaultImage(req, res) {
    try {
      const { imageId } = req.params;

      // Find the image
      const image = await ProductImage.findById(imageId);
      if (!image) {
        return res.status(404).json({
          success: false,
          message: 'Image not found'
        });
      }

      // Unset all other default images for this product
      await ProductImage.updateMany(
        { pd_id: image.pd_id, _id: { $ne: imageId } },
        { is_default: false }
      );

      // Set this image as default
      image.is_default = true;
      await image.save();

      res.json({
        success: true,
        message: 'Image set as default successfully',
        data: {
          image_id: imageId,
          product_id: image.pd_id,
          is_default: true
        }
      });

    } catch (error) {
      console.error('❌ Set default error:', error);
      res.status(500).json({
        success: false,
        message: 'Error setting default image',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Set default failed'
      });
    }
  }

  // ✅ UPLOAD BRAND IMAGE: Upload ảnh cho brand
  async uploadBrandImage(req, res) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }

      const { brand_id, brand_name } = req.body;

      console.log(`📸 Uploading brand image for brand ${brand_id || brand_name}`);

      // Upload image using storage service for brand
      const uploadResult = await storageService.uploadBrandImage(req.file, brand_id);

      if (!uploadResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Brand image upload failed',
          error: uploadResult.error
        });
      }

      console.log('✅ Brand image uploaded successfully');

      // Return response with image URLs
      const response = {
        success: true,
        message: 'Brand image uploaded successfully',
        data: {
          image_urls: uploadResult.sizes,
          storage_type: uploadResult.storage_type
        }
      };

      if (uploadResult.storage_type === 'cloudinary') {
        response.data.cloudinary_public_id = uploadResult.public_id;
      }

      res.status(201).json(response);

    } catch (error) {
      console.error('❌ Brand upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during brand upload',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Upload failed'
      });
    }
  }

  // ✅ GET STORAGE STATS: Thống kê Cloudinary usage
  async getStorageStats(req, res) {
    try {
      const stats = await storageService.getStorageStats();
      
      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('❌ Stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting storage stats',
        error: error.message
      });
    }
  }
}

module.exports = new CloudinaryUploadController();
