// controllers/NotificationController.js
// CRUD controller cho notification collection 

const { Notification, Customer } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

class NotificationController {
  // GET /api/v1/notifications - Get all notifications (Admin)
  static getAllNotifications = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { search, noti_type, customer_id } = req.query;

    let query = {};
    
    if (search) {
      query.$or = [
        { noti_title: { $regex: search, $options: 'i' } },
        { noti_content: { $regex: search, $options: 'i' } }
      ];
    }

    if (noti_type) {
      query.noti_type = noti_type.toUpperCase();
    }

    if (customer_id) {
      query.customer_id = customer_id;
    }

    const total = await Notification.countDocuments(query);

    const notifications = await Notification.find(query)
      .populate('customer_id', 'customer_id name email')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/notifications/:id - Get notification by ID
  static getNotificationById = asyncHandler(async (req, res) => {
    const notification = await Notification.findById(req.params.id)
      .populate('customer_id', 'customer_id name email');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { notification }
    });
  });

  // POST /api/v1/notifications - Create new notification
  static createNotification = asyncHandler(async (req, res) => {
    const { 
      noti_id,
      customer_id, 
      noti_type, 
      noti_title,
      noti_content 
    } = req.body;

    if (!noti_id || !customer_id || !noti_type || !noti_title || !noti_content) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided',
        errors: [
          { field: 'noti_id', message: 'noti_id is required' },
          { field: 'customer_id', message: 'customer_id is required' },
          { field: 'noti_type', message: 'noti_type is required' },
          { field: 'noti_title', message: 'noti_title is required' },
          { field: 'noti_content', message: 'noti_content is required' }
        ]
      });
    }

    // Check if noti_id already exists
    const existingNotification = await Notification.findOne({ noti_id });
    if (existingNotification) {
      return res.status(400).json({
        success: false,
        message: 'Notification with this noti_id already exists',
        errors: [{ field: 'noti_id', message: 'noti_id must be unique' }]
      });
    }

    // Verify customer exists
    const customer = await Customer.findById(customer_id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
        errors: [{ field: 'customer_id', message: 'Customer does not exist' }]
      });
    }

    const notification = new Notification({
      noti_id,
      customer_id,
      noti_type: noti_type.toUpperCase(),
      noti_title,
      noti_content
    });

    await notification.save();

    // Populate customer info before returning
    await notification.populate('customer_id', 'customer_id name email');

    res.status(201).json({
      success: true,
      data: { notification },
      message: 'Notification created successfully'
    });
  });

  // PUT /api/v1/notifications/:id - Update notification
  static updateNotification = asyncHandler(async (req, res) => {
    const { 
      noti_id,
      customer_id,
      noti_type, 
      noti_title,
      noti_content 
    } = req.body;

    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if new noti_id conflicts with existing notifications
    if (noti_id && noti_id !== notification.noti_id) {
      const existingNotification = await Notification.findOne({ noti_id });
      if (existingNotification) {
        return res.status(400).json({
          success: false,
          message: 'Notification with this noti_id already exists',
          errors: [{ field: 'noti_id', message: 'noti_id must be unique' }]
        });
      }
    }

    // Verify customer exists if customer_id is being updated
    if (customer_id && customer_id !== notification.customer_id.toString()) {
      const customer = await Customer.findById(customer_id);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found',
          errors: [{ field: 'customer_id', message: 'Customer does not exist' }]
        });
      }
    }

    // Update fields
    if (noti_id) notification.noti_id = noti_id;
    if (customer_id) notification.customer_id = customer_id;
    if (noti_type) notification.noti_type = noti_type.toUpperCase();
    if (noti_title) notification.noti_title = noti_title;
    if (noti_content) notification.noti_content = noti_content;

    await notification.save();
    await notification.populate('customer_id', 'customer_id name email');

    res.status(200).json({
      success: true,
      data: { notification },
      message: 'Notification updated successfully'
    });
  });

  // DELETE /api/v1/notifications/:id - Delete notification
  static deleteNotification = asyncHandler(async (req, res) => {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await Notification.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  });

  // GET /api/v1/notifications/my-notifications - Get customer's notifications
  static getMyNotifications = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { noti_type, is_read } = req.query;
    
    // Get customer_id from authenticated user
    // Assuming user.customer_id is available from auth middleware
    const customer_id = req.user.customer_id;

    if (!customer_id) {
      return res.status(400).json({
        success: false,
        message: 'Customer ID not found in user profile'
      });
    }

    let query = { customer_id };

    if (noti_type) {
      query.noti_type = noti_type.toUpperCase();
    }

    const total = await Notification.countDocuments(query);

    const notifications = await Notification.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/notifications/by-type/:type - Get notifications by type
  static getNotificationsByType = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { type } = req.params;

    const query = { noti_type: type.toUpperCase() };

    const total = await Notification.countDocuments(query);

    const notifications = await Notification.find(query)
      .populate('customer_id', 'customer_id name email')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        type: type.toUpperCase(),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/notifications/customer/:customerId - Get notifications for specific customer
  static getCustomerNotifications = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { customerId } = req.params;

    // Verify customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const query = { customer_id: customerId };

    const total = await Notification.countDocuments(query);

    const notifications = await Notification.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        customer: {
          _id: customer._id,
          customer_id: customer.customer_id,
          name: customer.name
        },
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/notifications/search - Search notifications
  static searchNotifications = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { q, type, customer } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
        errors: [{ field: 'q', message: 'Search query (q) is required' }]
      });
    }

    let query = {
      $or: [
        { noti_title: { $regex: q, $options: 'i' } },
        { noti_content: { $regex: q, $options: 'i' } }
      ]
    };

    if (type) {
      query.noti_type = type.toUpperCase();
    }

    if (customer) {
      query.customer_id = customer;
    }

    const total = await Notification.countDocuments(query);

    const notifications = await Notification.find(query)
      .populate('customer_id', 'customer_id name email')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        searchQuery: q,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });
}

module.exports = NotificationController;
