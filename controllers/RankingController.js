// controllers/RankingController.js
// CRUD controller cho ranking collection 

const { Ranking, CustomerRanking, Customer } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

class RankingController {
  // GET /api/v1/rankings - Get all rankings
  static getAllRankings = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { search, is_active } = req.query;

    let query = {};
    
    if (search) {
      query.$or = [
        { rank_name: { $regex: search, $options: 'i' } },
        { rank_id: { $regex: search, $options: 'i' } },
        { about: { $regex: search, $options: 'i' } }
      ];
    }

    if (is_active !== undefined) {
      query.is_active = is_active === 'true';
    }

    const total = await Ranking.countDocuments(query);

    const rankings = await Ranking.find(query)
      .sort({ min_spending: 1 })
      .skip(skip)
      .limit(limit);

    // Add customer count for each ranking
    const rankingsWithCount = await Promise.all(
      rankings.map(async (ranking) => {
        const customerCount = await CustomerRanking.countDocuments({ rank_id: ranking._id });
        return {
          ...ranking.toObject(),
          customer_count: customerCount
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        rankings: rankingsWithCount,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/rankings/:id - Get ranking by ID
  static getRankingById = asyncHandler(async (req, res) => {
    const ranking = await Ranking.findById(req.params.id);

    if (!ranking) {
      return res.status(404).json({
        success: false,
        message: 'Ranking not found'
      });
    }

    // Get customer count
    const customerCount = await CustomerRanking.countDocuments({ rank_id: ranking._id });

    res.status(200).json({
      success: true,
      data: { 
        ranking: {
          ...ranking.toObject(),
          customer_count: customerCount
        }
      }
    });
  });

  // POST /api/v1/rankings - Create new ranking
  static createRanking = asyncHandler(async (req, res) => {
    const {
      rank_id,
      rank_name,
      min_spending,
      max_spending,
      img,
      about
    } = req.body;

    if (!rank_id || !rank_name || min_spending === undefined || max_spending === undefined) {
      return res.status(400).json({
        success: false,
        message: 'rank_id, rank_name, min_spending, and max_spending are required'
      });
    }

    // Validate spending ranges
    if (min_spending < 0 || max_spending < 0) {
      return res.status(400).json({
        success: false,
        message: 'Spending amounts cannot be negative'
      });
    }

    if (min_spending >= max_spending) {
      return res.status(400).json({
        success: false,
        message: 'Minimum spending must be less than maximum spending'
      });
    }

    // Check if rank_id already exists
    const existingRanking = await Ranking.findOne({ rank_id });
    if (existingRanking) {
      return res.status(400).json({
        success: false,
        message: 'Rank ID already exists'
      });
    }

    const ranking = new Ranking({
      rank_id,
      rank_name,
      min_spending,
      max_spending,
      img: img || '',
      about: about || ''
    });

    await ranking.save();

    res.status(201).json({
      success: true,
      message: 'Ranking created successfully',
      data: { ranking }
    });
  });

  // PUT /api/v1/rankings/:id - Update ranking
  static updateRanking = asyncHandler(async (req, res) => {
    const {
      rank_id,
      rank_name,
      min_spending,
      max_spending,
      img,
      about,
      discount_percent,
      benefits
    } = req.body;

    const ranking = await Ranking.findById(req.params.id);
    if (!ranking) {
      return res.status(404).json({
        success: false,
        message: 'Ranking not found'
      });
    }

    // Check unique constraint if rank_id changed
    if (rank_id && rank_id !== ranking.rank_id) {
      const existingRanking = await Ranking.findOne({ rank_id });
      if (existingRanking) {
        return res.status(400).json({
          success: false,
          message: 'Rank ID already exists'
        });
      }
    }

    // Validate spending ranges
    if (min_spending !== undefined && min_spending < 0) {
      return res.status(400).json({
        success: false,
        message: 'Minimum spending cannot be negative'
      });
    }

    if (max_spending !== undefined && max_spending < 0) {
      return res.status(400).json({
        success: false,
        message: 'Maximum spending cannot be negative'
      });
    }

    if (min_spending !== undefined && max_spending !== undefined && min_spending >= max_spending) {
      return res.status(400).json({
        success: false,
        message: 'Minimum spending must be less than maximum spending'
      });
    }

    // Update fields - theo README_MongoDB.md
    if (rank_id) ranking.rank_id = rank_id;
    if (rank_name) ranking.rank_name = rank_name;
    if (min_spending !== undefined) ranking.min_spending = min_spending;
    if (max_spending !== undefined) ranking.max_spending = max_spending;
    if (img !== undefined) ranking.img = img;
    if (about !== undefined) ranking.about = about;
    if (discount_percent !== undefined) ranking.discount_percent = discount_percent;
    if (benefits !== undefined) ranking.benefits = benefits;

    await ranking.save();

    res.status(200).json({
      success: true,
      message: 'Ranking updated successfully',
      data: { ranking }
    });
  });

  // DELETE /api/v1/rankings/:id - Delete ranking
  static deleteRanking = asyncHandler(async (req, res) => {
    const ranking = await Ranking.findById(req.params.id);
    
    if (!ranking) {
      return res.status(404).json({
        success: false,
        message: 'Ranking not found'
      });
    }

    // Check if ranking has customers
    const customerCount = await CustomerRanking.countDocuments({ rank_id: ranking._id });
    if (customerCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete ranking that has customers'
      });
    }

    await Ranking.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Ranking deleted successfully'
    });
  });

  // GET /api/v1/rankings/:id/customers - Get customers with specific ranking
  static getRankingCustomers = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;

    const ranking = await Ranking.findById(req.params.id);
    if (!ranking) {
      return res.status(404).json({
        success: false,
        message: 'Ranking not found'
      });
    }

    const total = await CustomerRanking.countDocuments({ rank_id: ranking._id });

    const customerRankings = await CustomerRanking.find({ rank_id: ranking._id })
      .populate({
        path: 'customer_id',
        populate: {
          path: 'uc_id',
          select: 'uc_name uc_email'
        }
      })
      .sort({ updated_at: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        ranking,
        customers: customerRankings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/rankings/active - Get active rankings
  static getActiveRankings = asyncHandler(async (req, res) => {
    const rankings = await Ranking.find({ is_active: true })
      .select('ranking_name ranking_description min_order_amount benefits')
      .sort({ min_order_amount: 1 });

    res.status(200).json({
      success: true,
      data: { rankings }
    });
  });

  // GET /api/v1/rankings/statistics - Get ranking statistics
  static getRankingStatistics = asyncHandler(async (req, res) => {
    const totalRankings = await Ranking.countDocuments();
    const activeRankings = await Ranking.countDocuments({ is_active: true });

    // Ranking distribution
    const rankingDistribution = await CustomerRanking.aggregate([
      {
        $lookup: {
          from: 'ranking',
          localField: 'rank_id',
          foreignField: '_id',
          as: 'ranking'
        }
      },
      { $unwind: '$ranking' },
      {
        $group: {
          _id: '$rank_id',
          rank_name: { $first: '$ranking.rank_name' },
          min_spending: { $first: '$ranking.min_spending' },
          customer_count: { $sum: 1 }
        }
      },
      { $sort: { min_spending: 1 } }
    ]);

    // Customers without ranking
    const customersWithRanking = await CustomerRanking.distinct('customer_id');
    const totalCustomers = await Customer.countDocuments();
    const customersWithoutRanking = totalCustomers - customersWithRanking.length;

    // Average order amounts by ranking
    const avgOrdersByRanking = await CustomerRanking.aggregate([
      {
        $lookup: {
          from: 'customer',
          localField: 'customer_id',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: '$customer' },
      {
        $lookup: {
          from: 'order',
          localField: 'customer_id',
          foreignField: 'customer_id',
          as: 'orders'
        }
      },
      {
        $lookup: {
          from: 'ranking',
          localField: 'rank_id',
          foreignField: '_id',
          as: 'ranking'
        }
      },
      { $unwind: '$ranking' },
      {
        $group: {
          _id: '$rank_id',
          rank_name: { $first: '$ranking.rank_name' },
          customer_count: { $sum: 1 },
          total_orders: { $sum: { $size: '$orders' } },
          avg_order_value: {
            $avg: {
              $avg: {
                $map: {
                  input: '$orders',
                  as: 'order',
                  in: '$$order.order_total'
                }
              }
            }
          }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalRankings,
        activeRankings,
        customersWithoutRanking,
        rankingDistribution,
        avgOrdersByRanking
      }
    });
  });

  // POST /api/v1/rankings/auto-assign - Auto assign rankings to customers based on order amounts
  static autoAssignRankings = asyncHandler(async (req, res) => {
    // Get all active rankings sorted by min_order_amount
    const rankings = await Ranking.find({ is_active: true }).sort({ min_order_amount: -1 });

    if (rankings.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active rankings found'
      });
    }

    // Get customers with their total order amounts
    const customersWithOrders = await Customer.aggregate([
      {
        $lookup: {
          from: 'order',
          localField: '_id',
          foreignField: 'customer_id',
          as: 'orders'
        }
      },
      {
        $addFields: {
          total_order_amount: {
            $sum: '$orders.order_total'
          }
        }
      }
    ]);

    let assigned = 0;
    let updated = 0;

    for (const customer of customersWithOrders) {
      // Find appropriate ranking for this customer
      let appropriateRanking = null;
      for (const ranking of rankings) {
        if (customer.total_order_amount >= ranking.min_order_amount) {
          appropriateRanking = ranking;
          break;
        }
      }

      if (appropriateRanking) {
        // Check if customer already has this ranking
        const existingRanking = await CustomerRanking.findOne({ customer_id: customer._id });
        
        if (existingRanking) {
          if (existingRanking.rank_id.toString() !== appropriateRanking._id.toString()) {
            existingRanking.rank_id = appropriateRanking._id;
            existingRanking.updated_at = new Date();
            await existingRanking.save();
            updated++;
          }
        } else {
          await CustomerRanking.create({
            customer_id: customer._id,
            rank_id: appropriateRanking._id,
            updated_at: new Date()
          });
          assigned++;
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Auto-assignment completed. ${assigned} new assignments, ${updated} updates`,
      data: {
        newAssignments: assigned,
        updates: updated,
        totalProcessed: customersWithOrders.length
      }
    });
  });

  // PUT /api/v1/rankings/:id/toggle-status - Toggle ranking status
  static toggleRankingStatus = asyncHandler(async (req, res) => {
    const ranking = await Ranking.findById(req.params.id);
    
    if (!ranking) {
      return res.status(404).json({
        success: false,
        message: 'Ranking not found'
      });
    }

    ranking.is_active = !ranking.is_active;
    await ranking.save();

    res.status(200).json({
      success: true,
      message: `Ranking ${ranking.is_active ? 'activated' : 'deactivated'} successfully`,
      data: { ranking }
    });
  });
}

module.exports = RankingController;
