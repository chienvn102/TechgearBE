// services/imageProcessingService.js
// Image processing service với Sharp 

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

class ImageProcessingService {
  constructor() {
    // Cấu hình các size cho responsive design
    this.sizes = {
      thumbnail: { width: 200, height: 200, quality: 80 },
      medium: { width: 500, height: 500, quality: 85 },
      large: { width: 1000, height: 1000, quality: 90 }
    };
  }

  /**
   * Xử lý ảnh sản phẩm với multiple sizes - tuân thủ ProductImage schema
   * @param {string} inputPath - Đường dẫn file gốc
   * @param {string} productId - ID sản phẩm 
   * @param {string} color - Màu sắc (theo schema: pd_id, img, color)
   * @param {string} uploadType - Loại upload (products/banners/brands)
   */
  async processProductImage(inputPath, productId, color, uploadType = 'products') {
    const processedImages = {};
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    try {
      // Đọc metadata ảnh gốc
      const metadata = await sharp(inputPath).metadata();
      
      // Tạo base filename
      const baseFilename = `${productId}_${color}_${Date.now()}`;
      
      // Process từng size
      for (const [sizeName, config] of Object.entries(this.sizes)) {
        const outputDir = path.join(
          process.cwd(), 
          'public', 
          'uploads', 
          uploadType, 
          year.toString(), 
          month, 
          sizeName
        );
        
        // Tạo output directory
        await fs.mkdir(outputDir, { recursive: true });
        
        const outputFilename = `${baseFilename}_${sizeName}.webp`;
        const outputPath = path.join(outputDir, outputFilename);

        // Xử lý và optimize ảnh cho production
        await sharp(inputPath)
          .resize(config.width, config.height, {
            fit: 'cover',
            position: 'center'
          })
          .webp({ 
            quality: config.quality,
            effort: 6 // Maximum compression effort
          })
          .toFile(outputPath);

        // Lưu relative path cho database (theo schema img field)
        processedImages[sizeName] = `/uploads/${uploadType}/${year}/${month}/${sizeName}/${outputFilename}`;
      }

      // Xóa file gốc sau khi xử lý xong
      await fs.unlink(inputPath);

      return {
        success: true,
        // Trả về img path cho main size (medium) - phù hợp với schema img field
        img: processedImages.medium,
        images: processedImages,
        metadata: {
          originalSize: metadata.size,
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          processedAt: new Date()
        }
      };

    } catch (error) {
      console.error('Image processing error:', error);
      
      // Cleanup file gốc nếu có lỗi
      try {
        await fs.unlink(inputPath);
      } catch (cleanupError) {
        console.warn('Cannot cleanup original file:', cleanupError.message);
      }
      
      throw new Error(`Lỗi xử lý ảnh: ${error.message}`);
    }
  }

  /**
   * Xử lý ảnh brand logo - tuân thủ Brand schema (br_img field)
   */
  async processBrandLogo(inputPath, brandId) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    try {
      const metadata = await sharp(inputPath).metadata();
      
      const outputDir = path.join(
        process.cwd(), 
        'public', 
        'uploads', 
        'brands', 
        year.toString(), 
        month
      );
      
      await fs.mkdir(outputDir, { recursive: true });
      
      const outputFilename = `${brandId}_logo_${Date.now()}.webp`;
      const outputPath = path.join(outputDir, outputFilename);

      // Logo nên giữ nguyên tỷ lệ, resize về max 300x300
      await sharp(inputPath)
        .resize(300, 300, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 90 })
        .toFile(outputPath);

      // Xóa file gốc
      await fs.unlink(inputPath);

      // Trả về path cho br_img field
      const logoPath = `/uploads/brands/${year}/${month}/${outputFilename}`;

      return {
        success: true,
        br_img: logoPath, // Trả về exact field name theo schema
        metadata: {
          originalSize: metadata.size,
          width: metadata.width,
          height: metadata.height,
          processedAt: new Date()
        }
      };

    } catch (error) {
      console.error('Brand logo processing error:', error);
      
      try {
        await fs.unlink(inputPath);
      } catch (cleanupError) {
        console.warn('Cannot cleanup original file:', cleanupError.message);
      }
      
      throw new Error(`Lỗi xử lý logo: ${error.message}`);
    }
  }

  /**
   * Xử lý ảnh banner - banner không có img field trong schema, chỉ reference đến product
   */
  async processBannerImage(inputPath, bannerId) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    try {
      const metadata = await sharp(inputPath).metadata();
      
      const outputDir = path.join(
        process.cwd(), 
        'public', 
        'uploads', 
        'banners', 
        year.toString(), 
        month
      );
      
      await fs.mkdir(outputDir, { recursive: true });
      
      const outputFilename = `${bannerId}_${Date.now()}.webp`;
      const outputPath = path.join(outputDir, outputFilename);

      // Banner cần size lớn, tỷ lệ phù hợp với banner layout
      await sharp(inputPath)
        .resize(1200, 400, {
          fit: 'cover',
          position: 'center'
        })
        .webp({ quality: 85 })
        .toFile(outputPath);

      await fs.unlink(inputPath);

      const bannerPath = `/uploads/banners/${year}/${month}/${outputFilename}`;

      return {
        success: true,
        banner_img: bannerPath, // Custom field để lưu banner image
        metadata: {
          originalSize: metadata.size,
          width: metadata.width,
          height: metadata.height,
          processedAt: new Date()
        }
      };

    } catch (error) {
      console.error('Banner processing error:', error);
      
      try {
        await fs.unlink(inputPath);
      } catch (cleanupError) {
        console.warn('Cannot cleanup original file:', cleanupError.message);
      }
      
      throw new Error(`Lỗi xử lý banner: ${error.message}`);
    }
  }

  /**
   * Xóa tất cả sizes của 1 product image
   */
  async deleteProductImages(imageData) {
    try {
      if (imageData.images) {
        // Xóa multiple sizes
        for (const imagePath of Object.values(imageData.images)) {
          if (imagePath && typeof imagePath === 'string') {
            const fullPath = path.join(process.cwd(), 'public', imagePath);
            try {
              await fs.unlink(fullPath);
              console.log(`Deleted: ${imagePath}`);
            } catch (err) {
              console.warn(`Cannot delete file: ${fullPath}`);
            }
          }
        }
      } else if (imageData.img) {
        // Xóa single image path
        const fullPath = path.join(process.cwd(), 'public', imageData.img);
        try {
          await fs.unlink(fullPath);
          console.log(`Deleted: ${imageData.img}`);
        } catch (err) {
          console.warn(`Cannot delete file: ${fullPath}`);
        }
      }
    } catch (error) {
      console.error('Error deleting images:', error);
    }
  }

  /**
   * Cleanup orphaned images - chạy định kỳ để dọn dẹp
   */
  async cleanupOrphanedImages() {
    try {
      console.log('Starting orphaned images cleanup...');
      
      const { ProductImage, Brand } = require('../models');
      
      // Lấy tất cả image paths từ database
      const dbImagePaths = new Set();
      
      // Product images
      const productImages = await ProductImage.find({}, 'img');
      productImages.forEach(img => {
        if (img.img) dbImagePaths.add(img.img);
      });
      
      // Brand logos
      const brands = await Brand.find({}, 'br_img');
      brands.forEach(brand => {
        if (brand.br_img) dbImagePaths.add(brand.br_img);
      });

      // Scan và clean upload directories
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      const deletedCount = await this.scanAndCleanDirectory(uploadsDir, dbImagePaths);
      
      console.log(`Cleanup completed. Deleted ${deletedCount} orphaned files.`);
      return { deletedCount };

    } catch (error) {
      console.error('Cleanup error:', error);
      throw error;
    }
  }

  /**
   * Scan directory và xóa orphaned files
   */
  async scanAndCleanDirectory(dirPath, validPaths) {
    let deletedCount = 0;
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          deletedCount += await this.scanAndCleanDirectory(fullPath, validPaths);
        } else {
          // Check if file path exists in database
          const relativePath = path.relative(path.join(process.cwd(), 'public'), fullPath);
          const normalizedPath = '/' + relativePath.replace(/\\/g, '/');
          
          if (!validPaths.has(normalizedPath)) {
            try {
              await fs.unlink(fullPath);
              console.log(`Deleted orphaned file: ${normalizedPath}`);
              deletedCount++;
            } catch (err) {
              console.warn(`Cannot delete: ${fullPath}`);
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Cannot scan directory: ${dirPath}`, error.message);
    }
    
    return deletedCount;
  }

  /**
   * Get image URL với size selector
   */
  getImageUrl(imagePath, size = 'medium') {
    if (!imagePath) return null;
    
    // Nếu imagePath đã có size specific, trả về luôn
    if (imagePath.includes(`/${size}/`)) {
      return imagePath;
    }
    
    // Convert path to specific size
    const pathParts = imagePath.split('/');
    const filename = pathParts.pop();
    const sizePath = pathParts.concat(size, filename).join('/');
    
    return sizePath;
  }
}

module.exports = new ImageProcessingService();
