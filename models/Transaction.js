const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Transaction Model - Payment Transaction Tracking
 * Tracks all payment transactions from PayOS and other payment gateways
 */
const TransactionSchema = new Schema({
  // Transaction ID (unique identifier)
  transaction_id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  // Order reference
  order_id: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },

  // Customer reference
  customer_id: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true
  },

  // Payment method reference
  payment_method_id: {
    type: String,
    ref: 'PaymentMethod',
    required: true
  },

  // PayOS specific fields
  payos_order_code: {
    type: Number,
    unique: true,
    sparse: true // Allow null for non-PayOS transactions
  },

  payos_payment_link_id: {
    type: String,
    sparse: true
  },

  payos_transaction_reference: {
    type: String,
    sparse: true
  },

  // Payment details
  amount: {
    type: Number,
    required: true,
    min: 1000, // Minimum 1,000 VND
    max: 50000000 // Maximum 50,000,000 VND (PayOS limit)
  },

  currency: {
    type: String,
    default: 'VND',
    enum: ['VND']
  },

  description: {
    type: String,
    required: true,
    trim: true
  },

  // Transaction status
  status: {
    type: String,
    required: true,
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED'],
    default: 'PENDING',
    index: true
  },

  // PayOS response code
  payos_code: {
    type: String,
    default: null
  },

  payos_desc: {
    type: String,
    default: null
  },

  // Bank account information (from webhook)
  account_number: {
    type: String,
    default: null
  },

  counter_account_bank_id: {
    type: String,
    default: null
  },

  counter_account_bank_name: {
    type: String,
    default: null
  },

  counter_account_name: {
    type: String,
    default: null
  },

  counter_account_number: {
    type: String,
    default: null
  },

  virtual_account_name: {
    type: String,
    default: null
  },

  virtual_account_number: {
    type: String,
    default: null
  },

  // Transaction timestamps
  transaction_datetime: {
    type: Date,
    default: null
  },

  completed_at: {
    type: Date,
    default: null
  },

  failed_at: {
    type: Date,
    default: null
  },

  cancelled_at: {
    type: Date,
    default: null
  },

  // Payment link details
  payment_link_url: {
    type: String,
    default: null
  },

  qr_code_url: {
    type: String,
    default: null
  },

  // Webhook signature verification
  webhook_signature: {
    type: String,
    default: null
  },

  webhook_received_at: {
    type: Date,
    default: null
  },

  // Error handling
  error_message: {
    type: String,
    default: null
  },

  retry_count: {
    type: Number,
    default: 0,
    min: 0
  },

  // Metadata
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },

  // Timestamps
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  },

  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'transaction',
  timestamps: false // Using custom timestamps
});

// Indexes for performance
TransactionSchema.index({ order_id: 1, status: 1 });
TransactionSchema.index({ customer_id: 1, created_at: -1 });
TransactionSchema.index({ status: 1, created_at: -1 });
// payos_order_code index already defined via unique: true in schema

// Pre-save middleware to update timestamps
TransactionSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Methods
TransactionSchema.methods = {
  /**
   * Mark transaction as completed
   */
  async markAsCompleted(webhookData) {
    this.status = 'COMPLETED';
    this.completed_at = new Date();
    this.payos_code = webhookData.code;
    this.payos_desc = webhookData.desc;
    
    if (webhookData.data) {
      this.transaction_datetime = new Date(webhookData.data.transactionDateTime);
      this.account_number = webhookData.data.accountNumber;
      this.counter_account_bank_id = webhookData.data.counterAccountBankId;
      this.counter_account_bank_name = webhookData.data.counterAccountBankName;
      this.counter_account_name = webhookData.data.counterAccountName;
      this.counter_account_number = webhookData.data.counterAccountNumber;
      this.virtual_account_name = webhookData.data.virtualAccountName;
      this.virtual_account_number = webhookData.data.virtualAccountNumber;
    }
    
    return await this.save();
  },

  /**
   * Mark transaction as failed
   */
  async markAsFailed(errorMessage) {
    this.status = 'FAILED';
    this.failed_at = new Date();
    this.error_message = errorMessage;
    return await this.save();
  },

  /**
   * Mark transaction as cancelled
   */
  async markAsCancelled(reason) {
    this.status = 'CANCELLED';
    this.cancelled_at = new Date();
    this.error_message = reason;
    return await this.save();
  },

  /**
   * Increment retry count
   */
  async incrementRetry() {
    this.retry_count += 1;
    return await this.save();
  }
};

// Statics
TransactionSchema.statics = {
  /**
   * Find transaction by PayOS order code
   */
  async findByPayOSOrderCode(orderCode) {
    return await this.findOne({ payos_order_code: orderCode });
  },

  /**
   * Find transactions by order ID
   */
  async findByOrderId(orderId) {
    return await this.find({ order_id: orderId }).sort({ created_at: -1 });
  },

  /**
   * Find transactions by customer ID
   */
  async findByCustomerId(customerId, options = {}) {
    const query = this.find({ customer_id: customerId });
    
    if (options.status) {
      query.where('status').equals(options.status);
    }
    
    if (options.limit) {
      query.limit(options.limit);
    }
    
    return await query.sort({ created_at: -1 });
  },

  /**
   * Get transaction statistics
   */
  async getStatistics(customerId = null) {
    const match = customerId ? { customer_id: mongoose.Types.ObjectId(customerId) } : {};
    
    return await this.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);
  }
};

const Transaction = mongoose.model('Transaction', TransactionSchema);

module.exports = Transaction;
