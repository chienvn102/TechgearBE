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
    await mongoose.connect(MONGODB_URI, mongoOptions);
    
    console.log('✅ Database connected');
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      // Silent disconnect - no log needed
    });

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      // Silent shutdown - no log needed
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
    if (!mongoose.connection || !mongoose.connection.db) {
      return;
    }
    
    // Use Mongoose models instead of native collections
    // Mongoose automatically creates indexes from schema definitions
    const models = mongoose.models;
    
    if (!models || Object.keys(models).length === 0) {
      return;
    }
    
    let successCount = 0;
    
    for (const modelName in models) {
      try {
        const model = models[modelName];
        // ensureIndexes creates all indexes defined in the schema
        await model.ensureIndexes();
        successCount++;
      } catch (err) {
        // Silently skip - indexes might already exist or model might not have indexes
      }
    }
    
    // Silent success - no log needed
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
