// controllers/AuditTrailController.js
// CRUD controller cho audit_trail collection 

const { AuditTrail, UserManagement } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

class AuditTrailController {
  // GET /api/v1/audit-trails - Get all audit trails
  static getAllAuditTrails = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { user_id, action, table_name, start_date, end_date, role, ranking, search } = req.query;

    let query = {};
    
    // Filter by specific user
    if (user_id) {
      query.user_id = user_id;
    }

    // NEW: Filter by role (ADMIN, MANAGER, USER)
    if (role && role !== 'all') {
      const { Role } = require('../models');
      const roleDoc = await Role.findOne({ role_name: role.toUpperCase() });
      if (roleDoc) {
        const users = await UserManagement.find({ role_id: roleDoc._id });
        const userIds = users.map(u => u._id);
        query.user_id = { $in: userIds };
      }
    }

    // NEW: Filter by customer ranking (BRONZE, SILVER, GOLD, PLATINUM)
    if (ranking && ranking !== 'all') {
      const { Ranking, CustomerRanking, UserCustomer } = require('../models');
      
      // Find ranking document
      const rankingDoc = await Ranking.findOne({ 
        ranking_name: { $regex: new RegExp(`^${ranking}$`, 'i') }
      });
      
      if (rankingDoc) {
        // Find customers with this ranking
        const customerRankings = await CustomerRanking.find({ ranking_id: rankingDoc._id });
        const customerIds = customerRankings.map(cr => cr.customer_id);
        
        // Find user_customers for these customers
        const userCustomers = await UserCustomer.find({ customer_id: { $in: customerIds } });
        const userIds = userCustomers.map(uc => uc.user_id);
        
        query.user_id = { $in: userIds };
      }
    }

    // NEW: Search by username/name
    if (search) {
      const users = await UserManagement.find({
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } }
        ]
      });
      const userIds = users.map(u => u._id);
      
      // Merge with existing user_id filter if exists
      if (query.user_id) {
        if (query.user_id.$in) {
          // Intersect two arrays
          query.user_id.$in = query.user_id.$in.filter(id => 
            userIds.some(uid => uid.toString() === id.toString())
          );
        } else {
          // Check if single user_id matches
          if (!userIds.some(uid => uid.toString() === query.user_id.toString())) {
            query.user_id = { $in: [] }; // No match
          }
        }
      } else {
        query.user_id = { $in: userIds };
      }
    }

    // Filter by action
    if (action && action !== 'all') {
      query.action = action.toUpperCase();
    }

    // Filter by table name
    if (table_name && table_name !== 'all') {
      query.table_name = { $regex: table_name, $options: 'i' };
    }

    // Filter by date range
    if (start_date || end_date) {
      query.created_at = {};
      if (start_date) query.created_at.$gte = new Date(start_date);
      if (end_date) query.created_at.$lte = new Date(end_date);
    }

    const total = await AuditTrail.countDocuments(query);

    const auditTrails = await AuditTrail.find(query)
      .populate({
        path: 'user_id',
        select: 'username name',
        populate: {
          path: 'role_id',
          select: 'role_name'
        }
      })
      .populate({
        path: 'customer_user_id',
        select: 'username',
        populate: {
          path: 'customer_id',
          select: 'name email'
        }
      })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        auditTrails,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/audit-trails/:id - Get audit trail by ID
  static getAuditTrailById = asyncHandler(async (req, res) => {
    const auditTrail = await AuditTrail.findById(req.params.id)
      .populate('user_id', 'username name');

    if (!auditTrail) {
      return res.status(404).json({
        success: false,
        message: 'Audit trail not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { auditTrail }
    });
  });

  // POST /api/v1/audit-trails - Create new audit trail
  static createAuditTrail = asyncHandler(async (req, res) => {
    const { user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent } = req.body;

    if (!user_id || !action || !table_name) {
      return res.status(400).json({
        success: false,
        message: 'User ID, action, and table name are required'
      });
    }

    // Verify user exists
    const user = await UserManagement.findById(user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const auditTrail = new AuditTrail({
      user_id,
      action,
      table_name,
      record_id: record_id || null,
      old_values: old_values || null,
      new_values: new_values || null,
      ip_address: ip_address || req.ip,
      user_agent: user_agent || req.get('User-Agent'),
      created_at: new Date()
    });

    await auditTrail.save();

    // Populate for response
    await auditTrail.populate('user_id', 'username name');

    res.status(201).json({
      success: true,
      message: 'Audit trail created successfully',
      data: { auditTrail }
    });
  });

  // DELETE /api/v1/audit-trails/:id - Delete audit trail (Admin only)
  static deleteAuditTrail = asyncHandler(async (req, res) => {
    const auditTrail = await AuditTrail.findById(req.params.id);
    
    if (!auditTrail) {
      return res.status(404).json({
        success: false,
        message: 'Audit trail not found'
      });
    }

    await AuditTrail.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Audit trail deleted successfully'
    });
  });

  // GET /api/v1/audit-trails/user/:userId - Get audit trails for specific user
  static getUserAuditTrails = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page, limit, skip } = req.pagination;

    // Verify user exists
    const user = await UserManagement.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const total = await AuditTrail.countDocuments({ user_id: userId });

    const auditTrails = await AuditTrail.find({ user_id: userId })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          username: user.username,
          name: user.name
        },
        auditTrails,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/audit-trails/statistics - Get audit trail statistics
  static getAuditTrailStatistics = asyncHandler(async (req, res) => {
    const totalRecords = await AuditTrail.countDocuments();

    // Actions distribution
    const actionStats = await AuditTrail.aggregate([
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Tables distribution
    const tableStats = await AuditTrail.aggregate([
      {
        $group: {
          _id: '$table_name',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Most active users
    const userStats = await AuditTrail.aggregate([
      {
        $lookup: {
          from: 'user_management',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $group: {
          _id: '$user_id',
          username: { $first: '$user.username' },
          name: { $first: '$user.name' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentActivity = await AuditTrail.countDocuments({
      created_at: { $gte: sevenDaysAgo }
    });

    // Daily activity trend (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activityTrend = await AuditTrail.aggregate([
      {
        $match: {
          created_at: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$created_at' },
            month: { $month: '$created_at' },
            day: { $dayOfMonth: '$created_at' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalRecords,
        recentActivity,
        actionDistribution: actionStats,
        tableDistribution: tableStats,
        mostActiveUsers: userStats,
        activityTrend
      }
    });
  });

  // DELETE /api/v1/audit-trails/cleanup - Cleanup old audit trails
  static cleanupOldTrails = asyncHandler(async (req, res) => {
    const { days = 90 } = req.body;

    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await AuditTrail.deleteMany({
      created_at: { $lt: cutoffDate }
    });

    res.status(200).json({
      success: true,
      message: `Cleaned up audit trails older than ${days} days`,
      data: {
        deletedCount: result.deletedCount,
        cutoffDate
      }
    });
  });
}

module.exports = AuditTrailController;
