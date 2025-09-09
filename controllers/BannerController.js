// controllers/BannerController.js
// CRUD controller cho banner collection 

const { Banner } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

class BannerController {
  // GET /api/v1/banners - Get all banners
  static getAllBanners = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { search, banner_type, is_active } = req.query;

    let query = {};
    
    if (search) {
      query.$or = [
        { banner_title: { $regex: search, $options: 'i' } },
        { banner_description: { $regex: search, $options: 'i' } }
      ];
    }

    if (banner_type) {
      query.banner_type = banner_type;
    }

    if (is_active !== undefined) {
      query.is_active = is_active === 'true';
    }

    const total = await Banner.countDocuments(query);

    const banners = await Banner.find(query)
      .sort({ banner_order: 1, _id: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        banners,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/banners/:id - Get banner by ID
  static getBannerById = asyncHandler(async (req, res) => {
    const banner = await Banner.findById(req.params.id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { banner }
    });
  });

  // POST /api/v1/banners - Create new banner
  static createBanner = asyncHandler(async (req, res) => {
    const {
      banner_title,
      banner_description,
      banner_image_url,
      banner_link_url,
      banner_type,
      banner_order,
      start_date,
      end_date,
      is_active = true
    } = req.body;

    if (!banner_title || !banner_image_url || !banner_type) {
      return res.status(400).json({
        success: false,
        message: 'Banner title, image URL and type are required'
      });
    }

    // Validate banner type
    const validTypes = ['homepage', 'category', 'product', 'promotion'];
    if (!validTypes.includes(banner_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid banner type'
      });
    }

    // Validate dates
    if (start_date && end_date && new Date(start_date) >= new Date(end_date)) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date'
      });
    }

    // Set banner order if not provided
    let order = banner_order;
    if (!order) {
      const maxOrder = await Banner.findOne({ banner_type }).sort({ banner_order: -1 });
      order = maxOrder ? maxOrder.banner_order + 1 : 1;
    }

    const banner = new Banner({
      banner_title,
      banner_description: banner_description || '',
      banner_image_url,
      banner_link_url: banner_link_url || null,
      banner_type,
      banner_order: order,
      start_date: start_date ? new Date(start_date) : null,
      end_date: end_date ? new Date(end_date) : null,
      is_active,
      created_at: new Date()
    });

    await banner.save();

    res.status(201).json({
      success: true,
      message: 'Banner created successfully',
      data: { banner }
    });
  });

  // PUT /api/v1/banners/:id - Update banner
  static updateBanner = asyncHandler(async (req, res) => {
    const {
      banner_title,
      banner_description,
      banner_image_url,
      banner_link_url,
      banner_type,
      banner_order,
      start_date,
      end_date,
      is_active
    } = req.body;

    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    // Validate banner type if provided
    if (banner_type) {
      const validTypes = ['homepage', 'category', 'product', 'promotion'];
      if (!validTypes.includes(banner_type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid banner type'
        });
      }
    }

    // Validate dates
    const newStartDate = start_date ? new Date(start_date) : banner.start_date;
    const newEndDate = end_date ? new Date(end_date) : banner.end_date;
    
    if (newStartDate && newEndDate && newStartDate >= newEndDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date'
      });
    }

    // Update fields
    if (banner_title) banner.banner_title = banner_title;
    if (banner_description !== undefined) banner.banner_description = banner_description;
    if (banner_image_url) banner.banner_image_url = banner_image_url;
    if (banner_link_url !== undefined) banner.banner_link_url = banner_link_url;
    if (banner_type) banner.banner_type = banner_type;
    if (banner_order !== undefined) banner.banner_order = banner_order;
    if (start_date !== undefined) banner.start_date = start_date ? new Date(start_date) : null;
    if (end_date !== undefined) banner.end_date = end_date ? new Date(end_date) : null;
    if (is_active !== undefined) banner.is_active = is_active;

    await banner.save();

    res.status(200).json({
      success: true,
      message: 'Banner updated successfully',
      data: { banner }
    });
  });

  // DELETE /api/v1/banners/:id - Delete banner
  static deleteBanner = asyncHandler(async (req, res) => {
    const banner = await Banner.findById(req.params.id);
    
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    await Banner.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Banner deleted successfully'
    });
  });

  // GET /api/v1/banners/active - Get active banners for display
  static getActiveBanners = asyncHandler(async (req, res) => {
    const { banner_type } = req.query;

    const now = new Date();
    let query = {
      is_active: true,
      $or: [
        { start_date: null },
        { start_date: { $lte: now } }
      ],
      $and: [
        {
          $or: [
            { end_date: null },
            { end_date: { $gte: now } }
          ]
        }
      ]
    };

    if (banner_type) {
      query.banner_type = banner_type;
    }

    const banners = await Banner.find(query)
      .sort({ banner_order: 1, _id: -1 });

    res.status(200).json({
      success: true,
      data: { banners }
    });
  });

  // PUT /api/v1/banners/:id/toggle-status - Toggle banner active status
  static toggleBannerStatus = asyncHandler(async (req, res) => {
    const banner = await Banner.findById(req.params.id);
    
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    banner.is_active = !banner.is_active;
    await banner.save();

    res.status(200).json({
      success: true,
      message: `Banner ${banner.is_active ? 'activated' : 'deactivated'} successfully`,
      data: { banner }
    });
  });

  // PUT /api/v1/banners/reorder - Reorder banners
  static reorderBanners = asyncHandler(async (req, res) => {
    const { banner_orders } = req.body;

    if (!banner_orders || !Array.isArray(banner_orders)) {
      return res.status(400).json({
        success: false,
        message: 'Banner orders array is required'
      });
    }

    const updatePromises = banner_orders.map(({ banner_id, order }) => 
      Banner.findByIdAndUpdate(banner_id, { banner_order: order })
    );

    await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      message: 'Banners reordered successfully'
    });
  });

  // GET /api/v1/banners/statistics - Get banner statistics
  static getBannerStatistics = asyncHandler(async (req, res) => {
    const totalBanners = await Banner.countDocuments();
    const activeBanners = await Banner.countDocuments({ is_active: true });

    // Banner stats by type
    const bannersByType = await Banner.aggregate([
      {
        $group: {
          _id: '$banner_type',
          count: { $sum: 1 },
          active_count: {
            $sum: { $cond: ['$is_active', 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Currently displayed banners (active and within date range)
    const now = new Date();
    const displayedBanners = await Banner.countDocuments({
      is_active: true,
      $or: [
        { start_date: null },
        { start_date: { $lte: now } }
      ],
      $and: [
        {
          $or: [
            { end_date: null },
            { end_date: { $gte: now } }
          ]
        }
      ]
    });

    // Expired banners
    const expiredBanners = await Banner.countDocuments({
      end_date: { $lt: now }
    });

    // Scheduled banners (future start date)
    const scheduledBanners = await Banner.countDocuments({
      start_date: { $gt: now }
    });

    res.status(200).json({
      success: true,
      data: {
        totalBanners,
        activeBanners,
        displayedBanners,
        expiredBanners,
        scheduledBanners,
        bannersByType
      }
    });
  });
}

module.exports = BannerController;
