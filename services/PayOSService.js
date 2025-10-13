const { PayOS } = require('@payos/node');
const crypto = require('crypto');

/**
 * PayOS Service - Handle PayOS Payment Integration
 * Documentation: https://payos.vn/docs/
 * SDK Version: @payos/node v2.0.3
 */
class PayOSService {
  constructor() {
    // Initialize PayOS with credentials from environment
    this.clientId = process.env.PAYOS_CLIENT_ID;
    this.apiKey = process.env.PAYOS_API_KEY;
    this.checksumKey = process.env.PAYOS_CHECKSUM_KEY;

    if (!this.clientId || !this.apiKey || !this.checksumKey) {
      console.error('❌ PayOS credentials missing in .env file');
      throw new Error('PayOS credentials are required');
    }

    try {
      // Initialize PayOS client (v2.0.3 requires destructuring)
      this.payOS = new PayOS(this.clientId, this.apiKey, this.checksumKey);
      // Silent initialization - no logs needed
    } catch (error) {
      console.error('❌ Failed to initialize PayOS:', error.message);
      throw error;
    }
  }

  /**
   * Generate unique order code (max 9 digits for PayOS)
   * Format: Timestamp-based to ensure uniqueness
   */
  generateOrderCode() {
    const timestamp = Date.now();
    // Take last 9 digits to fit PayOS requirement
    const orderCode = parseInt(timestamp.toString().slice(-9));
    return orderCode;
  }

  /**
   * Create Payment Link
   * @param {Object} paymentData - Payment information
   * @returns {Promise<Object>} Payment link response
   */
  async createPaymentLink(paymentData) {
    try {
      const {
        orderCode,
        amount,
        description,
        customerName,
        customerEmail,
        customerPhone,
        returnUrl,
        cancelUrl
      } = paymentData;

      // Validate amount (PayOS limits: 1,000 - 50,000,000 VND)
      if (amount < 1000 || amount > 50000000) {
        throw new Error('Amount must be between 1,000 and 50,000,000 VND');
      }

      // Prepare payment data for PayOS v2.0.3 API
      // Note: description max 25 characters (PayOS limitation)
      let finalDescription = description || `DH ${orderCode}`;
      if (finalDescription.length > 25) {
        finalDescription = finalDescription.substring(0, 25);
      }

      const paymentRequest = {
        orderCode: orderCode,
        amount: amount,
        description: finalDescription,
        returnUrl: returnUrl || process.env.PAYOS_RETURN_URL || 'http://localhost:3000/customer/payment/success',
        cancelUrl: cancelUrl || process.env.PAYOS_CANCEL_URL || 'http://localhost:3000/customer/payment/cancel',
        // Optional buyer info
        ...(customerName && { buyerName: customerName }),
        ...(customerEmail && { buyerEmail: customerEmail }),
        ...(customerPhone && { buyerPhone: customerPhone })
      };

      console.log('📤 Creating PayOS payment link:', {
        orderCode,
        amount,
        description: description?.substring(0, 50)
      });

      // Call PayOS API v2.0.3 - Use paymentRequests.create()
      const response = await this.payOS.paymentRequests.create(paymentRequest);

      console.log('✅ PayOS payment link created:', {
        orderCode,
        paymentLinkId: response.paymentLinkId,
        checkoutUrl: response.checkoutUrl
      });

      return {
        success: true,
        data: {
          orderCode: response.orderCode,
          paymentLinkId: response.paymentLinkId,
          checkoutUrl: response.checkoutUrl,
          qrCode: response.qrCode,
          amount: response.amount,
          currency: response.currency,
          status: response.status
        }
      };
    } catch (error) {
      console.error('❌ PayOS create payment error:', error.message);
      
      return {
        success: false,
        error: {
          message: error.message || 'Failed to create payment link',
          code: error.code || 'PAYMENT_CREATION_FAILED'
        }
      };
    }
  }

  /**
   * Verify Payment Status
   * @param {Number} orderCode - PayOS order code
   * @returns {Promise<Object>} Payment information
   */
  async verifyPayment(orderCode) {
    try {
      console.log('🔍 Verifying payment for order code:', orderCode);

      // Get payment link info from PayOS v2.0.3 API
      const paymentInfo = await this.payOS.paymentRequests.get(orderCode);

      console.log('✅ Payment info retrieved:', {
        orderCode,
        status: paymentInfo.status,
        amount: paymentInfo.amount
      });

      return {
        success: true,
        data: {
          orderCode: paymentInfo.orderCode,
          amount: paymentInfo.amount,
          amountPaid: paymentInfo.amountPaid,
          amountRemaining: paymentInfo.amountRemaining,
          status: paymentInfo.status, // PENDING, PROCESSING, PAID, CANCELLED
          description: paymentInfo.description,
          transactions: paymentInfo.transactions || [],
          createdAt: paymentInfo.createdAt,
          cancellationReason: paymentInfo.cancellationReason
        }
      };
    } catch (error) {
      console.error('❌ PayOS verify payment error:', error.message);
      
      return {
        success: false,
        error: {
          message: error.message || 'Failed to verify payment',
          code: error.code || 'PAYMENT_VERIFICATION_FAILED'
        }
      };
    }
  }

  /**
   * Cancel Payment Link
   * @param {Number} orderCode - PayOS order code
   * @param {String} reason - Cancellation reason
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelPayment(orderCode, reason = 'Customer cancelled') {
    try {
      console.log('🚫 Cancelling payment for order code:', orderCode);

      // Cancel payment using PayOS v2.0.3 API
      const result = await this.payOS.paymentRequests.cancel(orderCode, reason);

      console.log('✅ Payment cancelled:', {
        orderCode,
        cancellationReason: reason
      });

      return {
        success: true,
        data: {
          orderCode: result.orderCode,
          status: result.status,
          cancellationReason: result.cancellationReason
        }
      };
    } catch (error) {
      console.error('❌ PayOS cancel payment error:', error.message);
      
      return {
        success: false,
        error: {
          message: error.message || 'Failed to cancel payment',
          code: error.code || 'PAYMENT_CANCELLATION_FAILED'
        }
      };
    }
  }

  /**
   * Verify Webhook Signature
   * @param {Object} webhookData - Webhook payload
   * @param {String} signature - Signature from webhook header
   * @returns {Boolean} Is signature valid
   */
  verifyWebhookSignature(webhookData, signature) {
    try {
      // PayOS signature verification using checksum key
      const isValid = this.payOS.verifyPaymentWebhookData(webhookData, signature);
      
      console.log('🔐 Webhook signature verification:', isValid ? '✅ Valid' : '❌ Invalid');
      
      return isValid;
    } catch (error) {
      console.error('❌ Webhook signature verification error:', error.message);
      return false;
    }
  }

  /**
   * Process Webhook Data
   * @param {Object} webhookData - Webhook payload from PayOS
   * @returns {Object} Processed webhook data
   */
  processWebhookData(webhookData) {
    try {
      const { code, desc, data, signature } = webhookData;

      // Extract important information
      const processedData = {
        code: code,
        description: desc,
        success: code === '00', // '00' means success
        orderCode: data?.orderCode,
        amount: data?.amount,
        paymentReference: data?.reference,
        transactionDateTime: data?.transactionDateTime,
        accountNumber: data?.accountNumber,
        counterAccountBankId: data?.counterAccountBankId,
        counterAccountBankName: data?.counterAccountBankName,
        counterAccountName: data?.counterAccountName,
        counterAccountNumber: data?.counterAccountNumber,
        virtualAccountName: data?.virtualAccountName,
        virtualAccountNumber: data?.virtualAccountNumber,
        currency: data?.currency || 'VND',
        paymentLinkId: data?.paymentLinkId,
        signature: signature
      };

      console.log('📦 Webhook data processed:', {
        orderCode: processedData.orderCode,
        success: processedData.success,
        amount: processedData.amount
      });

      return processedData;
    } catch (error) {
      console.error('❌ Process webhook data error:', error.message);
      throw error;
    }
  }

  /**
   * Get Payment Status Label
   * @param {String} status - PayOS status
   * @returns {String} Vietnamese status label
   */
  getPaymentStatusLabel(status) {
    const statusMap = {
      'PENDING': 'Chờ thanh toán',
      'PROCESSING': 'Đang xử lý',
      'PAID': 'Đã thanh toán',
      'CANCELLED': 'Đã hủy'
    };

    return statusMap[status] || status;
  }

  /**
   * Calculate Transaction Fee (if needed)
   * @param {Number} amount - Transaction amount
   * @returns {Number} Fee amount
   */
  calculateTransactionFee(amount) {
    // PayOS typically doesn't charge customer fee
    // But you can add your own fee structure here
    return 0;
  }

  /**
   * Validate Payment Data
   * @param {Object} paymentData - Payment data to validate
   * @returns {Object} Validation result
   */
  validatePaymentData(paymentData) {
    const errors = [];

    if (!paymentData.orderCode) {
      errors.push('Order code is required');
    }

    if (!paymentData.amount || paymentData.amount < 1000) {
      errors.push('Amount must be at least 1,000 VND');
    }

    if (paymentData.amount > 50000000) {
      errors.push('Amount must not exceed 50,000,000 VND');
    }

    if (!paymentData.description) {
      errors.push('Description is required');
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
}

// Export singleton instance
module.exports = new PayOSService();
