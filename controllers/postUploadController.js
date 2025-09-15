// controllers/postUploadController.js
// Post image upload controller với Cloudinary integration

const { validationResult } = require('express-validator');
const Post = require('../models/Post');
const storageService = require('../services/storageService');

class PostUploadController {
  // Upload post image
  static async uploadPostImage(req, res) {
    try {
      console.log('📄 POST IMAGE UPLOAD - Request received');
      console.log('Body:', req.body);
      console.log('File:', req.file);

      // Validation check
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('❌ Validation errors:', errors.array());
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu không hợp lệ',
          errors: errors.array()
        });
      }

      const { post_id } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Không có file ảnh được tải lên'
        });
      }

      // Check if post exists
      const post = await Post.findOne({ post_id });
      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy bài viết'
        });
      }

      console.log('📄 Post found:', post.post_title);

      // Upload image using storageService
      console.log('☁️ Uploading image using storageService...');
      
      const uploadOptions = {
        type: 'post',
        entityId: post_id,
        fieldName: 'post_img',
        folder: 'gaming-gear/posts',
        // 16:9 ratio for blog post hero images
        transformations: {
          width: 1200,
          height: 675,
          crop: 'fill',
          quality: 'auto',
          gravity: 'center'
        }
      };

      const uploadResult = await storageService.uploadImage(req.file, uploadOptions);
      console.log('✅ Upload successful:', uploadResult);

      // Update post với image URL
      const updatedPost = await Post.findOneAndUpdate(
        { post_id },
        { 
          post_img: uploadResult.url,
          cloudinary_public_id: uploadResult.public_id,
          cloudinary_secure_url: uploadResult.secure_url
        },
        { new: true }
      );

      console.log('✅ Post image updated successfully');

      res.status(200).json({
        success: true,
        message: 'Upload ảnh bài viết thành công',
        data: {
          post: updatedPost,
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

    } catch (error) {
      console.error('❌ POST IMAGE UPLOAD ERROR:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi upload ảnh bài viết',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get post with image
  static async getPostWithImage(req, res) {
    try {
      const { post_id } = req.params;

      console.log('📄 GET POST WITH IMAGE - Post ID:', post_id);

      const post = await Post.findOne({ post_id });
      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy bài viết'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Lấy thông tin bài viết thành công',
        data: {
          post,
          has_image: !!post.post_img,
          image_url: post.post_img || null,
          cloudinary_public_id: post.cloudinary_public_id || null
        }
      });

    } catch (error) {
      console.error('❌ GET POST WITH IMAGE ERROR:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy thông tin bài viết',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Delete post image
  static async deletePostImage(req, res) {
    try {
      const { post_id } = req.params;

      console.log('📄 DELETE POST IMAGE - Post ID:', post_id);

      const post = await Post.findOne({ post_id });
      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy bài viết'
        });
      }

      if (!post.cloudinary_public_id) {
        return res.status(400).json({
          success: false,
          message: 'Bài viết không có ảnh để xóa'
        });
      }

      // Delete from Cloudinary
      console.log('☁️ Deleting from Cloudinary:', post.cloudinary_public_id);
      
      try {
        await cloudinary.uploader.destroy(post.cloudinary_public_id);
        console.log('✅ Cloudinary image deleted successfully');
      } catch (cloudinaryError) {
        console.warn('⚠️ Cloudinary delete warning:', cloudinaryError.message);
        // Continue even if Cloudinary delete fails
      }

      // Update post to remove image
      const updatedPost = await Post.findOneAndUpdate(
        { post_id },
        { 
          $unset: { 
            post_img: '',
            cloudinary_public_id: '',
            cloudinary_secure_url: ''
          }
        },
        { new: true }
      );

      console.log('✅ Post image removed successfully');

      res.status(200).json({
        success: true,
        message: 'Xóa ảnh bài viết thành công',
        data: {
          post: updatedPost
        }
      });

    } catch (error) {
      console.error('❌ DELETE POST IMAGE ERROR:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi xóa ảnh bài viết',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = PostUploadController;
