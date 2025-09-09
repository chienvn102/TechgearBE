// controllers/PlayerController.js
// CRUD controller cho player collection 

const { Player, Product } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

class PlayerController {
  // GET /api/v1/players - Get all players
  static getAllPlayers = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { search, is_active } = req.query;

    let query = {};
    
    if (search) {
      query.$or = [
        { player_name: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } },
        { team_name: { $regex: search, $options: 'i' } }
      ];
    }

    if (is_active !== undefined) {
      query.is_active = is_active === 'true';
    }

    const total = await Player.countDocuments(query);

    const players = await Player.find(query)
      .sort({ player_name: 1 })
      .skip(skip)
      .limit(limit);

    // Add product count for each player and map field names for frontend compatibility
    const playersWithCount = await Promise.all(
      players.map(async (player) => {
        const productCount = await Product.countDocuments({ player_id: player._id });
        const playerObj = player.toObject();
        
        return {
          ...playerObj,
          // Map fields for frontend compatibility
          player_position: playerObj.role, // Map role to player_position for compatibility
          player_team: playerObj.team_name,
          player_image: playerObj.player_img,
          product_count: productCount
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        players: playersWithCount,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/players/:id - Get player by ID
  static getPlayerById = asyncHandler(async (req, res) => {
    const player = await Player.findById(req.params.id);

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    // Get product count
    const productCount = await Product.countDocuments({ player_id: player._id });
    const playerObj = player.toObject();

    res.status(200).json({
      success: true,
      data: { 
        player: {
          ...playerObj,
          // Map fields for frontend compatibility
          player_position: playerObj.role, // Map role to player_position for compatibility
          player_team: playerObj.team_name,
          player_image: playerObj.player_img,
          product_count: productCount
        }
      }
    });
  });

  // POST /api/v1/players - Create new player
  static createPlayer = asyncHandler(async (req, res) => {
    const { 
      player_name, 
      player_position, 
      player_team, 
      player_content, 
      player_image,
      achievements,
      is_active = true 
    } = req.body;

    if (!player_name || !player_position || !player_team) {
      return res.status(400).json({
        success: false,
        message: 'Player name, position, and team are required'
      });
    }

    // Check if player name already exists in same team
    const existingPlayer = await Player.findOne({ 
      player_name, 
      team_name: player_team // Map frontend field to model field
    });
    
    if (existingPlayer) {
      return res.status(400).json({
        success: false,
        message: 'Player name already exists in this team'
      });
    }

    // Generate unique player_id
    const player_id = `${player_name.toUpperCase().replace(/\s+/g, '')}_${Date.now()}`.substring(0, 20);

    const player = new Player({
      player_id,
      player_name,
      role: player_position, // Map frontend field to model field
      team_name: player_team, // Map frontend field to model field
      player_content: player_content || '',
      player_img: player_image || null,
      achievements: achievements || '',
      is_active,
      created_at: new Date()
    });

    await player.save();

    const playerObj = player.toObject();
    res.status(201).json({
      success: true,
      message: 'Player created successfully',
      data: { 
        player: {
          ...playerObj,
          // Map fields for frontend compatibility
          player_position: playerObj.role, // Map role to player_position for compatibility
          player_team: playerObj.team_name,
          player_image: playerObj.player_img
        }
      }
    });
  });

  // PUT /api/v1/players/:id - Update player
  static updatePlayer = asyncHandler(async (req, res) => {
    const { 
      player_name, 
      player_position, 
      player_team, 
      player_content, 
      player_image,
      achievements,
      is_active 
    } = req.body;

    const player = await Player.findById(req.params.id);
    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    // Check unique constraints if changed
    if (player_name && player_team && 
        (player_name !== player.player_name || player_team !== player.team_name)) {
      const existingPlayer = await Player.findOne({ 
        player_name, 
        team_name: player_team, // Map frontend field to model field
        _id: { $ne: player._id }
      });
      
      if (existingPlayer) {
        return res.status(400).json({
          success: false,
          message: 'Player name already exists in this team'
        });
      }
    }

    // Update fields
    if (player_name) player.player_name = player_name;
    if (player_position) player.role = player_position; // Map frontend field to model field
    if (player_team) player.team_name = player_team; // Map frontend field to model field
    if (player_content !== undefined) player.player_content = player_content;
    if (player_image !== undefined) player.player_img = player_image; // Map frontend field to model field
    if (achievements !== undefined) player.achievements = achievements;
    if (is_active !== undefined) player.is_active = is_active;

    await player.save();

    const playerObj = player.toObject();
    res.status(200).json({
      success: true,
      message: 'Player updated successfully',
      data: { 
        player: {
          ...playerObj,
          // Map fields for frontend compatibility
          player_position: playerObj.role, // Map role to player_position for compatibility
          player_team: playerObj.team_name,
          player_image: playerObj.player_img
        }
      }
    });
  });

  // DELETE /api/v1/players/:id - Delete player
  static deletePlayer = asyncHandler(async (req, res) => {
    const player = await Player.findById(req.params.id);
    
    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    // Check if player has products
    const productCount = await Product.countDocuments({ player_id: player._id });
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete player that has products'
      });
    }

    await Player.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Player deleted successfully'
    });
  });

  // GET /api/v1/players/:id/products - Get products for specific player
  static getPlayerProducts = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { min_price, max_price, category_id, brand_id } = req.query;

    const player = await Player.findById(req.params.id);
    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    let query = { player_id: player._id };

    if (min_price || max_price) {
      query.product_price = {};
      if (min_price) query.product_price.$gte = parseFloat(min_price);
      if (max_price) query.product_price.$lte = parseFloat(max_price);
    }

    if (category_id) {
      query.category_id = category_id;
    }

    if (brand_id) {
      query.brand_id = brand_id;
    }

    const total = await Product.countDocuments(query);

    const products = await Product.find(query)
      .populate('category_id', 'category_name')
      .populate('brand_id', 'brand_name')
      .populate('product_type_id', 'type_name')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        player,
        products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/players/by-team/:team - Get players by team
  static getPlayersByTeam = asyncHandler(async (req, res) => {
    const { team } = req.params;
    const { page, limit, skip } = req.pagination;

    const query = { player_team: { $regex: team, $options: 'i' } };
    const total = await Player.countDocuments(query);

    const players = await Player.find(query)
      .sort({ player_name: 1 })
      .skip(skip)
      .limit(limit);

    // Add product count for each player
    const playersWithCount = await Promise.all(
      players.map(async (player) => {
        const productCount = await Product.countDocuments({ player_id: player._id });
        return {
          ...player.toObject(),
          product_count: productCount
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        team,
        players: playersWithCount,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/players/active - Get only active players
  static getActivePlayers = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;

    const query = { is_active: true };
    const total = await Player.countDocuments(query);

    const players = await Player.find(query)
      .select('player_name player_position player_team player_image')
      .sort({ player_team: 1, player_name: 1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        players,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/players/statistics - Get player statistics
  static getPlayerStatistics = asyncHandler(async (req, res) => {
    const totalPlayers = await Player.countDocuments();
    const activePlayers = await Player.countDocuments({ is_active: true });

    // Team distribution
    const teamStats = await Player.aggregate([
      {
        $group: {
          _id: '$player_team',
          player_count: { $sum: 1 },
          active_players: {
            $sum: { $cond: ['$is_active', 1, 0] }
          }
        }
      },
      { $sort: { player_count: -1 } }
    ]);

    // Position distribution
    const positionStats = await Player.aggregate([
      {
        $group: {
          _id: '$player_position',
          player_count: { $sum: 1 }
        }
      },
      { $sort: { player_count: -1 } }
    ]);

    // Players with products
    const playersWithProducts = await Player.aggregate([
      {
        $lookup: {
          from: 'product',
          localField: '_id',
          foreignField: 'player_id',
          as: 'products'
        }
      },
      {
        $addFields: {
          product_count: { $size: '$products' }
        }
      },
      {
        $group: {
          _id: null,
          players_with_products: {
            $sum: { $cond: [{ $gt: ['$product_count', 0] }, 1, 0] }
          },
          players_without_products: {
            $sum: { $cond: [{ $eq: ['$product_count', 0] }, 1, 0] }
          }
        }
      }
    ]);

    // Top players by product count
    const topPlayersByProducts = await Player.aggregate([
      {
        $lookup: {
          from: 'product',
          localField: '_id',
          foreignField: 'player_id',
          as: 'products'
        }
      },
      {
        $addFields: {
          product_count: { $size: '$products' }
        }
      },
      { $sort: { product_count: -1 } },
      { $limit: 10 },
      {
        $project: {
          player_name: 1,
          player_team: 1,
          player_position: 1,
          product_count: 1,
          is_active: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalPlayers,
        activePlayers,
        teamDistribution: teamStats,
        positionDistribution: positionStats,
        productStats: playersWithProducts[0] || {
          players_with_products: 0,
          players_without_products: totalPlayers
        },
        topPlayersByProducts
      }
    });
  });

  // PUT /api/v1/players/:id/toggle-status - Toggle player status
  static togglePlayerStatus = asyncHandler(async (req, res) => {
    const player = await Player.findById(req.params.id);
    
    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    player.is_active = !player.is_active;
    await player.save();

    res.status(200).json({
      success: true,
      message: `Player ${player.is_active ? 'activated' : 'deactivated'} successfully`,
      data: { player }
    });
  });
}

module.exports = PlayerController;
