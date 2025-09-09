// ✅ CLOUDINARY SERVICE
// Reference: CLOUDINARY_SETUP_GUIDE.md - Cloudinary operations for ecommerce

const { cloudinary, CLOUDINARY_FOLDERS, TRANSFORMATIONS } = require('../config/cloudinary.config');
const path = require('path');

class CloudinaryService {
  
  // ✅ UPLOAD IMAGE: Upload ảnh lên Cloudinary với preset
  async uploadImage(file, options = {}) {
    try {
      const {
        folder = CLOUDINARY_FOLDERS.PRODUCTS,
        public_id_prefix = 'image',
        resource_type = 'image'
      } = options;

      // Upload với eager transformation để tạo sẵn các size
      // Sử dụng stream cho Buffer hoặc path cho file
      const uploadOptions = {
        folder: folder,
        public_id: `${public_id_prefix}_${Date.now()}`,
        resource_type: resource_type,
        fetch_format: 'auto',
        quality: 'auto',
        eager: [
          TRANSFORMATIONS.THUMBNAIL,
          TRANSFORMATIONS.MEDIUM,
          TRANSFORMATIONS.LARGE
        ],
        eager_async: true, // Tạo transformations asynchronously
        use_filename: false,
        unique_filename: true
      };

      let result;
      if (file.buffer) {
        // Sử dụng Buffer (memory storage) với upload_stream
        result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
            if (error) {
              console.error('❌ Cloudinary upload_stream error:', error);
              reject(error);
            } else {
              console.log('✅ Cloudinary upload_stream successful:', result.public_id);
              resolve(result);
            }
          });
          
          // Write buffer to stream
          uploadStream.end(file.buffer);
        });
      } else {
        // Sử dụng file path (disk storage)
        result = await cloudinary.uploader.upload(file.path, uploadOptions);
      }

      if (!result || !result.public_id) {
        console.error('❌ Cloudinary upload failed: No result or public_id returned from Cloudinary.', result);
        throw new Error('Cloudinary upload failed to return a valid result.');
      }

      console.log('✅ Cloudinary upload successful:', result.public_id);
      
      return {
        success: true,
        public_id: result.public_id,
        secure_url: result.secure_url,
        url: result.url,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        eager: result.eager || [],
        folder: result.folder
      };

    } catch (error) {
      console.error('❌ Cloudinary upload error:', error);
      throw new Error(`Cloudinary upload failed: ${error.message}`);
    }
  }

  // ✅ UPLOAD BRAND IMAGE: Specialized brand image upload
  async uploadBrandImage(file, brandId) {
    return await this.uploadImage(file, {
      folder: CLOUDINARY_FOLDERS.BRANDS,
      public_id_prefix: `brand_${brandId}`
    });
  }

  // ✅ UPLOAD PLAYER IMAGE: Specialized player image upload  
  async uploadPlayerImage(file, playerId) {
    return await this.uploadImage(file, {
      folder: CLOUDINARY_FOLDERS.USERS,
      public_id_prefix: `player_${playerId}`
    });
  }

  // ✅ GET IMAGE URLS: Lấy URLs cho các size khác nhau
  getImageUrls(public_id, options = {}) {
    try {
      const urls = {
        original: cloudinary.url(public_id, { 
          ...TRANSFORMATIONS.ORIGINAL,
          ...options 
        }),
        thumbnail: cloudinary.url(public_id, { 
          ...TRANSFORMATIONS.THUMBNAIL,
          ...options 
        }),
        medium: cloudinary.url(public_id, { 
          ...TRANSFORMATIONS.MEDIUM,
          ...options 
        }),
        large: cloudinary.url(public_id, { 
          ...TRANSFORMATIONS.LARGE,
          ...options 
        })
      };

      return urls;
    } catch (error) {
      console.error('❌ Error generating image URLs:', error);
      throw new Error(`Failed to generate image URLs: ${error.message}`);
    }
  }

  // ✅ DELETE IMAGE: Xóa ảnh từ Cloudinary
  async deleteImage(public_id) {
    try {
      const result = await cloudinary.uploader.destroy(public_id);
      
      if (result.result === 'ok') {
        console.log('✅ Cloudinary image deleted:', public_id);
        return { success: true, result: result.result };
      } else {
        console.warn('⚠️ Cloudinary delete warning:', result);
        return { success: false, result: result.result };
      }
    } catch (error) {
      console.error('❌ Cloudinary delete error:', error);
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  }

  // ✅ UPDATE IMAGE: Cập nhật metadata hoặc tags
  async updateImage(public_id, options = {}) {
    try {
      const result = await cloudinary.uploader.explicit(public_id, {
        type: 'upload',
        ...options
      });

      console.log('✅ Cloudinary image updated:', public_id);
      return {
        success: true,
        public_id: result.public_id,
        ...result
      };
    } catch (error) {
      console.error('❌ Cloudinary update error:', error);
      throw new Error(`Failed to update image: ${error.message}`);
    }
  }

  // ✅ SEARCH IMAGES: Tìm kiếm ảnh theo criteria
  async searchImages(expression, options = {}) {
    try {
      const result = await cloudinary.search
        .expression(expression)
        .sort_by([['created_at', 'desc']])
        .max_results(options.max_results || 30)
        .execute();

      return {
        success: true,
        total_count: result.total_count,
        resources: result.resources,
        next_cursor: result.next_cursor
      };
    } catch (error) {
      console.error('❌ Cloudinary search error:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  // ✅ GET UPLOAD STATS: Thống kê usage
  async getUsageStats() {
    try {
      const result = await cloudinary.api.usage();
      
      return {
        success: true,
        storage: {
          used: result.storage.usage,
          limit: result.storage.limit,
          used_percent: ((result.storage.usage / result.storage.limit) * 100).toFixed(2)
        },
        bandwidth: {
          used: result.bandwidth.usage,
          limit: result.bandwidth.limit,
          used_percent: ((result.bandwidth.usage / result.bandwidth.limit) * 100).toFixed(2)
        },
        requests: result.requests || 0,
        resources: result.resources || 0
      };
    } catch (error) {
      console.error('❌ Error getting usage stats:', error);
      return { success: false, error: error.message };
    }
  }

  // ✅ GENERATE SIGNED URL: Tạo signed URL cho upload an toàn
  generateSignedUploadUrl(options = {}) {
    try {
      const timestamp = Math.round(Date.now() / 1000);
      const params = {
        timestamp: timestamp,
        folder: options.folder || CLOUDINARY_FOLDERS.PRODUCTS,
        ...options
      };

      const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);
      
      return {
        success: true,
        timestamp: timestamp,
        signature: signature,
        api_key: process.env.CLOUDINARY_API_KEY,
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        upload_url: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`
      };
    } catch (error) {
      console.error('❌ Error generating signed URL:', error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }
}

// ✅ EXPORT: Singleton instance
const cloudinaryService = new CloudinaryService();

module.exports = cloudinaryService;
