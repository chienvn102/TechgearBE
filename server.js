// server.js
// Main server file 

const express = require('express');
const cors = require('cors');
const { connectDB, createIndexes } = require('./config/database');
const config = require('./config');
const routes = require('./routes');

// Import middleware
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { securityHeaders, corsOptions, sanitizeInput, apiRateLimit } = require('./middleware/security');

const app = express();

// Trust proxy - for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(securityHeaders);

// Serve static files (for uploaded images) with CORS - BEFORE main CORS
app.use('/uploads', (req, res, next) => {
  console.log(`📁 Static file request: ${req.method} ${req.originalUrl}`);
  res.header('Access-Control-Allow-Origin', 'http://localhost:5000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  
  next();
}, express.static('public/uploads'));

app.use(cors(corsOptions));
app.use(sanitizeInput);

// Body parsing middleware - Skip for upload routes
app.use((req, res, next) => {
  // Skip JSON parsing for upload routes
  if (req.path.includes('/upload/')) {
    return next();
  }
  express.json({ limit: '10mb' })(req, res, next);
});

app.use((req, res, next) => {
  // Skip URL encoding for upload routes
  if (req.path.includes('/upload/')) {
    return next();
  }
  express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
});

// Rate limiting for API routes
app.use('/api', apiRateLimit);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// API routes với prefix từ config
app.use(config.API_PREFIX, routes);

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'E-commerce Backend API',
    version: '1.0.0',
    documentation: `${config.API_PREFIX}/info`,
    health_check: `${config.API_PREFIX}/health`,
    endpoints: {
      auth: `${config.API_PREFIX}/auth`,
      user_management: `${config.API_PREFIX}/user-management`,
      products: `${config.API_PREFIX}/products`,
      orders: `${config.API_PREFIX}/orders`
    },
    compliance: {
      source: 'README_MongoDB.md',
      rules: 'rule_backend.instructions.md',
      database: config.DATABASE_NAME,
      collections: 29
    }
  });
});

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Start server function
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Create indexes theo README_MongoDB.md
    await createIndexes();
    
    // Start payment expiration job
    const PaymentExpirationJob = require('./jobs/paymentExpirationJob');
    PaymentExpirationJob.start();
    console.log('✅ Payment expiration job initialized');
    
    // Start server
    const PORT = config.PORT;
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    // Setup Socket.io for real-time notifications
    const { Server } = require('socket.io');
    const io = new Server(server, {
      cors: {
        origin: ['http://localhost:5000', 'http://localhost:3001'],
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    // Socket.io connection handling
    io.on('connection', (socket) => {
      // Silent connection - no log needed

      // Join customer-specific room
      socket.on('join:customer', (customerId) => {
        socket.join(`customer:${customerId}`);
        // Silent join - no log needed
      });

      // Leave room on disconnect
      socket.on('disconnect', () => {
        // Silent disconnect - no log needed
      });
    });

    // Make io available globally for notifications
    global.io = io;
    // Silent Socket.io initialization - no log needed

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully...');
      PaymentExpirationJob.stop();
      io.close();
      server.close(() => {
        console.log('Process terminated');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully...');
      PaymentExpirationJob.stop();
      io.close();
      server.close(() => {
        console.log('Process terminated');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;
