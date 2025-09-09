// utils/idGenerator.js
// ID generation utilities 

class IdGenerator {
  // Generate unique ID cho các collections theo pattern trong README_MongoDB.md
  static generateUserId() {
    return `USER${String(Date.now()).slice(-6)}`;
  }

  static generateCustomerId() {
    return `CUST${String(Date.now()).slice(-6)}`;
  }

  static generateProductId() {
    return `PROD${String(Date.now()).slice(-6)}`;
  }

  static generateOrderId() {
    return `ORD${String(Date.now()).slice(-6)}`;
  }

  static generateVoucherId() {
    return `VOUCHER${String(Date.now()).slice(-6)}`;
  }

  static generateProductOrderId() {
    return `PO${String(Date.now()).slice(-6)}`;
  }

  static generateOrderInfoId() {
    return `OI${String(Date.now()).slice(-6)}`;
  }

  static generateNotificationId() {
    return `NOTI${String(Date.now()).slice(-6)}`;
  }

  static generateBannerId() {
    return `BAN${String(Date.now()).slice(-6)}`;
  }

  static generateReviewId() {
    return `REV${String(Date.now()).slice(-6)}`;
  }

  static generateAuditId() {
    return `AUDIT${String(Date.now()).slice(-6)}`;
  }

  static generatePaymentLogId() {
    return `LOG${String(Date.now()).slice(-6)}`;
  }

  static generateAddressId() {
    return `ADDR${String(Date.now()).slice(-6)}`;
  }

  static generateUsageId() {
    return `USAGE${String(Date.now()).slice(-6)}`;
  }

  static generatePostId() {
    return `POST${String(Date.now()).slice(-6)}`;
  }

  // Generate SKU cho products
  static generateSKU(brandId, categoryId, color) {
    const timestamp = String(Date.now()).slice(-4);
    return `${brandId}_${categoryId}_${color.toUpperCase()}_${timestamp}`;
  }

  // Generate voucher code
  static generateVoucherCode(prefix = 'SAVE') {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = prefix;
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Generate transaction code cho payments
  static generateTransactionCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'TXN';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

module.exports = IdGenerator;
