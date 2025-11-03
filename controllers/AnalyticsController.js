// controllers/AnalyticsController.js
// Analytics & Dashboard Statistics Controller

const { 
  Order, 
  ProductOrder, 
  Customer, 
  Product, 
  Voucher,
  VoucherUsage,
  CustomerRanking,
  Ranking,
  ProductReview,
  Category,
  Brand,
  OrderInfo,
  PaymentMethod,
  PaymentStatus
} = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

class AnalyticsController {
  
  // ==================== MAIN DASHBOARD ====================
  
  /**
   * GET /api/v1/analytics/dashboard
   * Get complete dashboard analytics data
   */
  static getDashboardData = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    
    console.log('📊 Fetching dashboard analytics...');
    
    // Parse date range (default: last 30 days)
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Parallel execution for performance
    const [
      revenueMetrics,
      orderMetrics,
      customerMetrics,
      productMetrics,
      voucherMetrics
    ] = await Promise.all([
      this.calculateRevenueMetrics(start, end),
      this.calculateOrderMetrics(start, end),
      this.calculateCustomerMetrics(start, end),
      this.calculateProductMetrics(start, end),
      this.calculateVoucherMetrics(start, end)
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        revenue: revenueMetrics,
        orders: orderMetrics,
        customers: customerMetrics,
        products: productMetrics,
        vouchers: voucherMetrics,
        dateRange: { start, end },
        lastUpdated: new Date()
      }
    });
  });
  
  
  // ==================== REVENUE ANALYTICS ====================
  
  /**
   * GET /api/v1/analytics/revenue
   * Get revenue analytics
   */
  static getRevenueMetrics = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    const metrics = await this.calculateRevenueMetrics(start, end);
    
    res.status(200).json({
      success: true,
      data: metrics
    });
  });
  
  static calculateRevenueMetrics = async (startDate, endDate) => {
    try {
      // 1. Total Revenue (all time)
      const totalRevenueResult = await Order.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: '$order_total' }
          }
        }
      ]);
      const totalRevenue = totalRevenueResult[0]?.total || 0;
      
      // 2. Revenue in date range
      const rangeRevenueResult = await Order.aggregate([
        {
          $match: {
            order_datetime: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$order_total' },
            count: { $sum: 1 }
          }
        }
      ]);
      const rangeRevenue = rangeRevenueResult[0]?.total || 0;
      const rangeOrderCount = rangeRevenueResult[0]?.count || 0;
      
      // 3. Revenue Today
      const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
      const revenueToday = await Order.aggregate([
        {
          $match: {
            order_datetime: { $gte: todayStart }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$order_total' }
          }
        }
      ]);
      
      // 4. Revenue This Week
      const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const revenueThisWeek = await Order.aggregate([
        {
          $match: {
            order_datetime: { $gte: weekStart }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$order_total' }
          }
        }
      ]);
      
      // 5. Revenue This Month
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const revenueThisMonth = await Order.aggregate([
        {
          $match: {
            order_datetime: { $gte: monthStart }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$order_total' }
          }
        }
      ]);
      
      // 6. Average Order Value
      const avgOrderValue = rangeOrderCount > 0 ? rangeRevenue / rangeOrderCount : 0;
      
      // 7. Revenue Timeline (daily for last 30 days)
      const timelineStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const revenueTimeline = await Order.aggregate([
        {
          $match: {
            order_datetime: { $gte: timelineStart }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$order_datetime' }
            },
            revenue: { $sum: '$order_total' },
            orders: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);
      
      // Format timeline for frontend
      const timeline = revenueTimeline.map(item => ({
        date: item._id,
        value: item.revenue,
        orders: item.orders
      }));
      
      // 8. Revenue by Payment Method
      const revenueByPaymentMethod = await Order.aggregate([
        {
          $match: {
            order_datetime: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $lookup: {
            from: 'payment_method',
            localField: 'pm_id',
            foreignField: '_id',
            as: 'payment_method'
          }
        },
        {
          $unwind: { path: '$payment_method', preserveNullAndEmptyArrays: true }
        },
        {
          $group: {
            _id: '$payment_method.pm_name',
            revenue: { $sum: '$order_total' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { revenue: -1 }
        }
      ]);
      
      // Calculate growth rates (mock for now - would need historical comparison)
      const yesterdayRevenue = revenueToday[0]?.total || 0;
      const dailyGrowth = 12.5; // Mock - calculate from yesterday's revenue
      const weeklyGrowth = 8.3; // Mock
      const monthlyGrowth = 15.2; // Mock
      
      return {
        total: totalRevenue,
        today: revenueToday[0]?.total || 0,
        thisWeek: revenueThisWeek[0]?.total || 0,
        thisMonth: revenueThisMonth[0]?.total || 0,
        inRange: rangeRevenue,
        averageOrderValue: avgOrderValue,
        growth: {
          daily: dailyGrowth,
          weekly: weeklyGrowth,
          monthly: monthlyGrowth
        },
        timeline: revenueTimeline.map(item => ({
          date: item._id,
          revenue: item.revenue,
          orders: item.orders
        })),
        byPaymentMethod: revenueByPaymentMethod.map(item => ({
          method: item._id || 'Unknown',
          revenue: item.revenue,
          count: item.count
        }))
      };
    } catch (error) {
      console.error('❌ Error calculating revenue metrics:', error);
      throw error;
    }
  };
  
  
  /**
   * GET /api/v1/analytics/revenue/timeline
   * Get revenue timeline with flexible filtering
   * Query params:
   * - viewType: 'day' | 'week' | 'month' | 'year'
   * - specificDate: '2025-01-15' (for day view)
   * - specificMonth: '2025-01' (for month view)
   * - specificYear: '2025' (for year view)
   */
  static getRevenueTimeline = asyncHandler(async (req, res) => {
    const { viewType = 'day', specificDate, specificMonth, specificYear } = req.query;
    
    let matchCondition = {};
    let groupFormat = '';
    let dateLabel = '';
    
    // Determine date range and grouping based on viewType
    switch (viewType) {
      case 'day': {
        // View revenue by day
        if (specificMonth && specificYear) {
          // Show all days in specific month
          const year = parseInt(specificYear);
          const month = parseInt(specificMonth.split('-')[1]) - 1;
          const start = new Date(year, month, 1);
          const end = new Date(year, month + 1, 0, 23, 59, 59);
          matchCondition = { order_datetime: { $gte: start, $lte: end } };
          dateLabel = `Doanh thu tháng ${month + 1}/${year} (theo ngày)`;
        } else if (specificYear) {
          // Show all days in specific year
          const year = parseInt(specificYear);
          const start = new Date(year, 0, 1);
          const end = new Date(year, 11, 31, 23, 59, 59);
          matchCondition = { order_datetime: { $gte: start, $lte: end } };
          dateLabel = `Doanh thu năm ${year} (theo ngày)`;
        } else {
          // Default: last 30 days
          const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          matchCondition = { order_datetime: { $gte: start } };
          dateLabel = 'Doanh thu 30 ngày qua (theo ngày)';
        }
        groupFormat = '%Y-%m-%d';
        break;
      }
      
      case 'week': {
        // View revenue by week
        if (specificYear) {
          const year = parseInt(specificYear);
          const start = new Date(year, 0, 1);
          const end = new Date(year, 11, 31, 23, 59, 59);
          matchCondition = { order_datetime: { $gte: start, $lte: end } };
          dateLabel = `Doanh thu năm ${year} (theo tuần)`;
        } else {
          // Default: current year
          const currentYear = new Date().getFullYear();
          const start = new Date(currentYear, 0, 1);
          const end = new Date(currentYear, 11, 31, 23, 59, 59);
          matchCondition = { order_datetime: { $gte: start, $lte: end } };
          dateLabel = `Doanh thu năm ${currentYear} (theo tuần)`;
        }
        groupFormat = '%Y-W%U'; // Year-Week format
        break;
      }
      
      case 'month': {
        // View revenue by month
        if (specificYear) {
          const year = parseInt(specificYear);
          const start = new Date(year, 0, 1);
          const end = new Date(year, 11, 31, 23, 59, 59);
          matchCondition = { order_datetime: { $gte: start, $lte: end } };
          dateLabel = `Doanh thu năm ${year} (theo tháng)`;
        } else {
          // Default: current year
          const currentYear = new Date().getFullYear();
          const start = new Date(currentYear, 0, 1);
          const end = new Date(currentYear, 11, 31, 23, 59, 59);
          matchCondition = { order_datetime: { $gte: start, $lte: end } };
          dateLabel = `Doanh thu năm ${currentYear} (theo tháng)`;
        }
        groupFormat = '%Y-%m';
        break;
      }
      
      case 'year': {
        // View revenue by year (all years)
        matchCondition = {}; // No date filter - get all years
        groupFormat = '%Y';
        dateLabel = 'Doanh thu tất cả các năm';
        break;
      }
      
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid viewType. Must be: day, week, month, or year'
        });
    }
    
    // Aggregate revenue data
    const timeline = await Order.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: {
            $dateToString: { format: groupFormat, date: '$order_datetime' }
          },
          revenue: { $sum: '$order_total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Format response
    const formattedTimeline = timeline.map(item => ({
      date: item._id,
      value: item.revenue,
      orders: item.orders
    }));
    
    res.status(200).json({
      success: true,
      data: {
        timeline: formattedTimeline,
        viewType,
        dateLabel,
        totalRevenue: timeline.reduce((sum, item) => sum + item.revenue, 0),
        totalOrders: timeline.reduce((sum, item) => sum + item.orders, 0)
      }
    });
  });
  
  
  // ==================== ORDER ANALYTICS ====================
  
  /**
   * GET /api/v1/analytics/orders
   * Get order analytics
   */
  static getOrderMetrics = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    const metrics = await this.calculateOrderMetrics(start, end);
    
    res.status(200).json({
      success: true,
      data: metrics
    });
  });
  
  static calculateOrderMetrics = async (startDate, endDate) => {
    try {
      // 1. Total Orders
      const totalOrders = await Order.countDocuments();
      
      // 2. Orders in date range
      const rangeOrders = await Order.countDocuments({
        order_datetime: { $gte: startDate, $lte: endDate }
      });
      
      // 3. Orders Today
      const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
      const ordersToday = await Order.countDocuments({
        order_datetime: { $gte: todayStart }
      });
      
      // 4. Orders This Week
      const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const ordersThisWeek = await Order.countDocuments({
        order_datetime: { $gte: weekStart }
      });
      
      // 5. Orders This Month
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const ordersThisMonth = await Order.countDocuments({
        order_datetime: { $gte: monthStart }
      });
      
      // 6. Orders by Status (from order_info collection)
      const ordersByStatus = await OrderInfo.aggregate([
        {
          $group: {
            _id: '$of_state',
            count: { $sum: 1 }
          }
        }
      ]);
      
      const statusMap = {
        PENDING: 0,
        CONFIRMED: 0,
        SHIPPING: 0,
        DELIVERED: 0,
        CANCELLED: 0
      };
      
      ordersByStatus.forEach(item => {
        if (statusMap.hasOwnProperty(item._id)) {
          statusMap[item._id] = item.count;
        }
      });
      
      // 7. Order Timeline (last 30 days)
      const timelineStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const ordersTimeline = await Order.aggregate([
        {
          $match: {
            order_datetime: { $gte: timelineStart }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$order_datetime' }
            },
            orders: { $sum: 1 },
            revenue: { $sum: '$order_total' }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);
      
      // 8. Top Selling Products
      const topProducts = await ProductOrder.aggregate([
        {
          $group: {
            _id: '$pd_id',
            totalQuantity: { $sum: '$po_quantity' },
            totalRevenue: { $sum: { $multiply: ['$po_quantity', '$po_price'] } }
          }
        },
        {
          $lookup: {
            from: 'product',
            localField: '_id',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $unwind: '$product'
        },
        {
          $lookup: {
            from: 'brand',
            localField: 'product.br_id',
            foreignField: '_id',
            as: 'brand'
          }
        },
        {
          $unwind: { path: '$brand', preserveNullAndEmptyArrays: true }
        },
        {
          $project: {
            product_id: '$product.pd_id',
            product_name: '$product.pd_name',
            brand_name: '$brand.br_name',
            quantity: '$totalQuantity',
            revenue: '$totalRevenue',
            stock: '$product.pd_quantity'
          }
        },
        {
          $sort: { quantity: -1 }
        },
        {
          $limit: 10
        }
      ]);
      
      // Calculate rates
      const totalOrdersCount = statusMap.PENDING + statusMap.CONFIRMED + statusMap.SHIPPING + statusMap.DELIVERED + statusMap.CANCELLED;
      const completionRate = totalOrdersCount > 0 ? (statusMap.DELIVERED / totalOrdersCount * 100) : 0;
      const cancellationRate = totalOrdersCount > 0 ? (statusMap.CANCELLED / totalOrdersCount * 100) : 0;
      
      return {
        total: totalOrders,
        today: ordersToday,
        thisWeek: ordersThisWeek,
        thisMonth: ordersThisMonth,
        inRange: rangeOrders,
        byStatus: statusMap,
        completionRate: parseFloat(completionRate.toFixed(2)),
        cancellationRate: parseFloat(cancellationRate.toFixed(2)),
        growth: {
          daily: 5.2, // Mock
          weekly: 8.3, // Mock
          monthly: 12.1 // Mock
        },
        timeline: ordersTimeline.map(item => ({
          date: item._id,
          orders: item.orders,
          revenue: item.revenue
        })),
        topProducts: topProducts
      };
    } catch (error) {
      console.error('❌ Error calculating order metrics:', error);
      throw error;
    }
  };
  
  
  // ==================== CUSTOMER ANALYTICS ====================
  
  /**
   * GET /api/v1/analytics/customers
   * Get customer analytics
   */
  static getCustomerMetrics = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    const metrics = await this.calculateCustomerMetrics(start, end);
    
    res.status(200).json({
      success: true,
      data: metrics
    });
  });
  
  static calculateCustomerMetrics = async (startDate, endDate) => {
    try {
      // 1. Total Customers
      const totalCustomers = await Customer.countDocuments();
      
      // 2. Customers by Ranking
      const customersByRanking = await CustomerRanking.aggregate([
        {
          $lookup: {
            from: 'ranking',
            localField: 'rank_id',
            foreignField: '_id',
            as: 'rank'
          }
        },
        {
          $unwind: { path: '$rank', preserveNullAndEmptyArrays: true }
        },
        {
          $group: {
            _id: '$rank.rank_id',
            name: { $first: '$rank.rank_name' },
            count: { $sum: 1 }
          }
        }
      ]);
      
      const rankingMap = {
        BRONZE: { name: 'Bronze', count: 0 },
        SILVER: { name: 'Silver', count: 0 },
        GOLD: { name: 'Gold', count: 0 },
        PLATINUM: { name: 'Platinum', count: 0 }
      };
      
      customersByRanking.forEach(item => {
        if (rankingMap[item._id]) {
          rankingMap[item._id].count = item.count;
        }
      });
      
      // 3. Active Customers (with orders in last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const activeCustomersResult = await Order.aggregate([
        {
          $match: {
            order_datetime: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: '$customer_id'
          }
        },
        {
          $count: 'activeCustomers'
        }
      ]);
      const activeCustomers = activeCustomersResult[0]?.activeCustomers || 0;
      
      // 4. Top Customers by Revenue
      const topCustomers = await Order.aggregate([
        {
          $group: {
            _id: '$customer_id',
            totalSpent: { $sum: '$order_total' },
            orderCount: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'customer',
            localField: '_id',
            foreignField: '_id',
            as: 'customer'
          }
        },
        {
          $unwind: '$customer'
        },
        {
          $lookup: {
            from: 'customer_ranking',
            localField: 'customer._id',
            foreignField: 'customer_id',
            as: 'ranking'
          }
        },
        {
          $unwind: { path: '$ranking', preserveNullAndEmptyArrays: true }
        },
        {
          $lookup: {
            from: 'ranking',
            localField: 'ranking.rank_id',
            foreignField: '_id',
            as: 'rank'
          }
        },
        {
          $unwind: { path: '$rank', preserveNullAndEmptyArrays: true }
        },
        {
          $project: {
            customer_name: '$customer.name',
            customer_email: '$customer.email',
            totalSpent: 1,
            orderCount: 1,
            ranking: '$rank.rank_name'
          }
        },
        {
          $sort: { totalSpent: -1 }
        },
        {
          $limit: 10
        }
      ]);
      
      // 5. Average orders per customer
      const avgOrdersPerCustomer = totalCustomers > 0 ? (await Order.countDocuments()) / totalCustomers : 0;
      
      // 6. Repeat customers (customers with > 1 order)
      const repeatCustomersResult = await Order.aggregate([
        {
          $group: {
            _id: '$customer_id',
            orderCount: { $sum: 1 }
          }
        },
        {
          $match: {
            orderCount: { $gt: 1 }
          }
        },
        {
          $count: 'repeatCustomers'
        }
      ]);
      const repeatCustomers = repeatCustomersResult[0]?.repeatCustomers || 0;
      const repeatCustomerRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers * 100) : 0;
      
      return {
        total: totalCustomers,
        active: activeCustomers,
        byRanking: rankingMap,
        topCustomers: topCustomers,
        averageOrdersPerCustomer: parseFloat(avgOrdersPerCustomer.toFixed(2)),
        repeatCustomerRate: parseFloat(repeatCustomerRate.toFixed(2)),
        growth: {
          daily: 3.5, // Mock
          weekly: 7.8, // Mock
          monthly: 15.2 // Mock
        }
      };
    } catch (error) {
      console.error('❌ Error calculating customer metrics:', error);
      throw error;
    }
  };
  
  
  // ==================== PRODUCT ANALYTICS ====================
  
  /**
   * GET /api/v1/analytics/products
   * Get product analytics
   */
  static getProductMetrics = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    const metrics = await this.calculateProductMetrics(start, end);
    
    res.status(200).json({
      success: true,
      data: metrics
    });
  });
  
  static calculateProductMetrics = async (startDate, endDate) => {
    try {
      // 1. Product counts
      const totalProducts = await Product.countDocuments();
      const activeProducts = await Product.countDocuments({ is_available: true });
      const outOfStock = await Product.countDocuments({ pd_quantity: 0 });
      const lowStock = await Product.countDocuments({ 
        pd_quantity: { $gt: 0, $lt: 10 } 
      });
      
      // 2. Products by Category
      const productsByCategory = await Product.aggregate([
        {
          $lookup: {
            from: 'category',
            localField: 'category_id',
            foreignField: '_id',
            as: 'category'
          }
        },
        {
          $unwind: { path: '$category', preserveNullAndEmptyArrays: true }
        },
        {
          $group: {
            _id: '$category.cg_name',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);
      
      // 3. Products by Brand
      const productsByBrand = await Product.aggregate([
        {
          $lookup: {
            from: 'brand',
            localField: 'br_id',
            foreignField: '_id',
            as: 'brand'
          }
        },
        {
          $unwind: { path: '$brand', preserveNullAndEmptyArrays: true }
        },
        {
          $group: {
            _id: '$brand.br_name',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);
      
      // 4. Average Rating
      const ratingResult = await ProductReview.aggregate([
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
            totalReviews: { $sum: 1 }
          }
        }
      ]);
      const averageRating = ratingResult[0]?.avgRating || 0;
      const totalReviews = ratingResult[0]?.totalReviews || 0;
      
      // 5. Top Performing Products (with reviews)
      const topProducts = await ProductOrder.aggregate([
        {
          $group: {
            _id: '$pd_id',
            totalSales: { $sum: '$po_quantity' },
            totalRevenue: { $sum: { $multiply: ['$po_quantity', '$po_price'] } }
          }
        },
        {
          $lookup: {
            from: 'product',
            localField: '_id',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $unwind: '$product'
        },
        {
          $lookup: {
            from: 'product_review',
            localField: '_id',
            foreignField: 'pd_id',
            as: 'reviews'
          }
        },
        {
          $project: {
            product_id: '$product.pd_id',
            product_name: '$product.pd_name',
            sales: '$totalSales',
            revenue: '$totalRevenue',
            rating: { $ifNull: [{ $avg: '$reviews.rating' }, 0] },
            reviewCount: { $size: '$reviews' }
          }
        },
        {
          $sort: { sales: -1 }
        },
        {
          $limit: 10
        }
      ]);
      
      // 6. Low Performing Products
      const lowPerformingProducts = await Product.aggregate([
        {
          $lookup: {
            from: 'product_order',
            localField: '_id',
            foreignField: 'pd_id',
            as: 'orders'
          }
        },
        {
          $project: {
            pd_id: 1,
            pd_name: 1,
            pd_quantity: 1,
            sales: { $size: '$orders' },
            created_at: 1
          }
        },
        {
          $match: {
            sales: { $lte: 2 }, // Low sales threshold
            pd_quantity: { $gt: 0 } // Still in stock
          }
        },
        {
          $sort: { sales: 1 }
        },
        {
          $limit: 10
        }
      ]);
      
      return {
        total: totalProducts,
        active: activeProducts,
        outOfStock: outOfStock,
        lowStock: lowStock,
        byCategory: productsByCategory.map(item => ({
          category: item._id || 'Uncategorized',
          count: item.count
        })),
        byBrand: productsByBrand.map(item => ({
          brand: item._id || 'Unknown',
          count: item.count
        })),
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalReviews: totalReviews,
        topPerforming: topProducts,
        lowPerforming: lowPerformingProducts
      };
    } catch (error) {
      console.error('❌ Error calculating product metrics:', error);
      throw error;
    }
  };
  
  
  // ==================== VOUCHER ANALYTICS ====================
  
  /**
   * GET /api/v1/analytics/vouchers
   * Get voucher analytics
   */
  static getVoucherMetrics = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    const metrics = await this.calculateVoucherMetrics(start, end);
    
    res.status(200).json({
      success: true,
      data: metrics
    });
  });
  
  static calculateVoucherMetrics = async (startDate, endDate) => {
    try {
      // 1. Total & Active Vouchers
      const totalVouchers = await Voucher.countDocuments();
      const activeVouchers = await Voucher.countDocuments({
        is_active: true,
        end_date: { $gte: new Date() }
      });
      const expiredVouchers = await Voucher.countDocuments({
        end_date: { $lt: new Date() }
      });
      
      // 2. Voucher Usage Statistics
      const voucherUsageStats = await VoucherUsage.aggregate([
        {
          $group: {
            _id: null,
            totalUsage: { $sum: 1 },
            totalDiscount: { $sum: '$discount_applied' }
          }
        }
      ]);
      
      const totalUsage = voucherUsageStats[0]?.totalUsage || 0;
      const totalDiscount = voucherUsageStats[0]?.totalDiscount || 0;
      
      // 3. Top Vouchers by Usage
      const topVouchers = await VoucherUsage.aggregate([
        {
          $group: {
            _id: '$voucher_id',
            usage_count: { $sum: 1 },
            total_discount: { $sum: '$discount_applied' }
          }
        },
        {
          $lookup: {
            from: 'voucher',
            localField: '_id',
            foreignField: '_id',
            as: 'voucher'
          }
        },
        {
          $unwind: '$voucher'
        },
        {
          $project: {
            voucher_code: '$voucher.voucher_code',
            voucher_name: '$voucher.voucher_name',
            usage_count: 1,
            total_discount: 1
          }
        },
        {
          $sort: { usage_count: -1 }
        },
        {
          $limit: 10
        }
      ]);
      
      // 4. Voucher ROI (Revenue with voucher / Total discount)
      const voucherOrders = await VoucherUsage.aggregate([
        {
          $lookup: {
            from: 'order',
            localField: 'order_id',
            foreignField: '_id',
            as: 'order'
          }
        },
        {
          $unwind: '$order'
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$order.order_total' },
            totalDiscount: { $sum: '$discount_applied' }
          }
        }
      ]);
      
      const voucherROI = voucherOrders[0] && voucherOrders[0].totalDiscount > 0 ? 
        voucherOrders[0].totalRevenue / voucherOrders[0].totalDiscount : 0;
      
      const avgDiscountPerOrder = totalUsage > 0 ? totalDiscount / totalUsage : 0;
      
      return {
        total: totalVouchers,
        active: activeVouchers,
        expired: expiredVouchers,
        totalUsage: totalUsage,
        totalDiscount: totalDiscount,
        averageDiscountPerOrder: parseFloat(avgDiscountPerOrder.toFixed(2)),
        voucherROI: parseFloat(voucherROI.toFixed(2)),
        topVouchers: topVouchers
      };
    } catch (error) {
      console.error('❌ Error calculating voucher metrics:', error);
      throw error;
    }
  };
}

module.exports = AnalyticsController;
