const mongoose = require('mongoose');

/**
 * Database Configuration and Connection
 */

// MongoDB connection string from environment
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://chienvn102:chienvn102@sanshiliu.xdy1ogg.mongodb.net/?retryWrites=true&w=majority&appName=sanshiliu';
const DATABASE_NAME = process.env.DATABASE_NAME || 'ecommerce_system';

// MongoDB connection options
const mongoOptions = {
  dbName: DATABASE_NAME,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log(`📊 Database: ${DATABASE_NAME}`);
    
    await mongoose.connect(MONGODB_URI, mongoOptions);
    
    console.log('✅ MongoDB connected successfully');
    console.log(`📍 Database: ${mongoose.connection.db.databaseName}`);
    console.log(`🌐 Host: ${mongoose.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔴 MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

/**
 * Create database indexes for performance
 */
const createIndexes = async () => {
  try {
    console.log('🔄 Creating database indexes...');
    
    if (!mongoose.connection || !mongoose.connection.db) {
      console.log('⚠️ Database connection not ready, skipping index creation');
      return;
    }
    
    const collections = mongoose.connection.collections;
    
    if (!collections) {
      console.log('⚠️ No collections found, skipping index creation');
      return;
    }
    
    for (const key in collections) {
      try {
        await collections[key].createIndexes();
      } catch (err) {
        console.log(`⚠️ Index creation skipped for ${key}:`, err.message);
      }
    }
    
    console.log('✅ Database indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error.message);
  }
};

/**
 * Get database statistics
 */
const getDBStats = async () => {
  try {
    const stats = await mongoose.connection.db.stats();
    return {
      database: stats.db,
      collections: stats.collections,
      dataSize: stats.dataSize,
      indexSize: stats.indexSize,
      storageSize: stats.storageSize
    };
  } catch (error) {
    console.error('Error getting DB stats:', error);
    return null;
  }
};

module.exports = {
  connectDB,
  createIndexes,
  getDBStats,
  MONGODB_URI,
  DATABASE_NAME
};
