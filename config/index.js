/**
 * Application Configuration
 * Centralized configuration from environment variables
 */

require('dotenv').config();

module.exports = {
  // Server Configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000,

  // API Configuration
  API_PREFIX: process.env.API_PREFIX || '/api/v1',

  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'chienvn102_secret_key_for_ecommerce_system_2024',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '24h',

  // Database Configuration
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://chienvn102:chienvn102@sanshiliu.xdy1ogg.mongodb.net/?retryWrites=true&w=majority&appName=sanshiliu',
  DATABASE_NAME: process.env.DATABASE_NAME || 'ecommerce_system',

  // Upload Configuration
  UPLOAD_MAX_SIZE: parseInt(process.env.UPLOAD_MAX_SIZE) || 5242880, // 5MB
  UPLOAD_DIR: process.env.UPLOAD_DIR || './public/uploads',
  IMAGE_QUALITY_WEBP: parseInt(process.env.IMAGE_QUALITY_WEBP) || 85,
  IMAGE_QUALITY_JPEG: parseInt(process.env.IMAGE_QUALITY_JPEG) || 80,

  // Cloudinary Configuration
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || 'dfcerueaq',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '475252942396945',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '47a94_CgguHLYCscNt39O0awvx0',
  CLOUDINARY_URL: process.env.CLOUDINARY_URL || 'cloudinary://475252942396945:47a94_CgguHLYCscNt39O0awvx0@dfcerueaq',
  CLOUDINARY_UPLOAD_PRESET: process.env.CLOUDINARY_UPLOAD_PRESET || 'ecommerce_products',
  CLOUDINARY_FOLDER: process.env.CLOUDINARY_FOLDER || 'ecommerce/products',

  // Storage Configuration
  STORAGE_METHOD: process.env.STORAGE_METHOD || 'cloudinary',

  // Security Configuration
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,

  // Rate Limiting
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000, // 15 minutes
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX) || 100,

  // CORS Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',

  // PayOS Payment Gateway
  PAYOS_CLIENT_ID: process.env.PAYOS_CLIENT_ID,
  PAYOS_API_KEY: process.env.PAYOS_API_KEY,
  PAYOS_CHECKSUM_KEY: process.env.PAYOS_CHECKSUM_KEY,
  PAYOS_RETURN_URL: process.env.PAYOS_RETURN_URL || 'http://localhost:3000/customer/payment/success',
  PAYOS_CANCEL_URL: process.env.PAYOS_CANCEL_URL || 'http://localhost:3000/customer/payment/cancel',

  // Frontend URL
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',

  // CDN Configuration
  CDN_BASE_URL: process.env.CDN_BASE_URL || 'https://cdn.yourdomain.com',
  USE_CDN: process.env.USE_CDN === 'true',

  // Cleanup Configuration
  AUTO_CLEANUP_ENABLED: process.env.AUTO_CLEANUP_ENABLED === 'true',
  CLEANUP_INTERVAL_HOURS: parseInt(process.env.CLEANUP_INTERVAL_HOURS) || 24
};
