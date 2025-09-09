// config/database.js
// Database configuration 

const mongoose = require('mongoose');

// Connection string 
const MONGODB_URI = 'mongodb+srv://chienvn102:chienvn102@sanshiliu.xdy1ogg.mongodb.net/?retryWrites=true&w=majority&appName=sanshiliu';
const DATABASE_NAME = 'ecommerce_system';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      dbName: DATABASE_NAME
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database: ${DATABASE_NAME}`);
    

    
    return conn;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

// Tạo indexes 
const createIndexes = async () => {
  try {
    
    await mongoose.connection.collection('user_management').createIndex({ "id": 1 }, { unique: true });
    await mongoose.connection.collection('role').createIndex({ "role_id": 1 }, { unique: true });
    await mongoose.connection.collection('user_customer').createIndex({ "username": 1 }, { unique: true });
    await mongoose.connection.collection('customer').createIndex({ "customer_id": 1 }, { unique: true });
    await mongoose.connection.collection('customer').createIndex({ "email": 1 }, { unique: true });
    await mongoose.connection.collection('voucher').createIndex({ "voucher_id": 1 }, { unique: true });
    await mongoose.connection.collection('voucher').createIndex({ "voucher_code": 1 }, { unique: true });
    await mongoose.connection.collection('product').createIndex({ "pd_id": 1 }, { unique: true });
    await mongoose.connection.collection('product').createIndex({ "sku": 1 }, { unique: true });
    await mongoose.connection.collection('product_type').createIndex({ "pdt_id": 1 }, { unique: true });
    await mongoose.connection.collection('brand').createIndex({ "br_id": 1 }, { unique: true });
    await mongoose.connection.collection('category').createIndex({ "cg_id": 1 }, { unique: true });
    
  } catch (error) {
    console.error('Error creating indexes:', error.message);
  }
};

module.exports = {
  connectDB,
  createIndexes
};
