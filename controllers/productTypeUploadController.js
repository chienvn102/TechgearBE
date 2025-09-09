// controllers/productTypeUploadController.js
// Cloudinary upload controller cho Product Type images 

const { cloudinary } = require('../config/cloudinary.config');
const { ProductType } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

class ProductTypeUploadController {
  // POST /api/v1/upload/product-type/:id - Upload product type image
  static uploadProductTypeImage = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validate product type exists
    const productType = await ProductType.findById(id);
    if (!productType) {
      return res.status(404).json({
        success: false,
        message: 'Product type not found'
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    try {
      // Delete old image from Cloudinary if exists
      if (productType.pdt_img && productType.cloudinary_public_id) {
        try {
          await cloudinary.uploader.destroy(productType.cloudinary_public_id);
        } catch (deleteError) {
          console.log('Error deleting old image:', deleteError);
          // Continue with upload even if delete fails
        }
      }

      // Upload to Cloudinary with product-types folder
      // Handle both buffer (memory storage) and file path (disk storage)
      let uploadSource;
      if (req.file.buffer) {
        // For memory storage, convert buffer to base64
        uploadSource = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      } else {
        // For disk storage, use file path
        uploadSource = req.file.path;
      }
      
      const uploadResult = await cloudinary.uploader.upload(uploadSource, {
        folder: 'gaming-gear/product-types',
        public_id: `product-type-${productType.pdt_id}-${Date.now()}`,
        transformation: [
          { width: 800, height: 600, crop: 'fit', quality: 'auto' },
          { format: 'auto' }
        ],
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp']
      });

      // Update product type with new image info
      productType.pdt_img = uploadResult.secure_url;
      productType.cloudinary_public_id = uploadResult.public_id;
      
      await productType.save();

      res.status(200).json({
        success: true,
        message: 'Product type image uploaded successfully',
        data: {
          productType: {
            _id: productType._id,
            pdt_id: productType.pdt_id,
            pdt_name: productType.pdt_name,
            pdt_img: productType.pdt_img,
            cloudinary_public_id: productType.cloudinary_public_id
          },
          cloudinary: {
            public_id: uploadResult.public_id,
            secure_url: uploadResult.secure_url,
            width: uploadResult.width,
            height: uploadResult.height,
            format: uploadResult.format,
            bytes: uploadResult.bytes
          }
        }
      });

    } catch (uploadError) {
      console.error('Cloudinary upload error:', uploadError);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to upload image to Cloudinary',
        error: uploadError.message
      });
    }
  });

  // DELETE /api/v1/upload/product-type/:id - Delete product type image
  static deleteProductTypeImage = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const productType = await ProductType.findById(id);
    if (!productType) {
      return res.status(404).json({
        success: false,
        message: 'Product type not found'
      });
    }

    if (!productType.pdt_img || !productType.cloudinary_public_id) {
      return res.status(400).json({
        success: false,
        message: 'Product type has no image to delete'
      });
    }

    try {
      // Delete from Cloudinary
      await cloudinary.uploader.destroy(productType.cloudinary_public_id);

      // Update product type - remove image info
      productType.pdt_img = null;
      productType.cloudinary_public_id = null;
      
      await productType.save();

      res.status(200).json({
        success: true,
        message: 'Product type image deleted successfully',
        data: {
          productType: {
            _id: productType._id,
            pdt_id: productType.pdt_id,
            pdt_name: productType.pdt_name,
            pdt_img: productType.pdt_img
          }
        }
      });

    } catch (deleteError) {
      console.error('Cloudinary delete error:', deleteError);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to delete image from Cloudinary',
        error: deleteError.message
      });
    }
  });

  // GET /api/v1/upload/product-type/:id/image-info - Get product type image info
  static getProductTypeImageInfo = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const productType = await ProductType.findById(id).select('pdt_id pdt_name pdt_img cloudinary_public_id');
    if (!productType) {
      return res.status(404).json({
        success: false,
        message: 'Product type not found'
      });
    }

    // Generate different sizes URLs if image exists
    let imageVariants = null;
    if (productType.pdt_img && productType.cloudinary_public_id) {
      const baseUrl = productType.pdt_img.split('/upload/')[0] + '/upload/';
      const imagePath = productType.pdt_img.split('/upload/')[1];
      
      imageVariants = {
        original: productType.pdt_img,
        thumbnail: `${baseUrl}w_150,h_150,c_fill,f_auto,q_auto/${imagePath}`,
        medium: `${baseUrl}w_400,h_400,c_fit,f_auto,q_auto/${imagePath}`,
        large: `${baseUrl}w_800,h_600,c_fit,f_auto,q_auto/${imagePath}`
      };
    }

    res.status(200).json({
      success: true,
      data: {
        productType: {
          _id: productType._id,
          pdt_id: productType.pdt_id,
          pdt_name: productType.pdt_name,
          pdt_img: productType.pdt_img,
          cloudinary_public_id: productType.cloudinary_public_id,
          has_image: !!productType.pdt_img
        },
        imageVariants
      }
    });
  });
}

module.exports = ProductTypeUploadController;
