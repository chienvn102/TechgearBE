// routes/upload.js
// Upload routes với Cloudinary integration 

const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { upload } = require('../config/multer.config');
const UploadController = require('../controllers/uploadController');
const CloudinaryUploadController = require('../controllers/cloudinaryUploadController'); 
const BrandUploadController = require('../controllers/brandUploadController');
const PlayerUploadController = require('../controllers/playerUploadController');
const ProductTypeUploadController = require('../controllers/productTypeUploadController');
const { authenticateToken } = require('../middleware/auth');

// Validation rules
const validateProductImageUpload = [
  body('pd_id')
    .isMongoId()
    .withMessage('Product ID không hợp lệ'),
  body('color')
    .notEmpty()
    .withMessage('Color là bắt buộc')
    .isLength({ max: 50 })
    .withMessage('Color không được vượt quá 50 ký tự')
    .trim()
];

const validateMultipleProductImageUpload = [
  body('pd_id')
    .isMongoId()
    .withMessage('Product ID không hợp lệ'),
  body('colors')
    .isArray()
    .withMessage('Colors phải là array')
    .custom((colors) => {
      if (colors.length === 0) {
        throw new Error('Ít nhất 1 color là bắt buộc');
      }
      colors.forEach(color => {
        if (!color || color.trim().length === 0) {
          throw new Error('Color không được để trống');
        }
      });
      return true;
    })
];

// ✅ UPLOAD SINGLE PRODUCT IMAGE: Dynamic storage (local/cloudinary)
// POST /api/v1/upload/product-image
router.post('/product-image',
  authenticateToken,
  upload.single('image'),
  (req, res) => {
    const storageMethod = process.env.STORAGE_METHOD || 'local';
    if (storageMethod === 'cloudinary') {
      return CloudinaryUploadController.uploadProductImage(req, res);
    } else {
      return UploadController.uploadProductImage(req, res);
    }
  }
);

// ✅ UPLOAD PRODUCT IMAGE BY PRODUCT ID: Dynamic storage (local/cloudinary)
// POST /api/v1/upload/products/:productId/images
router.post('/products/:productId/images',
  authenticateToken,
  param('productId').isMongoId().withMessage('Product ID không hợp lệ'),
  upload.single('image'),
  (req, res) => {
    const storageMethod = process.env.STORAGE_METHOD || 'local';
    if (storageMethod === 'cloudinary') {
      return CloudinaryUploadController.uploadProductImage(req, res);
    } else {
      return UploadController.uploadProductImage(req, res);
    }
  }
);

// ✅ UPLOAD MULTIPLE PRODUCT IMAGES: Dynamic storage
// POST /api/v1/upload/product-images/multiple  
router.post('/product-images/multiple',
  authenticateToken,
  upload.array('images', 10),
  (req, res) => {
    const storageMethod = process.env.STORAGE_METHOD || 'local';
    if (storageMethod === 'cloudinary') {
      return CloudinaryUploadController.uploadMultipleProductImages(req, res);
    } else {
      return UploadController.uploadMultipleProductImages(req, res);
    }
  }
);

// ✅ DELETE PRODUCT IMAGE: Dynamic storage
// DELETE /api/v1/upload/product-image/:image_id
router.delete('/product-image/:image_id',
  authenticateToken,
  param('image_id').isMongoId().withMessage('Image ID không hợp lệ'),
  (req, res) => {
    const storageMethod = process.env.STORAGE_METHOD || 'local';
    if (storageMethod === 'cloudinary') {
      return CloudinaryUploadController.deleteProductImage(req, res);
    } else {
      return UploadController.deleteProductImage(req, res);
    }
  }
);

// ✅ GET PRODUCT IMAGES: Fetch all images for a product
// GET /api/v1/upload/product/:pd_id/images
router.get('/product/:pd_id/images',
  param('pd_id').isMongoId().withMessage('Product ID không hợp lệ'),
  (req, res) => {
    const storageMethod = process.env.STORAGE_METHOD || 'local';
    if (storageMethod === 'cloudinary') {
      return CloudinaryUploadController.getProductImages(req, res);
    } else {
      return UploadController.getProductImages(req, res);
    }
  }
);

// ✅ SET DEFAULT PRODUCT IMAGE: Set an image as default for a product
// PUT /api/v1/upload/product-image/:imageId/set-default
router.put('/product-image/:imageId/set-default',
  authenticateToken,
  param('imageId').isMongoId().withMessage('Image ID không hợp lệ'),
  (req, res) => {
    const storageMethod = process.env.STORAGE_METHOD || 'local';
    if (storageMethod === 'cloudinary') {
      return CloudinaryUploadController.setDefaultImage(req, res);
    } else {
      return UploadController.setDefaultImage(req, res);
    }
  }
);

// ===== BRAND LOGO UPLOAD ROUTES =====

// ✅ UPLOAD BRAND LOGO: Cloudinary integration
// POST /api/v1/upload/brand-logo
router.post('/brand-logo',
  authenticateToken,
  upload.single('image'),
  (req, res) => BrandUploadController.uploadBrandLogo(req, res)
);

// ✅ GET BRAND WITH LOGO
// GET /api/v1/upload/brand/:brand_id
router.get('/brand/:brand_id',
  param('brand_id').notEmpty().withMessage('Brand ID là bắt buộc'),
  (req, res) => BrandUploadController.getBrandWithLogo(req, res)
);

// ✅ DELETE BRAND LOGO
// DELETE /api/v1/upload/brand-logo/:brand_id
router.delete('/brand-logo/:brand_id',
  authenticateToken,
  param('brand_id').notEmpty().withMessage('Brand ID là bắt buộc'),
  (req, res) => BrandUploadController.deleteBrandLogo(req, res)
);

// ===== PLAYER IMAGE UPLOAD ROUTES =====

// ✅ UPLOAD PLAYER IMAGE: Cloudinary integration
// POST /api/v1/upload/player-image
router.post('/player-image',
  authenticateToken,
  upload.single('image'),
  (req, res) => PlayerUploadController.uploadPlayerImage(req, res)
);

// ✅ GET PLAYER WITH IMAGE
// GET /api/v1/upload/player/:player_id
router.get('/player/:player_id',
  param('player_id').notEmpty().withMessage('Player ID là bắt buộc'),
  (req, res) => PlayerUploadController.getPlayerWithImage(req, res)
);

// ✅ DELETE PLAYER IMAGE
// DELETE /api/v1/upload/player-image/:player_id
router.delete('/player-image/:player_id',
  authenticateToken,
  param('player_id').notEmpty().withMessage('Player ID là bắt buộc'),
  (req, res) => PlayerUploadController.deletePlayerImage(req, res)
);

// ✅ GET ALL PLAYERS WITH IMAGES
// GET /api/v1/upload/players
router.get('/players',
  (req, res) => PlayerUploadController.getAllPlayersWithImages(req, res)
);

// ===== PRODUCT TYPE IMAGE UPLOAD ROUTES =====

// ✅ UPLOAD PRODUCT TYPE IMAGE: Cloudinary integration
// POST /api/v1/upload/product-type/:id
router.post('/product-type/:id',
  authenticateToken,
  upload.single('image'),
  (req, res) => ProductTypeUploadController.uploadProductTypeImage(req, res)
);

// ✅ GET PRODUCT TYPE IMAGE INFO
// GET /api/v1/upload/product-type/:id/image-info
router.get('/product-type/:id/image-info',
  param('id').notEmpty().withMessage('Product Type ID là bắt buộc'),
  (req, res) => ProductTypeUploadController.getProductTypeImageInfo(req, res)
);

// ✅ DELETE PRODUCT TYPE IMAGE
// DELETE /api/v1/upload/product-type/:id
router.delete('/product-type/:id',
  authenticateToken,
  param('id').notEmpty().withMessage('Product Type ID là bắt buộc'),
  (req, res) => ProductTypeUploadController.deleteProductTypeImage(req, res)
);

// ===== POST IMAGE UPLOAD ROUTES =====

const PostUploadController = require('../controllers/postUploadController');

// ✅ UPLOAD POST IMAGE: Cloudinary integration
// POST /api/v1/upload/post
router.post('/post',
  authenticateToken,
  upload.single('image'),
  body('post_id')
    .notEmpty()
    .withMessage('Post ID là bắt buộc'),
  (req, res) => PostUploadController.uploadPostImage(req, res)
);

// ✅ GET POST IMAGE INFO
// GET /api/v1/upload/post/:post_id/image-info
router.get('/post/:post_id/image-info',
  param('post_id').notEmpty().withMessage('Post ID là bắt buộc'),
  (req, res) => PostUploadController.getPostWithImage(req, res)
);

// ✅ DELETE POST IMAGE
// DELETE /api/v1/upload/post/:post_id
router.delete('/post/:post_id',
  authenticateToken,
  param('post_id').notEmpty().withMessage('Post ID là bắt buộc'),
  (req, res) => PostUploadController.deletePostImage(req, res)
);

module.exports = router;