// ✅ STORAGE SERVICE - Abstract layer cho local và Cloudinary
// Reference: CLOUDINARY_SETUP_GUIDE.md - Dual storage support

const cloudinaryService = require('./cloudinaryService');
const imageProcessingService = require('./imageProcessingService');
const path = require('path');
const fs = require('fs').promises;

class StorageService {
  constructor() {
    this.storageMethod = process.env.STORAGE_METHOD || 'local';
  }

  // ✅ UPLOAD IMAGE: Dựa vào storage method
  async uploadImage(file, options = {}) {
    try {
      const { type = 'product' } = options; // product, brand, player

      if (this.storageMethod === 'cloudinary') {
        return await this.uploadToCloudinary(file, options);
      } else {
        return await this.uploadToLocal(file, options);
      }
    } catch (error) {
      console.error('❌ Storage upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  // ✅ UPLOAD BRAND IMAGE: Specialized brand upload
  async uploadBrandImage(file, brandId) {
    return await this.uploadImage(file, {
      type: 'brand',
      entity_id: brandId,
      folder: 'brands'
    });
  }

  // ✅ UPLOAD PLAYER IMAGE: Specialized player upload
  async uploadPlayerImage(file, playerId) {
    return await this.uploadImage(file, {
      type: 'player', 
      entity_id: playerId,
      folder: 'players'
    });
  }

  // ✅ CLOUDINARY UPLOAD
  async uploadToCloudinary(file, options = {}) {
    try {
      const { type = 'product', entity_id, pd_id, color } = options;
      
      let cloudinaryResult;
      
      if (type === 'brand') {
        cloudinaryResult = await cloudinaryService.uploadBrandImage(file, entity_id);
      } else if (type === 'player') {
        cloudinaryResult = await cloudinaryService.uploadPlayerImage(file, entity_id);
      } else {
        // Product upload (existing logic)
        cloudinaryResult = await cloudinaryService.uploadImage(file, {
          folder: 'ecommerce/products',
          public_id_prefix: `product_${pd_id}_${color || 'default'}`
        });
      }

      // Lấy URLs cho các size
      const imageUrls = cloudinaryService.getImageUrls(cloudinaryResult.public_id);

      return {
        success: true,
        storage_type: 'cloudinary',
        public_id: cloudinaryResult.public_id,
        url: cloudinaryResult.secure_url,
        secure_url: cloudinaryResult.secure_url,
        sizes: {
          thumbnail: imageUrls.thumbnail,
          medium: imageUrls.medium,
          large: imageUrls.large,
          original: imageUrls.original
        },
        metadata: {
          format: cloudinaryResult.format,
          width: cloudinaryResult.width,
          height: cloudinaryResult.height,
          bytes: cloudinaryResult.bytes
        }
      };
    } catch (error) {
      console.error('❌ Cloudinary upload error:', error);
      throw error;
    }
  }

  // ✅ LOCAL UPLOAD (fallback hoặc migration support)
  async uploadToLocal(file, options = {}) {
    try {
      const { pd_id, color } = options;
      
      // Sử dụng existing local upload logic
      const processedImages = await imageProcessingService.processProductImage(
        file,
        `product_${pd_id}_${color || 'default'}`
      );

      return {
        success: true,
        storage_type: 'local',
        url: processedImages.large, // Main image URL
        sizes: {
          thumbnail: processedImages.thumbnail,
          medium: processedImages.medium,
          large: processedImages.large,
          original: processedImages.large
        },
        metadata: {
          format: 'webp',
          local_paths: processedImages
        }
      };
    } catch (error) {
      console.error('❌ Local upload error:', error);
      throw error;
    }
  }

  // ✅ GET IMAGE URLS: Trả về URLs dựa vào storage type
  getImageUrls(imageData, size = 'medium') {
    if (!imageData) return null;

    if (imageData.storage_type === 'cloudinary') {
      if (imageData.cloudinary_public_id) {
        return cloudinaryService.getImageUrls(imageData.cloudinary_public_id);
      }
      return {
        thumbnail: imageData.cloudinary_secure_url,
        medium: imageData.cloudinary_secure_url,
        large: imageData.cloudinary_secure_url,
        original: imageData.cloudinary_secure_url
      };
    } else {
      // Local storage URLs
      const baseUrl = '/uploads';
      const metadata = imageData.img_metadata?.sizes || {};
      
      return {
        thumbnail: metadata.thumbnail ? `${baseUrl}/${metadata.thumbnail}` : `${baseUrl}/${imageData.img}`,
        medium: metadata.medium ? `${baseUrl}/${metadata.medium}` : `${baseUrl}/${imageData.img}`,
        large: metadata.large ? `${baseUrl}/${metadata.large}` : `${baseUrl}/${imageData.img}`,
        original: `${baseUrl}/${imageData.img}`
      };
    }
  }

  // ✅ DELETE IMAGE: Xóa từ storage tương ứng
  async deleteImage(imageData) {
    try {
      if (!imageData) return { success: false, error: 'No image data provided' };

      if (imageData.storage_type === 'cloudinary' && imageData.cloudinary_public_id) {
        return await cloudinaryService.deleteImage(imageData.cloudinary_public_id);
      } else {
        // Delete local files
        return await this.deleteLocalImage(imageData);
      }
    } catch (error) {
      console.error('❌ Delete image error:', error);
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  }

  // ✅ DELETE LOCAL IMAGE
  async deleteLocalImage(imageData) {
    try {
      const filesToDelete = [];
      
      // Main image
      if (imageData.img) {
        filesToDelete.push(path.join('public/uploads', imageData.img));
      }
      
      // Size variants
      if (imageData.img_metadata?.sizes) {
        Object.values(imageData.img_metadata.sizes).forEach(sizePath => {
          if (sizePath) {
            filesToDelete.push(path.join('public/uploads', sizePath));
          }
        });
      }

      // Delete files
      const deletePromises = filesToDelete.map(async (filePath) => {
        try {
          await fs.unlink(filePath);
          console.log(`✅ Deleted local file: ${filePath}`);
        } catch (error) {
          console.warn(`⚠️ Could not delete file: ${filePath}`, error.message);
        }
      });

      await Promise.all(deletePromises);
      return { success: true, deleted_files: filesToDelete.length };
    } catch (error) {
      console.error('❌ Local delete error:', error);
      throw error;
    }
  }

  // ✅ MIGRATE TO CLOUDINARY: Di chuyển ảnh từ local lên Cloudinary
  async migrateToCloudinary(localImageData) {
    try {
      if (localImageData.storage_type === 'cloudinary') {
        return { success: false, error: 'Image already on Cloudinary' };
      }

      const localPath = path.join('public/uploads', localImageData.img);
      
      // Check if file exists
      try {
        await fs.access(localPath);
      } catch {
        return { success: false, error: 'Local file not found' };
      }

      // Upload to Cloudinary
      const cloudinaryResult = await cloudinaryService.uploadImage(
        { path: localPath },
        {
          folder: 'ecommerce/products',
          public_id_prefix: `migrated_${Date.now()}`
        }
      );

      // Return migration result
      return {
        success: true,
        migration_type: 'local_to_cloudinary',
        old_storage: 'local',
        new_storage: 'cloudinary',
        cloudinary_public_id: cloudinaryResult.public_id,
        cloudinary_secure_url: cloudinaryResult.secure_url,
        sizes: cloudinaryService.getImageUrls(cloudinaryResult.public_id)
      };
    } catch (error) {
      console.error('❌ Migration error:', error);
      throw new Error(`Migration failed: ${error.message}`);
    }
  }

  // ✅ GET STORAGE STATS
  async getStorageStats() {
    const stats = {
      storage_method: this.storageMethod,
      timestamp: new Date().toISOString()
    };

    if (this.storageMethod === 'cloudinary') {
      try {
        const cloudinaryStats = await cloudinaryService.getUsageStats();
        stats.cloudinary = cloudinaryStats;
      } catch (error) {
        stats.cloudinary = { error: error.message };
      }
    }

    // Could add local storage stats here
    stats.local = {
      uploads_directory: 'public/uploads',
      note: 'Local storage stats not implemented yet'
    };

    return stats;
  }
}

// ✅ EXPORT: Singleton instance
const storageService = new StorageService();

module.exports = storageService;
