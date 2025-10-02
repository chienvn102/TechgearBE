// controllers/NotificationControllerV2.js
// Enhanced Notification Controller với notification system features

const { Notification, Customer, CustomerRanking, Ranking, Order } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

class NotificationControllerV2 {
  
  // ==================== ADMIN ENDPOINTS ====================
  
  /**
   * GET /api/v1/notifications/admin/all
   * Get all notifications (Admin only)
   */
  static getAllNotifications = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { search, noti_type, target_audience, is_read } = req.query;

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

    if (target_audience) {
      query.target_audience = target_audience.toUpperCase();
    }

    if (is_read !== undefined) {
      query.is_read = is_read === 'true';
    }

    const total = await Notification.countDocuments(query);

    const notifications = await Notification.find(query)
      .populate('customer_id', 'customer_id name email phone_number')
      .populate('order_id', 'od_id order_total')
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

  /**
   * POST /api/v1/notifications/admin/send
   * Send notification to specific customer(s) or by rank
   */
  static sendNotification = asyncHandler(async (req, res) => {
    const {
      noti_type,
      noti_title,
      noti_content,
      target_audience, // 'ALL', 'BRONZE', 'SILVER', 'GOLD', etc., or 'SPECIFIC'
      customer_ids, // Array of customer IDs for SPECIFIC
      link_to,
      priority = 'MEDIUM'
    } = req.body;

    // Validation
    if (!noti_type || !noti_title || !noti_content || !target_audience) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        errors: [
          { field: 'noti_type', message: 'noti_type is required' },
          { field: 'noti_title', message: 'noti_title is required' },
          { field: 'noti_content', message: 'noti_content is required' },
          { field: 'target_audience', message: 'target_audience is required' }
        ]
      });
    }

    let targetCustomers = [];

    // Determine target customers based on audience
    if (target_audience === 'ALL') {
      // Send to all customers
      targetCustomers = await Customer.find({}).select('_id');
    } else if (target_audience === 'SPECIFIC') {
      // Send to specific customers
      if (!customer_ids || !Array.isArray(customer_ids) || customer_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'customer_ids array is required for SPECIFIC target',
          errors: [{ field: 'customer_ids', message: 'customer_ids must be a non-empty array' }]
        });
      }
      targetCustomers = customer_ids.map(id => ({ _id: id }));
    } else {
      // Send to customers with specific rank (BRONZE, SILVER, GOLD, PLATINUM)
      // Find ranking by rank_id (not ranking_name)
      const ranking = await Ranking.findOne({ 
        rank_id: target_audience.toUpperCase() 
      });

      if (!ranking) {
        return res.status(404).json({
          success: false,
          message: `Ranking ${target_audience} not found in database`
        });
      }

      // Find all customer rankings with this ranking
      const customerRankings = await CustomerRanking.find({
        rank_id: ranking._id
      }).populate('customer_id');

      targetCustomers = customerRankings.map(cr => ({ _id: cr.customer_id._id }));
    }

    if (targetCustomers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No target customers found for the specified audience'
      });
    }

    // Create notifications for all target customers
    const notifications = [];
    const timestamp = Date.now();

    for (let i = 0; i < targetCustomers.length; i++) {
      const noti_id = `NOTI${timestamp}${i.toString().padStart(4, '0')}`;
      
      notifications.push({
        noti_id,
        customer_id: targetCustomers[i]._id,
        noti_type: noti_type.toUpperCase(),
        noti_title,
        noti_content,
        target_audience: target_audience.toUpperCase(),
        link_to: link_to || null,
        priority: priority.toUpperCase(),
        is_read: false,
        created_at: new Date()
      });
    }

    // Bulk insert notifications
    const createdNotifications = await Notification.insertMany(notifications);

    // 🔔 Emit Socket.io events for real-time notifications
    if (global.io) {
      for (const notification of createdNotifications) {
        global.io.to(`customer:${notification.customer_id}`).emit('notification:new', {
          id: notification._id,
          noti_id: notification.noti_id,
          noti_type: notification.noti_type,
          noti_title: notification.noti_title,
          noti_content: notification.noti_content,
          priority: notification.priority,
          link_to: notification.link_to,
          created_at: notification.created_at
        });
      }
      console.log(`🔔 Real-time notifications sent to ${createdNotifications.length} customer(s)`);
    }

    res.status(201).json({
      success: true,
      data: {
        message: `Successfully sent ${createdNotifications.length} notification(s)`,
        count: createdNotifications.length,
        target_audience,
        sample: createdNotifications[0] // Return first notification as sample
      }
    });
  });

  /**
   * GET /api/v1/notifications/admin/statistics
   * Get notification statistics
   */
  static getStatistics = asyncHandler(async (req, res) => {
    const total = await Notification.countDocuments();
    const unread = await Notification.countDocuments({ is_read: false });
    const read = await Notification.countDocuments({ is_read: true });

    const byType = await Notification.aggregate([
      {
        $group: {
          _id: '$noti_type',
          count: { $sum: 1 }
        }
      }
    ]);

    const byAudience = await Notification.aggregate([
      {
        $group: {
          _id: '$target_audience',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        unread,
        read,
        byType,
        byAudience
      }
    });
  });

  // ==================== CUSTOMER ENDPOINTS ====================

  /**
   * GET /api/v1/notifications/my-notifications
   * Get current customer's notifications
   */
  static getMyNotifications = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { is_read, noti_type } = req.query;

    // Get customer_id from authenticated user
    const customerId = req.user.customer_id || req.user._id;

    let query = { customer_id: customerId };

    if (is_read !== undefined) {
      query.is_read = is_read === 'true';
    }

    if (noti_type) {
      query.noti_type = noti_type.toUpperCase();
    }

    const total = await Notification.countDocuments(query);

    const notifications = await Notification.find(query)
      .populate('order_id', 'od_id order_total payment_status_id')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    const unreadCount = await Notification.countDocuments({
      customer_id: customerId,
      is_read: false
    });

    res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  /**
   * GET /api/v1/notifications/:id
   * Get notification by ID and mark as read
   */
  static getNotificationById = asyncHandler(async (req, res) => {
    const customerId = req.user.customer_id || req.user._id;

    const notification = await Notification.findById(req.params.id)
      .populate('customer_id', 'customer_id name email')
      .populate('order_id', 'od_id order_total order_datetime payment_status_id');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if customer owns this notification (unless admin)
    if (req.user.role !== 'ADMIN' && notification.customer_id._id.toString() !== customerId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own notifications'
      });
    }

    // Auto mark as read when viewing
    if (!notification.is_read) {
      notification.is_read = true;
      notification.read_at = new Date();
      await notification.save();
    }

    res.status(200).json({
      success: true,
      data: { notification }
    });
  });

  /**
   * PUT /api/v1/notifications/:id/mark-read
   * Mark notification as read
   */
  static markAsRead = asyncHandler(async (req, res) => {
    const customerId = req.user.customer_id || req.user._id;

    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check ownership
    if (notification.customer_id.toString() !== customerId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (notification.is_read) {
      return res.status(200).json({
        success: true,
        message: 'Notification already marked as read',
        data: { notification }
      });
    }

    notification.is_read = true;
    notification.read_at = new Date();
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: { notification }
    });
  });

  /**
   * PUT /api/v1/notifications/mark-all-read
   * Mark all notifications as read for current customer
   */
  static markAllAsRead = asyncHandler(async (req, res) => {
    const customerId = req.user.customer_id || req.user._id;

    const result = await Notification.updateMany(
      {
        customer_id: customerId,
        is_read: false
      },
      {
        $set: {
          is_read: true,
          read_at: new Date()
        }
      }
    );

    res.status(200).json({
      success: true,
      message: `Marked ${result.modifiedCount} notification(s) as read`,
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  });

  /**
   * GET /api/v1/notifications/unread-count
   * Get unread notification count for current customer
   */
  static getUnreadCount = asyncHandler(async (req, res) => {
    const customerId = req.user.customer_id || req.user._id;

    const unreadCount = await Notification.countDocuments({
      customer_id: customerId,
      is_read: false
    });

    res.status(200).json({
      success: true,
      data: {
        unreadCount
      }
    });
  });

  /**
   * DELETE /api/v1/notifications/:id
   * Delete notification (Admin only)
   */
  static deleteNotification = asyncHandler(async (req, res) => {
    const notification = await Notification.findByIdAndDelete(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
      data: { notification }
    });
  });

  // ==================== ORDER STATUS NOTIFICATIONS ====================

  /**
   * Create notification when order status changes
   * Called from OrderController
   */
  static createOrderStatusNotification = async (orderId, customerId, statusType, orderDetails) => {
    try {
      const timestamp = Date.now();
      const noti_id = `NOTI${timestamp}${Math.floor(Math.random() * 1000)}`;

      let noti_title = '';
      let noti_content = '';
      let noti_type = 'ORDER_STATUS';

      switch (statusType) {
        case 'CONFIRMED':
          noti_title = 'Đơn hàng đã được xác nhận';
          noti_content = `Đơn hàng #${orderDetails.od_id} của bạn đã được xác nhận và đang được xử lý. Tổng giá trị: ${orderDetails.order_total.toLocaleString('vi-VN')}đ`;
          noti_type = 'ORDER_CONFIRMED';
          break;
        case 'SHIPPED':
          noti_title = 'Đơn hàng đang được giao';
          noti_content = `Đơn hàng #${orderDetails.od_id} đã được giao cho đơn vị vận chuyển. Bạn sẽ nhận được hàng trong thời gian sớm nhất.`;
          noti_type = 'ORDER_SHIPPED';
          break;
        case 'DELIVERED':
          noti_title = 'Đơn hàng đã giao thành công';
          noti_content = `Đơn hàng #${orderDetails.od_id} đã được giao thành công. Cảm ơn bạn đã mua sắm tại cửa hàng!`;
          noti_type = 'DELIVERY';
          break;
        case 'CANCELLED':
          noti_title = 'Đơn hàng đã bị hủy';
          noti_content = `Đơn hàng #${orderDetails.od_id} đã bị hủy. Nếu bạn có thắc mắc, vui lòng liên hệ bộ phận chăm sóc khách hàng.`;
          noti_type = 'ORDER_CANCELLED';
          break;
        default:
          noti_title = 'Cập nhật trạng thái đơn hàng';
          noti_content = `Đơn hàng #${orderDetails.od_id} đã có cập nhật mới.`;
      }

      const notification = await Notification.create({
        noti_id,
        customer_id: customerId,
        noti_type,
        noti_title,
        noti_content,
        target_audience: 'SPECIFIC',
        link_to: `/orders/${orderId}`,
        order_id: orderId,
        priority: statusType === 'CANCELLED' ? 'HIGH' : 'MEDIUM',
        is_read: false,
        created_at: new Date()
      });

      // Emit real-time notification via Socket.io
      if (global.io) {
        global.io.to(`customer:${customerId}`).emit('notification:new', {
          notification: notification.toObject(),
          type: 'order_status'
        });
        console.log(`🔔 Real-time order notification sent to customer ${customerId}`);
      }

      return notification;
    } catch (error) {
      console.error('Error creating order status notification:', error);
      return null;
    }
  };

  /**
   * Helper: Create rank upgrade notification
   * Called when customer ranking is upgraded
   */
  static createRankUpgradeNotification = async ({ customer_id, ranking_name, emoji, benefits }) => {
    try {
      const timestamp = Date.now();
      const noti_id = `NOTI${timestamp}${Math.floor(Math.random() * 1000)}`;

      const noti_title = `${emoji} Chúc mừng! Bạn đã lên hạng ${ranking_name}`;
      const noti_content = `Chúc mừng bạn đã được thăng hạng lên ${ranking_name}! 🎉\n\nĐặc quyền của bạn:\n✨ ${benefits}\n\nCảm ơn bạn đã đồng hành cùng chúng tôi!`;

      const notification = await Notification.create({
        noti_id,
        customer_id,
        noti_type: 'SYSTEM',
        noti_title,
        noti_content,
        target_audience: 'SPECIFIC',
        link_to: '/profile',
        priority: 'HIGH',
        is_read: false,
        created_at: new Date()
      });

      console.log(`✅ Rank upgrade notification created for customer ${customer_id}: ${ranking_name}`);

      // Emit real-time notification via Socket.io
      if (global.io) {
        global.io.to(`customer:${customer_id}`).emit('notification:new', {
          notification: notification.toObject(),
          type: 'rank_upgrade'
        });
        console.log(`🔔 Real-time notification sent to customer ${customer_id}`);
      }

      return notification;
    } catch (error) {
      console.error('Error creating rank upgrade notification:', error);
      return null;
    }
  };

  /**
   * Helper: Emit notification via Socket.io
   * Used to send real-time notifications
   */
  static emitNotification = async (notification) => {
    try {
      if (global.io && notification.customer_id) {
        global.io.to(`customer:${notification.customer_id}`).emit('notification:new', {
          notification: notification.toObject ? notification.toObject() : notification,
          type: 'general'
        });
        console.log(`🔔 Real-time notification emitted to customer ${notification.customer_id}`);
      }
    } catch (error) {
      console.error('Error emitting notification:', error);
    }
  };
}

module.exports = NotificationControllerV2;
