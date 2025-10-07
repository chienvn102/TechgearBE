const cloudinary = require('cloudinary').v2;
const config = require('./index');

/**
 * Cloudinary Configuration
 * Used for image upload and management
 */

cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
  secure: true
});

console.log('✅ Cloudinary configured:', config.CLOUDINARY_CLOUD_NAME);

/**
 * Cloudinary Folders Configuration
 * Organized folder structure for different entity types
 */
const CLOUDINARY_FOLDERS = {
  PRODUCTS: 'ecommerce/products',
  BRANDS: 'ecommerce/brands',
  PLAYERS: 'ecommerce/players',
  USERS: 'ecommerce/users',
  CATEGORIES: 'ecommerce/categories',
  PRODUCT_TYPES: 'ecommerce/product-types',
  BANNERS: 'ecommerce/banners',
  POSTS: 'ecommerce/posts',
  REVIEWS: 'ecommerce/reviews'
};

/**
 * Cloudinary Image Transformations
 * Predefined transformation presets for consistent image sizing
 */
const TRANSFORMATIONS = {
  THUMBNAIL: {
    width: 150,
    height: 150,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto',
    fetch_format: 'auto'
  },
  MEDIUM: {
    width: 400,
    height: 400,
    crop: 'fit',
    quality: 'auto',
    fetch_format: 'auto'
  },
  LARGE: {
    width: 800,
    height: 600,
    crop: 'fit',
    quality: 'auto',
    fetch_format: 'auto'
  },
  BANNER: {
    width: 1920,
    height: 1080,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto',
    fetch_format: 'auto'
  },
  AVATAR: {
    width: 200,
    height: 200,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto',
    fetch_format: 'auto'
  }
};

module.exports = {
  cloudinary,
  CLOUDINARY_FOLDERS,
  TRANSFORMATIONS
};
