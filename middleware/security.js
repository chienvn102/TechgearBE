// middleware/security.js
// Security middleware 

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const config = require('../config');

// Rate limiting configuration theo rule
const createRateLimit = (windowMs = config.RATE_LIMIT_WINDOW, max = config.RATE_LIMIT_MAX) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Different rate limits for different endpoints
const authRateLimit = createRateLimit(1 * 60 * 1000, 100); // 100 attempts per 1 minute for auth (increased for development)
const apiRateLimit = createRateLimit(1 * 60 * 1000, 1000); // 1000 requests per 1 minute for API (increased for development)

// Security headers
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  crossOriginEmbedderPolicy: false
});

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Get allowed origins from environment variable or use defaults
    const envOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [];
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5000',  // Frontend running on port 5000
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000',   // Alternative localhost format
      ...envOrigins  // Add production origins from environment
    ];
    
    // Allow all Vercel preview deployments (*.vercel.app)
    const isVercelDomain = origin.endsWith('.vercel.app');
    
    if (allowedOrigins.indexOf(origin) !== -1 || isVercelDomain) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Request sanitization
const sanitizeInput = (req, res, next) => {
  // Remove any potential XSS from request body
  if (req.body) {
    const sanitizeObject = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          // Basic XSS prevention
          obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
          obj[key] = obj[key].replace(/javascript:/gi, '');
          obj[key] = obj[key].replace(/on\w+\s*=/gi, '');
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    };
    
    sanitizeObject(req.body);
  }
  
  next();
};

module.exports = {
  apiRateLimit,
  authRateLimit,
  securityHeaders,
  corsOptions,
  sanitizeInput
};
