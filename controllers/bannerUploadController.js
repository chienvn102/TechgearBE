//  BANNER UPLOAD CONTROLLER
//Banner image upload với Cloudinary

const { validationResult } = require('express-validator');
const Banner = require('../models/Banner');
const storageService = require('../services/storageService');

class BannerUploadController {

  // UPLOAD BANNER IMAGE: Upload image cho banner
  async uploadBannerImage(req, res) {
    try {
      // Validation already handled in route middleware
      console.log('🔍 Banner upload controller - Request received:');
      console.log('  - req.file:', req.file);
      console.log('  - req.body:', req.body);
      console.log('  - req.headers:', req.headers);

      if (!req.file) {
        console.log('❌ No file received in req.file');
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }

      const { banner_id } = req.body;

      // Verify banner exists
      const banner = await Banner.findOne({ banner_id: banner_id });
      if (!banner) {
        return res.status(404).json({
          success: false,
          message: 'Banner not found'
        });
      }

      console.log(`Uploading image for banner ${banner_id}`);

      // Upload image using storage service
      const uploadResult = await storageService.uploadBannerImage(req.file, banner_id);

      if (!uploadResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Banner image upload failed',
          error: uploadResult.error
        });
      }

      // Update banner with image URLs and Cloudinary info
      const updatedBanner = await Banner.findByIdAndUpdate(
        banner._id,
        {
          banner_image_url: uploadResult.secure_url,
          cloudinary_public_id: uploadResult.public_id
        },
        { new: true }
      );

      console.log(`Banner image uploaded successfully for banner ${banner_id}`);

      res.status(200).json({
        success: true,
        message: 'Banner image uploaded successfully',
        data: {
          banner: updatedBanner,
          image_url: uploadResult.secure_url,
          transformations: uploadResult.sizes
        }
      });

    } catch (error) {
      console.error('Banner image upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during banner image upload',
        error: error.message
      });
    }
  }

  // DELETE BANNER IMAGE: Xóa image của banner
  async deleteBannerImage(req, res) {
    try {
      const { banner_id } = req.params;

      // Find banner
      const banner = await Banner.findOne({ banner_id: banner_id });
      if (!banner) {
        return res.status(404).json({
          success: false,
          message: 'Banner not found'
        });
      }

      if (!banner.cloudinary_public_id) {
        return res.status(400).json({
          success: false,
          message: 'No image to delete'
        });
      }

      // Delete from Cloudinary
      const deleteResult = await storageService.deleteBannerImage(banner.cloudinary_public_id);

      if (!deleteResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to delete image from storage',
          error: deleteResult.error
        });
      }

      // Update banner to remove image references
      const updatedBanner = await Banner.findByIdAndUpdate(
        banner._id,
        {
          banner_image_url: null,
          cloudinary_public_id: null
        },
        { new: true }
      );

      res.status(200).json({
        success: true,
        message: 'Banner image deleted successfully',
        data: {
          banner: updatedBanner
        }
      });

    } catch (error) {
      console.error('Banner image delete error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during banner image deletion',
        error: error.message
      });
    }
  }

  // GET BANNER IMAGE: Lấy thông tin image của banner
  async getBannerImage(req, res) {
    try {
      const { banner_id } = req.params;

      const banner = await Banner.findOne({ banner_id: banner_id });
      if (!banner) {
        return res.status(404).json({
          success: false,
          message: 'Banner not found'
        });
      }

      if (!banner.banner_image_url) {
        return res.status(404).json({
          success: false,
          message: 'No image found for this banner'
        });
      }

      // Generate different transformations
      const transformations = storageService.generateBannerImageTransformations(banner.cloudinary_public_id);

      res.status(200).json({
        success: true,
        data: {
          banner_id: banner.banner_id,
          original_url: banner.banner_image_url,
          cloudinary_public_id: banner.cloudinary_public_id,
          transformations: transformations
        }
      });

    } catch (error) {
      console.error('Get banner image error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while getting banner image',
        error: error.message
      });
    }
  }

  // UPDATE BANNER IMAGE: Cập nhật image của banner
  async updateBannerImage(req, res) {
    try {
      // Validation already handled in route middleware

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }

      const { banner_id } = req.params;

      // Find banner
      const banner = await Banner.findOne({ banner_id: banner_id });
      if (!banner) {
        return res.status(404).json({
          success: false,
          message: 'Banner not found'
        });
      }

      // Delete old image if exists
      if (banner.cloudinary_public_id) {
        await storageService.deleteBannerImage(banner.cloudinary_public_id);
      }

      // Upload new image
      const uploadResult = await storageService.uploadBannerImage(req.file, banner_id);

      if (!uploadResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Banner image upload failed',
          error: uploadResult.error
        });
      }

      // Update banner with new image info
      const updatedBanner = await Banner.findByIdAndUpdate(
        banner._id,
        {
          banner_image_url: uploadResult.data.secure_url,
          cloudinary_public_id: uploadResult.data.public_id
        },
        { new: true }
      );

      res.status(200).json({
        success: true,
        message: 'Banner image updated successfully',
        data: {
          banner: updatedBanner,
          image_url: uploadResult.data.secure_url,
          transformations: uploadResult.data.transformations
        }
      });

    } catch (error) {
      console.error('Banner image update error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during banner image update',
        error: error.message
      });
    }
  }
}

module.exports = new BannerUploadController();