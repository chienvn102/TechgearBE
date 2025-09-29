// CLOUDINARY CONFIGURATION


const { v2: cloudinary } = require('cloudinary');

// ENVIRONMENT VARIABLES: Lấy từ .env
const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_URL
} = process.env;

// CLOUDINARY CONFIG
if (CLOUDINARY_URL) {
  // Option 1: Sử dụng CLOUDINARY_URL 
  cloudinary.config({ cloudinary_url: CLOUDINARY_URL });
} else {
  // Option 2: Sử dụng separate credentials
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME || 'dfcerueaq',
    api_key: CLOUDINARY_API_KEY || '475252942396945',
    api_secret: CLOUDINARY_API_SECRET || '47a94_CgguHLYCscNt39O0awvx0'
  });
}

// FOLDER STRUCTURE: Theo thiết kế từ setup guide
const CLOUDINARY_FOLDERS = {
  PRODUCTS: 'ecommerce/products',
  BRANDS: 'ecommerce/brands',
  CATEGORIES: 'ecommerce/categories',
  USERS: 'ecommerce/users',
  BANNERS: 'ecommerce/banners'
};

// UPLOAD PRESETS: Đã tạo trong Cloudinary dashboard
const UPLOAD_PRESETS = {
  PRODUCTS: 'ecommerce_products',
  BRANDS: 'ecommerce_brands',
  CATEGORIES: 'ecommerce_categories',
  PLAYERS: 'ecommerce_players',
  BANNERS: 'ecommerce_banners'
};

// IMAGE TRANSFORMATIONS: Các size chuẩn cho ecommerce
const TRANSFORMATIONS = {
  THUMBNAIL: { width: 200, height: 200, crop: 'fill', fetch_format: 'auto', quality: 'auto' },
  MEDIUM: { width: 500, height: 500, crop: 'fill', fetch_format: 'auto', quality: 'auto' },
  LARGE: { width: 1000, height: 1000, crop: 'fill', fetch_format: 'auto', quality: 'auto' },
  ORIGINAL: { fetch_format: 'auto', quality: 'auto' },
  
  // BANNER TRANSFORMATIONS: Tối ưu cho banner 1920x1080
  BANNER_THUMBNAIL: { width: 300, height: 169, crop: 'fit', fetch_format: 'auto', quality: 'auto' },
  BANNER_MEDIUM: { width: 800, height: 450, crop: 'fit', fetch_format: 'auto', quality: 'auto' },
  BANNER_LARGE: { width: 1920, height: 1080, crop: 'fit', fetch_format: 'auto', quality: 'auto' },
  BANNER_DISPLAY: { width: 1920, height: 1080, crop: 'fit', gravity: 'center', fetch_format: 'auto', quality: 'auto' }
};

// VALIDATION: Kiểm tra config
const validateConfig = () => {
  const config = cloudinary.config();
  
  if (!config.cloud_name || !config.api_key || !config.api_secret) {
    throw new Error(
      'Cloudinary configuration incomplete! ' +
      'Please check CLOUDINARY_URL or individual credentials in .env file. ' +
      'Reference: CLOUDINARY_SETUP_GUIDE.md'
    );
  }
  
  console.log('Cloudinary configured successfully:');
  console.log(`   Cloud Name: ${config.cloud_name}`);
  console.log(`   API Key: ${config.api_key?.substring(0, 6)}...`);
  console.log('   Reference: CLOUDINARY_SETUP_GUIDE.md');
  
  return true;
};

module.exports = {
  cloudinary,
  CLOUDINARY_FOLDERS,
  UPLOAD_PRESETS,
  TRANSFORMATIONS,
  validateConfig
};
