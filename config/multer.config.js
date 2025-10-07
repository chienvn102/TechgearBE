const multer = require('multer');
const path = require('path');

/**
 * Multer Configuration for File Uploads
 */

// Memory storage (for Cloudinary upload)
const memoryStorage = multer.memoryStorage();

// File filter - only images
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

// Multer configuration
const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

module.exports = {
  upload,
  uploadSingle: upload.single('image'),
  uploadMultiple: upload.array('images', 5) // Max 5 images
};
