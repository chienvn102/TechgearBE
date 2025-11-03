const cron = require('node-cron');
const OrderCancellationService = require('../services/OrderCancellationService');

/**
 * Scheduled Job to check and auto-cancel expired PayOS orders
 * Runs every 2 minutes
 */
class PaymentExpirationJob {
  
  static isRunning = false;
  static cronJob = null;

  /**
   * Start the scheduled job
   */
  static start() {
    if (this.cronJob) {
      console.log('⚠️ Payment expiration job is already running');
      return;
    }

    // Run every 2 minutes: '*/2 * * * *'
    // For testing, you can use: '*/1 * * * *' (every minute)
    this.cronJob = cron.schedule('*/2 * * * *', async () => {
      if (this.isRunning) {
        console.log('⏭️ Previous job still running, skipping...');
        return;
      }

      try {
        this.isRunning = true;
        console.log('🕐 [PaymentExpirationJob] Starting check at:', new Date().toISOString());
        
        const result = await OrderCancellationService.checkAndCancelExpiredOrders();
        
        if (result.cancelledCount > 0) {
          console.log(`✅ [PaymentExpirationJob] Cancelled ${result.cancelledCount} expired orders`);
        } else {
          console.log('✅ [PaymentExpirationJob] No expired orders found');
        }
      } catch (error) {
        console.error('❌ [PaymentExpirationJob] Error:', error);
      } finally {
        this.isRunning = false;
      }
    });

    console.log('✅ Payment expiration job started (runs every 2 minutes)');
  }

  /**
   * Stop the scheduled job
   */
  static stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('🛑 Payment expiration job stopped');
    }
  }

  /**
   * Manual trigger for testing
   */
  static async trigger() {
    console.log('🔄 Manually triggering payment expiration check...');
    try {
      const result = await OrderCancellationService.checkAndCancelExpiredOrders();
      console.log('✅ Manual trigger completed:', result);
      return result;
    } catch (error) {
      console.error('❌ Manual trigger error:', error);
      throw error;
    }
  }
}

module.exports = PaymentExpirationJob;
