const Transaction = require('../models/Transaction');
const Order = require('../models/Order');
const OrderInfo = require('../models/OrderInfo');
const Product = require('../models/Product');
const ProductOrder = require('../models/ProductOrder');
const PaymentStatus = require('../models/PaymentStatus');
const Voucher = require('../models/Voucher');
const VoucherUsage = require('../models/VoucherUsage');
const NotificationControllerV2 = require('../controllers/NotificationControllerV2');

/**
 * Service to handle automatic order cancellation for expired PayOS payments
 */
class OrderCancellationService {
  
  /**
   * Cancel an order and restore product stock
   * @param {ObjectId} orderId - Order ID to cancel
   * @param {String} reason - Cancellation reason
   * @param {Boolean} notifyCustomer - Whether to send notification
   * @returns {Object} Result of cancellation
   */
  static async cancelOrder(orderId, reason = 'Payment timeout', notifyCustomer = true) {
    try {
      console.log(`🚫 Starting order cancellation: ${orderId}, Reason: ${reason}`);

      // Find order with populated data
      const order = await Order.findById(orderId)
        .populate('customer_id')
        .populate('po_id')
        .populate('voucher_id');

      if (!order) {
        throw new Error('Order not found');
      }

      // Check if order is already cancelled
      const orderInfo = await OrderInfo.findOne({ od_id: orderId });
      if (orderInfo && orderInfo.of_state === 'CANCELLED') {
        console.log(`⚠️ Order ${order.od_id} is already cancelled`);
        return {
          success: true,
          message: 'Order already cancelled',
          alreadyCancelled: true
        };
      }

      // 1. Restore product stock for all items
      if (order.po_id && Array.isArray(order.po_id)) {
        for (const productOrder of order.po_id) {
          if (productOrder.pd_id) {
            const product = await Product.findById(productOrder.pd_id);
            if (product) {
              product.stock_quantity += productOrder.po_quantity;
              product.pd_quantity = product.stock_quantity;
              await product.save();
              console.log(`📦 Restored stock for ${product.pd_name}: +${productOrder.po_quantity}`);
            }
          }
        }
      }

      // 2. Restore voucher usage if applicable
      if (order.voucher_id) {
        const voucher = await Voucher.findById(order.voucher_id);
        if (voucher && voucher.current_uses > 0) {
          voucher.current_uses -= 1;
          await voucher.save();
          console.log(`🎫 Restored voucher usage: ${voucher.voucher_code}`);
        }

        // Delete voucher usage record
        await VoucherUsage.deleteOne({
          order_id: orderId
        });
      }

      // 3. Update order payment status to CANCELLED
      const cancelledStatus = await PaymentStatus.findOne({ 
        ps_name: { $in: ['CANCELLED', 'CANCELED'] }
      });
      
      if (cancelledStatus) {
        order.payment_status_id = cancelledStatus._id;
        await order.save();
      }

      // 4. Update order info status
      if (orderInfo) {
        orderInfo.of_state = 'CANCELLED';
        await orderInfo.save();
      } else {
        // Create order info if not exists
        const newOrderInfo = new OrderInfo({
          oi_id: `OI_${Date.now()}`,
          od_id: order._id,
          of_state: 'CANCELLED'
        });
        await newOrderInfo.save();
      }

      // 5. Send notification to customer
      if (notifyCustomer && order.customer_id) {
        try {
          await NotificationControllerV2.createOrderStatusNotification(
            order._id,
            order.customer_id._id,
            'CANCELLED',
            {
              od_id: order.od_id,
              reason: reason,
              order_total: order.order_total
            }
          );
          console.log(`📬 Cancellation notification sent for order: ${order.od_id}`);
        } catch (notifError) {
          console.error('⚠️ Failed to send cancellation notification:', notifError);
        }
      }

      console.log(`✅ Order cancelled successfully: ${order.od_id}`);

      return {
        success: true,
        message: 'Order cancelled successfully',
        order: {
          od_id: order.od_id,
          order_total: order.order_total,
          cancelled_at: new Date()
        }
      };
    } catch (error) {
      console.error('❌ Error cancelling order:', error);
      throw error;
    }
  }

  /**
   * Check and auto-cancel expired PayOS orders (15 minutes timeout)
   * Should be called by a scheduled job
   */
  static async checkAndCancelExpiredOrders() {
    try {
      console.log('🕐 Checking for expired PayOS orders...');

      // Find PENDING transactions older than 15 minutes
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      
      const expiredTransactions = await Transaction.find({
        status: 'PENDING',
        created_at: { $lt: fifteenMinutesAgo }
      }).populate('order_id');

      if (expiredTransactions.length === 0) {
        console.log('✅ No expired orders found');
        return {
          success: true,
          cancelledCount: 0
        };
      }

      console.log(`🔍 Found ${expiredTransactions.length} expired transactions`);

      let cancelledCount = 0;
      const results = [];

      for (const transaction of expiredTransactions) {
        try {
          // Mark transaction as failed
          await transaction.markAsFailed('Payment timeout - 15 minutes expired');
          
          // Cancel the associated order
          if (transaction.order_id) {
            const result = await this.cancelOrder(
              transaction.order_id._id,
              'Hết thời gian thanh toán (15 phút)',
              true
            );
            
            if (result.success && !result.alreadyCancelled) {
              cancelledCount++;
            }
            
            results.push({
              order_id: transaction.order_id.od_id,
              transaction_id: transaction.transaction_id,
              result: result.success ? 'cancelled' : 'failed'
            });
          }
        } catch (error) {
          console.error(`❌ Error processing transaction ${transaction.transaction_id}:`, error);
          results.push({
            transaction_id: transaction.transaction_id,
            result: 'error',
            error: error.message
          });
        }
      }

      console.log(`✅ Auto-cancellation completed: ${cancelledCount} orders cancelled`);

      return {
        success: true,
        cancelledCount,
        results
      };
    } catch (error) {
      console.error('❌ Error in checkAndCancelExpiredOrders:', error);
      throw error;
    }
  }

  /**
   * Manual order cancellation (for customer-initiated cancellation)
   * @param {ObjectId} orderId - Order ID
   * @param {ObjectId} customerId - Customer ID (for verification)
   * @param {String} reason - Cancellation reason
   */
  static async cancelOrderByCustomer(orderId, customerId, reason = 'Khách hàng hủy đơn') {
    try {
      const order = await Order.findById(orderId);

      if (!order) {
        return {
          success: false,
          message: 'Order not found'
        };
      }

      // Verify ownership
      if (order.customer_id.toString() !== customerId.toString()) {
        return {
          success: false,
          message: 'Unauthorized: You can only cancel your own orders'
        };
      }

      // Check if order can be cancelled
      const orderInfo = await OrderInfo.findOne({ od_id: orderId });
      if (orderInfo) {
        const nonCancellableStates = ['DELIVERED', 'CANCELLED'];
        if (nonCancellableStates.includes(orderInfo.of_state)) {
          return {
            success: false,
            message: `Cannot cancel order in ${orderInfo.of_state} state`
          };
        }
      }

      // Cancel the order
      const result = await this.cancelOrder(orderId, reason, true);
      
      return result;
    } catch (error) {
      console.error('❌ Error in cancelOrderByCustomer:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

module.exports = OrderCancellationService;
