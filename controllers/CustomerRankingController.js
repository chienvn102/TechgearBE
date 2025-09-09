// controllers/CustomerRankingController.js
// CRUD controller cho customer_ranking collection 

const { CustomerRanking, Customer, Ranking } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

class CustomerRankingController {
  // GET /api/v1/customer-rankings - Get all customer rankings
  static getAllCustomerRankings = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { customer_id, rank_id } = req.query;

    let query = {};
    
    if (customer_id) {
      query.customer_id = customer_id;
    }

    if (rank_id) {
      query.rank_id = rank_id;
    }

    const total = await CustomerRanking.countDocuments(query);

    const customerRankings = await CustomerRanking.find(query)
      .populate('customer_id', 'customer_id name email phone_number')
      .populate('rank_id', 'rank_name rank_id min_spending max_spending img about')
      .sort({ updated_at: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        customerRankings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/customer-rankings/:id - Get customer ranking by ID
  static getCustomerRankingById = asyncHandler(async (req, res) => {
    const customerRanking = await CustomerRanking.findById(req.params.id)
      .populate('customer_id', 'customer_id name email phone_number')
      .populate('rank_id', 'rank_name rank_id min_spending max_spending img about');

    if (!customerRanking) {
      return res.status(404).json({
        success: false,
        message: 'Customer ranking not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { customerRanking }
    });
  });

  // POST /api/v1/customer-rankings - Create new customer ranking
  static createCustomerRanking = asyncHandler(async (req, res) => {
    const { customer_id, rank_id } = req.body;

    if (!customer_id || !rank_id) {
      return res.status(400).json({
        success: false,
        message: 'Customer ID and rank ID are required'
      });
    }

    // Verify customer exists
    const customer = await Customer.findById(customer_id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Verify ranking exists
    const ranking = await Ranking.findById(rank_id);
    if (!ranking) {
      return res.status(404).json({
        success: false,
        message: 'Ranking not found'
      });
    }

    // Check if customer already has a ranking
    const existingRanking = await CustomerRanking.findOne({ customer_id });
    if (existingRanking) {
      return res.status(400).json({
        success: false,
        message: 'Customer already has a ranking assigned'
      });
    }

    // Create new customer ranking
    const customerRanking = new CustomerRanking({
      customer_id,
      rank_id,
      updated_at: new Date()
    });

    await customerRanking.save();
    await customerRanking.populate('rank_id', 'rank_name rank_id min_spending max_spending img about');

    res.status(201).json({
      success: true,
      message: 'Customer ranking created successfully',
      data: { customerRanking }
    });
  });

  // PUT /api/v1/customer-rankings/:id - Update customer ranking
  static updateCustomerRanking = asyncHandler(async (req, res) => {
    const { customer_id, rank_id } = req.body;

    if (!rank_id) {
      return res.status(400).json({
        success: false,
        message: 'Rank ID is required'
      });
    }

    const customerRanking = await CustomerRanking.findById(req.params.id);
    if (!customerRanking) {
      return res.status(404).json({
        success: false,
        message: 'Customer ranking not found'
      });
    }

    // Verify ranking exists
    const ranking = await Ranking.findById(rank_id);
    if (!ranking) {
      return res.status(404).json({
        success: false,
        message: 'Ranking not found'
      });
    }

    // Update customer ranking
    customerRanking.rank_id = rank_id;
    if (customer_id) customerRanking.customer_id = customer_id;
    customerRanking.updated_at = new Date();

    await customerRanking.save();
    await customerRanking.populate('rank_id', 'rank_name rank_id min_spending max_spending img about');

    res.status(200).json({
      success: true,
      message: 'Customer ranking updated successfully',
      data: { customerRanking }
    });
  });

  // DELETE /api/v1/customer-rankings/:id - Delete customer ranking
  static deleteCustomerRanking = asyncHandler(async (req, res) => {
    const customerRanking = await CustomerRanking.findById(req.params.id);
    
    if (!customerRanking) {
      return res.status(404).json({
        success: false,
        message: 'Customer ranking not found'
      });
    }

    await CustomerRanking.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Customer ranking deleted successfully'
    });
  });

  // GET /api/v1/customer-rankings/customer/:customerId - Get rankings by customer
  static getRankingsByCustomer = asyncHandler(async (req, res) => {
    const { customerId } = req.params;

    const customerRankings = await CustomerRanking.find({ customer_id: customerId })
      .populate('customer_id', 'customer_id name email phone_number')
      .populate('rank_id', 'rank_name rank_id min_spending max_spending img about')
      .sort({ updated_at: -1 });

    res.status(200).json({
      success: true,
      data: { customerRankings }
    });
  });

  // GET /api/v1/customer-rankings/statistics - Get customer ranking statistics
  static getCustomerRankingStatistics = asyncHandler(async (req, res) => {
    const totalCustomerRankings = await CustomerRanking.countDocuments();
    
    // Get ranking distribution
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
          customer_count: { $sum: 1 }
        }
      },
      { $sort: { customer_count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalCustomerRankings,
        rankingDistribution
      }
    });
  });

  // PUT /api/v1/customer-rankings/auto-assign - Auto assign rankings based on spending
  static autoAssignRankings = asyncHandler(async (req, res) => {
    // Get all rankings sorted by min_spending
    const rankings = await Ranking.find().sort({ min_spending: -1 });

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
        if (customer.total_order_amount >= ranking.min_spending) {
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
}

module.exports = CustomerRankingController;
