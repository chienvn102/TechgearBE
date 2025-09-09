// config/index.js
// Main configuration file 

require('dotenv').config();

module.exports = {
  // Database configuration 
  MONGODB_URI: 'mongodb+srv://chienvn102:chienvn102@sanshiliu.xdy1ogg.mongodb.net/?retryWrites=true&w=majority&appName=sanshiliu',
  DATABASE_NAME: 'ecommerce_system',
  
  // Server configuration
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // JWT configuration cho authentication 
  JWT_SECRET: process.env.JWT_SECRET || 'chienvn102_secret_key_for_ecommerce_system',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '24h',
  
  // Security configurations
  BCRYPT_SALT_ROUNDS: 12,
  
  // API configurations
  API_PREFIX: '/api/v1',
  
  // Rate limiting
  RATE_LIMIT_WINDOW: 1 * 60 * 1000, // 1 minute
  RATE_LIMIT_MAX: 100, // requests per window
  
  // Pagination defaults
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // Reference to source documents
  CONFIG_SOURCE: 'README_MongoDB.md and rule_backend.instructions.md'
};
