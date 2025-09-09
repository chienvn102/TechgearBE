// controllers/ProductPlayerController.js
// CRUD controller cho product_player collection 

const { ProductPlayer, Product, Player } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

class ProductPlayerController {
  // GET /api/v1/product-players - Get all product-player relationships
  static getAllProductPlayers = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { product_id, player_id, is_primary } = req.query;

    let query = {};
    
    if (product_id) {
      query.product_id = product_id;
    }

    if (player_id) {
      query.player_id = player_id;
    }

    if (is_primary !== undefined) {
      query.is_primary = is_primary === 'true';
    }

    const total = await ProductPlayer.countDocuments(query);

    const productPlayers = await ProductPlayer.find(query)
      .populate('product_id', 'pd_id pd_name pd_price color sku stock_quantity')
      .populate('player_id', 'player_id player_name player_img team_name position')
      .sort({ is_primary: -1, display_order: 1, created_at: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        productPlayers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/product-players/:id - Get product-player relationship by ID
  static getProductPlayerById = asyncHandler(async (req, res) => {
    const productPlayer = await ProductPlayer.findById(req.params.id)
      .populate('product_id', 'pd_id pd_name pd_price pd_quantity color sku stock_quantity')
      .populate('player_id', 'player_id player_name player_img team_name position achievements');

    if (!productPlayer) {
      return res.status(404).json({
        success: false,
        message: 'Product-Player relationship not found'
      });
    }

    res.status(200).json({
      success: true,
      data: productPlayer
    });
  });

  // GET /api/v1/product-players/product/:productId - Get all players for a product
  static getPlayersByProduct = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const productId = req.params.productId;

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const total = await ProductPlayer.countDocuments({ product_id: productId });

    const productPlayers = await ProductPlayer.find({ product_id: productId })
      .populate('player_id', 'player_id player_name player_img team_name position achievements is_active')
      .sort({ is_primary: -1, display_order: 1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        product: {
          _id: product._id,
          pd_id: product.pd_id,
          pd_name: product.pd_name,
          pd_price: product.pd_price
        },
        players: productPlayers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/product-players/player/:playerId - Get all products for a player
  static getProductsByPlayer = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const playerId = req.params.playerId;

    // Verify player exists
    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    const total = await ProductPlayer.countDocuments({ player_id: playerId });

    const productPlayers = await ProductPlayer.find({ player_id: playerId })
      .populate('product_id', 'pd_id pd_name pd_price pd_quantity color sku stock_quantity is_available')
      .sort({ is_primary: -1, display_order: 1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        player: {
          _id: player._id,
          player_id: player.player_id,
          player_name: player.player_name,
          team_name: player.team_name
        },
        products: productPlayers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // POST /api/v1/product-players - Create new product-player relationship
  static createProductPlayer = asyncHandler(async (req, res) => {
    const { product_id, player_id, is_primary, display_order } = req.body;

    // Verify product and player exist
    const [product, player] = await Promise.all([
      Product.findById(product_id),
      Player.findById(player_id)
    ]);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    // Check if relationship already exists
    const existingRelation = await ProductPlayer.findOne({ product_id, player_id });
    if (existingRelation) {
      return res.status(400).json({
        success: false,
        message: 'Product-Player relationship already exists'
      });
    }

    const productPlayer = await ProductPlayer.create({
      product_id,
      player_id,
      is_primary: is_primary || false,
      display_order: display_order || 1
    });

    const populatedProductPlayer = await ProductPlayer.findById(productPlayer._id)
      .populate('product_id', 'pd_id pd_name pd_price')
      .populate('player_id', 'player_id player_name player_img');

    res.status(201).json({
      success: true,
      message: 'Product-Player relationship created successfully',
      data: populatedProductPlayer
    });
  });

  // PUT /api/v1/product-players/:id - Update product-player relationship
  static updateProductPlayer = asyncHandler(async (req, res) => {
    const { is_primary, display_order } = req.body;

    const productPlayer = await ProductPlayer.findById(req.params.id);
    if (!productPlayer) {
      return res.status(404).json({
        success: false,
        message: 'Product-Player relationship not found'
      });
    }

    // Update fields
    if (is_primary !== undefined) {
      productPlayer.is_primary = is_primary;
    }
    if (display_order !== undefined) {
      productPlayer.display_order = display_order;
    }

    await productPlayer.save();

    const updatedProductPlayer = await ProductPlayer.findById(productPlayer._id)
      .populate('product_id', 'pd_id pd_name pd_price')
      .populate('player_id', 'player_id player_name player_img');

    res.status(200).json({
      success: true,
      message: 'Product-Player relationship updated successfully',
      data: updatedProductPlayer
    });
  });

  // PUT /api/v1/product-players/set-primary/:productId/:playerId - Set primary player for product
  static setPrimaryPlayer = asyncHandler(async (req, res) => {
    const { productId, playerId } = req.params;

    // Verify relationship exists
    const productPlayer = await ProductPlayer.findOne({ 
      product_id: productId, 
      player_id: playerId 
    });

    if (!productPlayer) {
      return res.status(404).json({
        success: false,
        message: 'Product-Player relationship not found'
      });
    }

    // Use static method to set primary
    await ProductPlayer.setPrimaryPlayer(productId, playerId);

    const updatedProductPlayer = await ProductPlayer.findById(productPlayer._id)
      .populate('product_id', 'pd_id pd_name pd_price')
      .populate('player_id', 'player_id player_name player_img');

    res.status(200).json({
      success: true,
      message: 'Primary player set successfully',
      data: updatedProductPlayer
    });
  });

  // DELETE /api/v1/product-players/:id - Delete product-player relationship
  static deleteProductPlayer = asyncHandler(async (req, res) => {
    const productPlayer = await ProductPlayer.findById(req.params.id);
    if (!productPlayer) {
      return res.status(404).json({
        success: false,
        message: 'Product-Player relationship not found'
      });
    }

    await ProductPlayer.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Product-Player relationship deleted successfully'
    });
  });

  // GET /api/v1/product-players/statistics - Get relationship statistics
  static getProductPlayerStatistics = asyncHandler(async (req, res) => {
    const [
      totalRelationships,
      primaryRelationships,
      productsWithPlayers,
      playersWithProducts,
      topPlayers,
      topProducts
    ] = await Promise.all([
      ProductPlayer.countDocuments(),
      ProductPlayer.countDocuments({ is_primary: true }),
      ProductPlayer.distinct('product_id').then(ids => ids.length),
      ProductPlayer.distinct('player_id').then(ids => ids.length),
      ProductPlayer.aggregate([
        { $group: { _id: '$player_id', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'players', localField: '_id', foreignField: '_id', as: 'player' } },
        { $unwind: '$player' },
        { $project: { player_name: '$player.player_name', count: 1 } }
      ]),
      ProductPlayer.aggregate([
        { $group: { _id: '$product_id', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
        { $unwind: '$product' },
        { $project: { pd_name: '$product.pd_name', count: 1 } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalRelationships,
        primaryRelationships,
        productsWithPlayers,
        playersWithProducts,
        topPlayers,
        topProducts
      }
    });
  });
}

module.exports = ProductPlayerController;
