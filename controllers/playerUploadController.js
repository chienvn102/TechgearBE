// ✅ PLAYER UPLOAD CONTROLLER
//  Player image upload với Cloudinary

const { validationResult } = require('express-validator');
const Player = require('../models/Player');
const storageService = require('../services/storageService');

class PlayerUploadController {

  // ✅ UPLOAD PLAYER IMAGE: Upload avatar cho player
  async uploadPlayerImage(req, res) {
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

      const { player_id } = req.body;

      console.log('🔍 Searching for player with ID:', player_id);

      // Verify player exists - support both _id and player_id
      let player;
      if (player_id) {
        try {
          // Try finding by MongoDB _id first
          console.log('🔸 Trying findById...');
          player = await Player.findById(player_id);
          if (player) {
            console.log('✅ Found player by _id:', player._id);
          }
        } catch (error) {
          console.log('⚠️ findById failed:', error.message);
          // If _id fails, try by player_id field
          player = null;
        }
        
        // If not found by _id, try by player_id field
        if (!player) {
          console.log('🔸 Trying findOne by player_id...');
          player = await Player.findOne({ player_id: player_id });
          if (player) {
            console.log('✅ Found player by player_id:', player._id);
          }
        }
      }
      
      console.log('🎯 Final player result:', player ? `Found: ${player.player_name}` : 'NOT FOUND');
      
      if (!player) {
        return res.status(404).json({
          success: false,
          message: 'Player not found'
        });
      }

      console.log(`⚽ Uploading image for player ${player_id}`);

      // Upload image using storage service
      const uploadResult = await storageService.uploadPlayerImage(req.file, player_id);

      if (!uploadResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Player image upload failed',
          error: uploadResult.error
        });
      }

      // Update player with new image data
      const updateData = {
        player_img: uploadResult.url || uploadResult.secure_url,
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

      // Update player in database - use the player object we already found
      const updatedPlayer = await Player.findByIdAndUpdate(
        player._id,  // Use the _id from the found player object
        updateData,
        { new: true }
      );

      console.log('✅ Player image updated:', updatedPlayer ? updatedPlayer._id : 'UPDATE FAILED');

      res.status(200).json({
        success: true,
        message: 'Player image uploaded successfully',
        data: {
          player: updatedPlayer,
          image_urls: uploadResult.sizes,
          storage_type: uploadResult.storage_type
        }
      });

    } catch (error) {
      console.error('❌ Player upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during player image upload',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Upload failed'
      });
    }
  }

  // ✅ DELETE PLAYER IMAGE: Xóa avatar player
  async deletePlayerImage(req, res) {
    try {
      const { player_id } = req.params;

      // Find player
      const player = await Player.findOne({ player_id: player_id });
      if (!player) {
        return res.status(404).json({
          success: false,
          message: 'Player not found'
        });
      }

      console.log(`🗑️ Deleting image for player ${player_id}`);

      // Delete from storage if exists
      if (player.storage_type === 'cloudinary' && player.cloudinary_public_id) {
        try {
          await storageService.deleteImage({
            storage_type: 'cloudinary',
            cloudinary_public_id: player.cloudinary_public_id
          });
        } catch (error) {
          console.warn('⚠️ Storage deletion failed:', error.message);
        }
      }

      // Update player to remove image data
      const updatedPlayer = await Player.findOneAndUpdate(
        { player_id: player_id },
        {
          $unset: {
            player_img: '',
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
        message: 'Player image deleted successfully',
        data: {
          player: updatedPlayer
        }
      });

    } catch (error) {
      console.error('❌ Player delete error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting player image',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Delete failed'
      });
    }
  }

  // ✅ GET PLAYER WITH IMAGE URLS: Trả về player với image URLs
  async getPlayerWithImage(req, res) {
    try {
      const { player_id } = req.params;

      const player = await Player.findOne({ player_id: player_id });
      if (!player) {
        return res.status(404).json({
          success: false,
          message: 'Player not found'
        });
      }

      // Generate image URLs based on storage type
      let imageUrls = null;
      if (player.player_img) {
        imageUrls = storageService.getImageUrls(player, 'medium');
      }

      res.json({
        success: true,
        data: {
          player: player,
          image_urls: imageUrls
        }
      });

    } catch (error) {
      console.error('❌ Get player error:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting player',
        error: error.message
      });
    }
  }

  // ✅ GET ALL PLAYERS WITH IMAGES: Danh sách players kèm image URLs
  async getAllPlayersWithImages(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      
      const players = await Player.find({})
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ created_at: -1 });

      const total = await Player.countDocuments();

      // Add image URLs for each player
      const playersWithImages = players.map(player => {
        let imageUrls = null;
        if (player.player_img) {
          imageUrls = storageService.getImageUrls(player, 'thumbnail');
        }

        return {
          ...player.toObject(),
          image_urls: imageUrls
        };
      });

      res.json({
        success: true,
        data: {
          players: playersWithImages,
          pagination: {
            current_page: parseInt(page),
            total_pages: Math.ceil(total / limit),
            total_items: total,
            items_per_page: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('❌ Get players error:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting players',
        error: error.message
      });
    }
  }
}

module.exports = new PlayerUploadController();
