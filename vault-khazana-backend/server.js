import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import 'express-async-errors';
import mongoose from 'mongoose';

import authRoutes from './routes/auth.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orders.js';
import productRoutes from './routes/products.js';

// Load environment variables
dotenv.config();

// ========================
// APP CONFIGURATION
// ========================

const app = express();
const PORT = process.env.PORT || 5000;

// ========================
// MIDDLEWARE
// ========================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_PRODUCTION_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ========================
// API ROUTES
// ========================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
    database: mongoose.connection.readyState === 1
      ? 'Connected'
      : 'Disconnected',
    message: '✅ Server is running'
  });
});

// Authentication
app.use('/api/auth', authRoutes);

// Products
app.use('/api/products', productRoutes);

// Cart
app.use('/api/cart', cartRoutes);

// Orders
app.use('/api/orders', orderRoutes);

// ========================
// ROOT ROUTE
// ========================

app.get('/', (req, res) => {
  res.json({
    message: '🏆 Vault Khazana Backend API',
    version: '1.0.0',
    status: 'Online',
    database: mongoose.connection.readyState === 1
      ? 'Connected'
      : 'Disconnected'
  });
});

// ========================
// 404 HANDLER
// ========================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// ========================
// ERROR HANDLER
// ========================

app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);

  res.status(err.statusCode || 500).json({
    success: false,
    statusCode: err.statusCode || 500,
    message: err.message || 'Internal Server Error'
  });
});

// ========================
// DATABASE CONNECTION
// ========================

async function connectDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error(
      '❌ MONGODB_URI environment variable is missing.'
    );
    return false;
  }

  try {
    await mongoose.connect(uri);

    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error(
      '❌ MongoDB connection error:',
      error.message
    );

    console.error(
      '⚠️ Server will remain online so the deployment platform can detect the port.'
    );

    return false;
  }
}

// ========================
// SERVER STARTUP
// ========================

// IMPORTANT:
// Start the HTTP server FIRST so the deployment platform
// can detect the PORT. MongoDB connects immediately afterward.

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   🏆 VAULT KHAZANA BACKEND            ║
║   Server running on port ${PORT}        ║
║   Environment: ${process.env.NODE_ENV || 'production'} ║
║   Database: Connecting...              ║
╚════════════════════════════════════════╝
  `);

  // Connect to MongoDB after the HTTP server is listening.
  connectDatabase();
});

// ========================
// GRACEFUL SHUTDOWN
// ========================

async function shutdown(signal) {
  console.log(
    `\n📛 ${signal} received. Shutting down gracefully...`
  );

  server.close(async () => {
    try {
      await mongoose.disconnect();
      console.log('✅ MongoDB disconnected');
    } catch (error) {
      console.error(
        '❌ MongoDB disconnect error:',
        error.message
      );
    }

    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export default app;