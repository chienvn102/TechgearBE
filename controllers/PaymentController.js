const Transaction = require('../models/Transaction');
const Order = require('../models/Order');
const PaymentStatus = require('../models/PaymentStatus');
const PayOSService = require('../services/PayOSService');
const NotificationControllerV2 = require('./NotificationControllerV2');
const auditLogger = require('../utils/auditLogger');

/**
 * Payment Controller - Handle PayOS Payment Operations
 */
class PaymentController {
  /**
   * Create PayOS Payment Link
   * POST /api/v1/payments/payos/create
   */
  async createPayment(req, res) {
    try {
      const { order_id, customer_name, customer_email, customer_phone } = req.body;
      
      // Check if user is customer
      if (req.userType !== 'customer') {
        return res.status(403).json({
          success: false,
          message: 'Only customers can create payments'
        });
      }
      
      const customerId = req.user.customer_id; // From authenticateToken middleware

      // Validate required fields
      if (!order_id) {
        return res.status(400).json({
          success: false,
          message: 'Order ID is required'
        });
      }

      // Find order
      const order = await Order.findOne({ _id: order_id, customer_id: customerId })
        .populate('payment_status_id');

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check if order already paid
      if (order.payment_status_id?.ps_name === 'PAID') {
        return res.status(400).json({
          success: false,
          message: 'Order already paid'
        });
      }

      // Check if payment link already exists for this order
      const existingTransaction = await Transaction.findOne({
        order_id: order_id,
        status: { $in: ['PENDING', 'PROCESSING'] }
      });

      if (existingTransaction) {
        return res.status(400).json({
          success: false,
          message: 'Payment link already exists for this order',
          data: {
            transaction_id: existingTransaction.transaction_id,
            payment_link_url: existingTransaction.payment_link_url,
            qr_code_url: existingTransaction.qr_code_url
          }
        });
      }

      // Generate unique order code for PayOS
      const payosOrderCode = PayOSService.generateOrderCode();

      // Create payment link with SHORT description (max 25 chars)
      const paymentResult = await PayOSService.createPaymentLink({
        orderCode: payosOrderCode,
        amount: order.order_total,
        description: `DH ${order.od_id.substring(3, 20)}`, // Short version: "DH 1759837126396..."
        customerName: customer_name,
        customerEmail: customer_email,
        customerPhone: customer_phone,
        returnUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success?orderCode=${payosOrderCode}`,
        cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/cancel?orderCode=${payosOrderCode}`
      });

      if (!paymentResult.success) {
        return res.status(400).json({
          success: false,
          message: paymentResult.error.message,
          error: paymentResult.error
        });
      }

      // Create transaction record
      const transaction = new Transaction({
        transaction_id: `TXN_${Date.now()}_${payosOrderCode}`,
        order_id: order._id,
        customer_id: customerId,
        payment_method_id: 'PAYOS',
        payos_order_code: payosOrderCode,
        payos_payment_link_id: paymentResult.data.paymentLinkId,
        amount: order.order_total,
        currency: 'VND',
        description: `Thanh toán đơn hàng #${order.od_id}`,
        status: 'PENDING',
        payment_link_url: paymentResult.data.checkoutUrl,
        qr_code_url: paymentResult.data.qrCode
      });

      await transaction.save();

      // Update order with transaction info
      order.payment_transaction_id = transaction.transaction_id;
      order.payos_order_code = payosOrderCode;
      await order.save();

      // Create audit log
      await auditLogger.createAuditLog({
        customer_user_id: req.user._id,
        action: 'CREATE',
        collection_name: 'transaction',
        document_id: transaction._id,
        changes: {
          transaction_id: transaction.transaction_id,
          order_id: order.od_id,
          amount: transaction.amount,
          status: 'PENDING'
        }
      });

      console.log('✅ Payment link created:', {
        orderId: order.od_id,
        transactionId: transaction.transaction_id,
        payosOrderCode: payosOrderCode
      });

      return res.status(201).json({
        success: true,
        message: 'Payment link created successfully',
        data: {
          transaction_id: transaction.transaction_id,
          order_id: order.od_id,
          payos_order_code: payosOrderCode,
          amount: transaction.amount,
          payment_link: paymentResult.data.checkoutUrl,
          qr_code: paymentResult.data.qrCode,
          expires_at: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now
        }
      });
    } catch (error) {
      console.error('❌ Create payment error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create payment link',
        error: error.message
      });
    }
  }

  /**
   * PayOS Webhook Handler
   * POST /api/v1/payments/payos/webhook
   * NO AUTHENTICATION - Signature verification instead
   */
  async handleWebhook(req, res) {
    try {
      const webhookData = req.body;
      const signature = req.headers['x-payos-signature'] || req.body.signature;

      console.log('📨 Received PayOS webhook:', {
        code: webhookData.code,
        orderCode: webhookData.data?.orderCode
      });

      // Verify webhook signature
      const isValidSignature = PayOSService.verifyWebhookSignature(webhookData, signature);

      if (!isValidSignature) {
        console.error('❌ Invalid webhook signature');
        return res.status(401).json({
          success: false,
          message: 'Invalid signature'
        });
      }

      // Process webhook data
      const processedData = PayOSService.processWebhookData(webhookData);

      // Find transaction
      const transaction = await Transaction.findByPayOSOrderCode(processedData.orderCode);

      if (!transaction) {
        console.error('❌ Transaction not found for order code:', processedData.orderCode);
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      // Update webhook info
      transaction.webhook_signature = signature;
      transaction.webhook_received_at = new Date();

      // Handle payment success
      if (processedData.success && processedData.code === '00') {
        // Handle payment success
        await paymentControllerInstance.handlePaymentSuccess(transaction, processedData);
      } else {
        // Handle payment failed
        await this.handlePaymentFailed(transaction, processedData);
      }

      console.log('✅ Webhook processed successfully');

      return res.status(200).json({
        success: true,
        message: 'Webhook processed'
      });
    } catch (error) {
      console.error('❌ Webhook handler error:', error);
      return res.status(500).json({
        success: false,
        message: 'Webhook processing failed',
        error: error.message
      });
    }
  }

  /**
   * Handle Payment Success (from webhook)
   */
  async handlePaymentSuccess(transaction, webhookData) {
    try {
      // Mark transaction as completed
      await transaction.markAsCompleted(webhookData);

      // Update order payment status
      const order = await Order.findById(transaction.order_id);
      if (order) {
        const paidStatus = await PaymentStatus.findOne({ ps_name: 'PAID' });
        if (paidStatus) {
          order.payment_status_id = paidStatus.ps_id;
          await order.save();
        }

        // Send notification to customer
        await NotificationControllerV2.createOrderStatusNotification(
          transaction.customer_id,
          order,
          'PAYMENT_SUCCESS'
        );

        console.log('✅ Payment success handled:', {
          orderId: order.od_id,
          transactionId: transaction.transaction_id
        });
      }

      // Create audit log
      await auditLogger.createAuditLog({
        customer_user_id: transaction.customer_id,
        action: 'UPDATE',
        collection_name: 'transaction',
        document_id: transaction._id,
        changes: {
          status: 'COMPLETED',
          amount: transaction.amount,
          completed_at: transaction.completed_at
        }
      });
    } catch (error) {
      console.error('❌ Handle payment success error:', error);
      throw error;
    }
  }

  /**
   * Handle Payment Failed (from webhook)
   */
  async handlePaymentFailed(transaction, webhookData) {
    try {
      const errorMessage = webhookData.description || 'Payment failed';
      await transaction.markAsFailed(errorMessage);

      // Send notification to customer
      const order = await Order.findById(transaction.order_id);
      if (order) {
        await NotificationControllerV2.createOrderStatusNotification(
          transaction.customer_id,
          order,
          'PAYMENT_FAILED'
        );
      }

      // Create audit log
      await auditLogger.createAuditLog({
        customer_user_id: transaction.customer_id,
        action: 'UPDATE',
        collection_name: 'transaction',
        document_id: transaction._id,
        changes: {
          status: 'FAILED',
          error_message: errorMessage,
          failed_at: transaction.failed_at
        }
      });

      console.log('⚠️ Payment failed handled:', {
        transactionId: transaction.transaction_id,
        reason: errorMessage
      });
    } catch (error) {
      console.error('❌ Handle payment failed error:', error);
      throw error;
    }
  }

  /**
   * Verify Payment Status (Manual check for localhost)
   * GET /api/v1/payments/payos/verify/:orderCode
   */
  async verifyPayment(req, res) {
    try {
      const { orderCode } = req.params;
      
      // Optional authentication - allow both authenticated and unauthenticated requests
      // If authenticated, verify ownership. If not, just return payment info.
      const isAuthenticated = req.user && req.userType === 'customer';
      const customerId = isAuthenticated ? req.user.customer_id : null;

      // Find transaction
      const transaction = await Transaction.findByPayOSOrderCode(parseInt(orderCode));

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      // Verify ownership only if authenticated as customer
      if (isAuthenticated && transaction.customer_id.toString() !== customerId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access'
        });
      }

      // Call PayOS API to verify payment status
      const paymentInfo = await PayOSService.verifyPayment(parseInt(orderCode));

      if (!paymentInfo.success) {
        return res.status(400).json({
          success: false,
          message: paymentInfo.error.message
        });
      }

      // Update transaction if status changed (only if authenticated or admin context)
      if (paymentInfo.data.status === 'PAID' && transaction.status !== 'COMPLETED') {
        // Mark transaction as completed
        await transaction.markAsCompleted({
          code: '00',
          desc: 'Success',
          data: {
            orderCode: parseInt(orderCode),
            amount: paymentInfo.data.amount,
            transactionDateTime: new Date().toISOString()
          }
        });

        // Update order payment status
        const order = await Order.findById(transaction.order_id);
        if (order) {
          const paidStatus = await PaymentStatus.findOne({ ps_name: 'PAID' });
          if (paidStatus) {
            order.payment_status_id = paidStatus._id;
            await order.save();
          }

          // Send notification to customer (only if authenticated)
          if (isAuthenticated) {
            await NotificationControllerV2.createOrderStatusNotification(
              transaction.customer_id,
              order,
              'PAYMENT_SUCCESS'
            );
          }

          console.log('✅ Payment verified and marked as completed:', {
            orderId: order.od_id,
            transactionId: transaction.transaction_id
          });
        }

        // Create audit log (only if authenticated)
        if (isAuthenticated) {
          await auditLogger.createAuditLog({
            customer_user_id: transaction.customer_id,
            action: 'UPDATE',
            collection_name: 'transaction',
            document_id: transaction._id,
            changes: {
              status: 'COMPLETED',
              amount: transaction.amount,
              completed_at: transaction.completed_at
            }
          });
        }
      }

      // Get updated transaction
      const updatedTransaction = await Transaction.findById(transaction._id)
        .populate('order_id');

      return res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        data: {
          transaction_id: updatedTransaction.transaction_id,
          order_id: updatedTransaction.order_id?.od_id,
          status: updatedTransaction.status,
          amount: updatedTransaction.amount,
          payos_status: paymentInfo.data.status,
          completed_at: updatedTransaction.completed_at,
          payment_info: paymentInfo.data
        }
      });
    } catch (error) {
      console.error('❌ Verify payment error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to verify payment',
        error: error.message
      });
    }
  }

  /**
   * Cancel Payment
   * POST /api/v1/payments/payos/cancel/:orderCode
   */
  async cancelPayment(req, res) {
    try {
      const { orderCode } = req.params;
      const { reason } = req.body;
      
      // Check if user is customer
      if (req.userType !== 'customer') {
        return res.status(403).json({
          success: false,
          message: 'Only customers can cancel payments'
        });
      }
      
      const customerId = req.user.customer_id;

      // Find transaction
      const transaction = await Transaction.findByPayOSOrderCode(parseInt(orderCode));

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      // Verify ownership
      if (transaction.customer_id.toString() !== customerId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access'
        });
      }

      // Check if can cancel
      if (transaction.status === 'COMPLETED') {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel completed payment'
        });
      }

      if (transaction.status === 'CANCELLED') {
        return res.status(400).json({
          success: false,
          message: 'Payment already cancelled'
        });
      }

      // Cancel payment on PayOS
      const cancelResult = await PayOSService.cancelPayment(
        parseInt(orderCode),
        reason || 'Customer cancelled payment'
      );

      if (!cancelResult.success) {
        return res.status(400).json({
          success: false,
          message: cancelResult.error.message
        });
      }

      // Update transaction
      await transaction.markAsCancelled(reason || 'Customer cancelled payment');

      // Create audit log
      await auditLogger.createAuditLog({
        customer_user_id: req.user._id,
        action: 'UPDATE',
        collection_name: 'transaction',
        document_id: transaction._id,
        changes: {
          status: 'CANCELLED',
          cancelled_at: transaction.cancelled_at,
          reason: reason
        }
      });

      console.log('🚫 Payment cancelled:', {
        transactionId: transaction.transaction_id,
        orderCode: orderCode
      });

      return res.status(200).json({
        success: true,
        message: 'Payment cancelled successfully',
        data: {
          transaction_id: transaction.transaction_id,
          status: transaction.status,
          cancelled_at: transaction.cancelled_at
        }
      });
    } catch (error) {
      console.error('❌ Cancel payment error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to cancel payment',
        error: error.message
      });
    }
  }

  /**
   * Get Transaction History
   * GET /api/v1/payments/transactions
   */
  async getTransactions(req, res) {
    try {
      // Check if user is customer
      if (req.userType !== 'customer') {
        return res.status(403).json({
          success: false,
          message: 'Only customers can view transactions'
        });
      }
      
      const customerId = req.user.customer_id;
      const { status, limit = 20, page = 1 } = req.query;

      const options = {
        status: status,
        limit: parseInt(limit)
      };

      const transactions = await Transaction.findByCustomerId(customerId, options)
        .populate('order_id', 'od_id order_total')
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit));

      const total = await Transaction.countDocuments({ customer_id: customerId });

      return res.status(200).json({
        success: true,
        data: {
          transactions: transactions,
          pagination: {
            total: total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      console.error('❌ Get transactions error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get transactions',
        error: error.message
      });
    }
  }

  /**
   * Get Transaction Details
   * GET /api/v1/payments/transactions/:transactionId
   */
  async getTransactionDetails(req, res) {
    try {
      const { transactionId } = req.params;
      
      // Check if user is customer
      if (req.userType !== 'customer') {
        return res.status(403).json({
          success: false,
          message: 'Only customers can view transaction details'
        });
      }
      
      const customerId = req.user.customer_id;

      const transaction = await Transaction.findOne({
        transaction_id: transactionId,
        customer_id: customerId
      }).populate('order_id');

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: transaction
      });
    } catch (error) {
      console.error('❌ Get transaction details error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get transaction details',
        error: error.message
      });
    }
  }

  /**
   * Get Unpaid PayOS Orders for Notifications
   * GET /api/v1/payments/unpaid-orders
   */
  async getUnpaidPayOSOrders(req, res) {
    try {
      // Check if user is customer
      if (req.userType !== 'customer') {
        return res.status(403).json({
          success: false,
          message: 'Only customers can view their unpaid orders'
        });
      }
      
      const customerId = req.user.customer_id;

      // Find PayOS payment method
      const PaymentMethod = require('../models/PaymentMethod');
      const payosMethod = await PaymentMethod.findOne({ 
        $or: [
          { pm_name: /PayOS/i },
          { pm_name: /QR/i }
        ]
      });

      if (!payosMethod) {
        return res.status(200).json({
          success: true,
          data: {
            unpaid_orders: []
          }
        });
      }

      // Find unpaid payment status
      const unpaidStatus = await PaymentStatus.findOne({ 
        ps_name: { $in: ['UNPAID', 'PENDING'] }
      });

      if (!unpaidStatus) {
        return res.status(200).json({
          success: true,
          data: {
            unpaid_orders: []
          }
        });
      }

      // Find orders that:
      // 1. Belong to this customer
      // 2. Use PayOS payment method
      // 3. Have unpaid status
      // 4. Have payos_order_code (payment link was created)
      const unpaidOrders = await Order.find({
        customer_id: customerId,
        pm_id: payosMethod._id,
        payment_status_id: unpaidStatus._id,
        payos_order_code: { $exists: true, $ne: null }
      })
      .populate('pm_id', 'pm_name')
      .populate('payment_status_id', 'ps_name')
      .sort({ order_datetime: -1 })
      .limit(20); // Limit to latest 20 unpaid orders

      // For each order, get the latest transaction to check payment link
      const ordersWithPaymentLinks = await Promise.all(
        unpaidOrders.map(async (order) => {
          const transaction = await Transaction.findOne({
            order_id: order._id,
            status: { $in: ['PENDING', 'PROCESSING'] }
          }).sort({ created_at: -1 });

          return {
            _id: order._id,
            od_id: order.od_id,
            order_total: order.order_total,
            order_datetime: order.order_datetime,
            payos_order_code: order.payos_order_code,
            payment_link_url: transaction?.payment_link_url || null,
            qr_code_url: transaction?.qr_code_url || null,
            transaction_id: transaction?.transaction_id || null
          };
        })
      );

      return res.status(200).json({
        success: true,
        data: {
          unpaid_orders: ordersWithPaymentLinks,
          count: ordersWithPaymentLinks.length
        }
      });
    } catch (error) {
      console.error('❌ Get unpaid PayOS orders error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get unpaid orders',
        error: error.message
      });
    }
  }
}

const paymentControllerInstance = new PaymentController();
module.exports = paymentControllerInstance;
