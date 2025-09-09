//  BRAND UPLOAD CONTROLLER
//Brand image upload với Cloudinary

const { validationResult } = require('express-validator');
const Brand = require('../models/Brand');
const storageService = require('../services/storageService');

class BrandUploadController {

  // UPLOAD BRAND LOGO: Upload logo cho brand
  async uploadBrandLogo(req, res) {
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

      const { brand_id } = req.body;

      // Verify brand exists
      const brand = await Brand.findOne({ br_id: brand_id });
      if (!brand) {
        return res.status(404).json({
          success: false,
          message: 'Brand not found'
        });
      }

      console.log(`Uploading logo for brand ${brand_id}`);

      // Upload image using storage service
      const uploadResult = await storageService.uploadBrandImage(req.file, brand_id);

      if (!uploadResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Brand logo upload failed',
          error: uploadResult.error
        });
      }

      // Update brand with new image data
      const updateData = {
        br_img: uploadResult.url || uploadResult.secure_url,
        storage_type: uploadResult.storage_type,
        img_metadata: {
          sizes: uploadResult.sizes,
          format: uploadResult.metadata?.format,
          width: uploadResult.metadata?.width,
          height: uploadResult.metadata?.height,
          bytes: uploadResult.metadata?.bytes
        }
      };

      // Add Cloudinary specific fields if using Cloudinary
      if (uploadResult.storage_type === 'cloudinary') {
        updateData.cloudinary_public_id = uploadResult.public_id;
        updateData.cloudinary_url = uploadResult.url;
        updateData.cloudinary_secure_url = uploadResult.secure_url;
      }

      // Update brand in database
      const updatedBrand = await Brand.findOneAndUpdate(
        { br_id: brand_id },
        updateData,
        { new: true }
      );

      console.log('Brand logo updated:', updatedBrand._id);

      res.status(200).json({
        success: true,
        message: 'Brand logo uploaded successfully',
        data: {
          brand: updatedBrand,
          image_urls: uploadResult.sizes,
          storage_type: uploadResult.storage_type
        }
      });

    } catch (error) {
      console.error('Brand upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during brand logo upload',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Upload failed'
      });
    }
  }

  //DELETE BRAND LOGO: Xóa logo brand
  async deleteBrandLogo(req, res) {
    try {
      const { brand_id } = req.params;

      // Find brand
      const brand = await Brand.findOne({ br_id: brand_id });
      if (!brand) {
        return res.status(404).json({
          success: false,
          message: 'Brand not found'
        });
      }

      console.log(`Deleting logo for brand ${brand_id}`);

      // Delete from storage if exists
      if (brand.storage_type === 'cloudinary' && brand.cloudinary_public_id) {
        try {
          await storageService.deleteImage({
            storage_type: 'cloudinary',
            cloudinary_public_id: brand.cloudinary_public_id
          });
        } catch (error) {
          console.warn('Storage deletion failed:', error.message);
        }
      }

      // Update brand to remove image data
      const updatedBrand = await Brand.findOneAndUpdate(
        { br_id: brand_id },
        {
          $unset: {
            br_img: '',
            cloudinary_public_id: '',
            cloudinary_url: '',
            cloudinary_secure_url: '',
            img_metadata: ''
          },
          storage_type: 'local'
        },
        { new: true }
      );

      res.json({
        success: true,
        message: 'Brand logo deleted successfully',
        data: {
          brand: updatedBrand
        }
      });

    } catch (error) {
      console.error('Brand delete error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting brand logo',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Delete failed'
      });
    }
  }

  // GET BRAND WITH LOGO URLS: Trả về brand với logo URLs
  async getBrandWithLogo(req, res) {
    try {
      const { brand_id } = req.params;

      const brand = await Brand.findOne({ br_id: brand_id });
      if (!brand) {
        return res.status(404).json({
          success: false,
          message: 'Brand not found'
        });
      }

      // Generate logo URLs based on storage type
      let logoUrls = null;
      if (brand.br_img) {
        logoUrls = storageService.getImageUrls(brand, 'medium');
      }

      res.json({
        success: true,
        data: {
          brand: brand,
          logo_urls: logoUrls
        }
      });

    } catch (error) {
      console.error('Get brand error:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting brand',
        error: error.message
      });
    }
  }
}

module.exports = new BrandUploadController();
