import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// ========================
// APP CONFIGURATION
// ========================

const app = express();
const PORT = process.env.PORT || 5000;

let routesLoaded = false;
let routesError = null;

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
// HEALTH CHECK
// ========================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
    database: mongoose.connection.readyState === 1
      ? 'Connected'
      : 'Disconnected',
    routes: routesLoaded
      ? 'Loaded'
      : routesError
        ? 'Failed'
        : 'Loading',
    message: '✅ Server is running'
  });
});

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
      : 'Disconnected',
    routes: routesLoaded
      ? 'Loaded'
      : routesError
        ? 'Failed'
        : 'Loading'
  });
});

// ========================
// LOAD API ROUTES
// ========================

async function loadRoutes() {
  try {
    console.log('🔄 Loading API routes...');

    const { default: authRoutes } =
      await import('./routes/auth.js');

    const { default: productRoutes } =
      await import('./routes/products.js');

    const { default: cartRoutes } =
      await import('./routes/cart.js');

    const { default: orderRoutes } =
      await import('./routes/orders.js');

    // Authentication
    app.use('/api/auth', authRoutes);

    // Products
    app.use('/api/products', productRoutes);

    // Cart
    app.use('/api/cart', cartRoutes);

    // Orders
    app.use('/api/orders', orderRoutes);

    routesLoaded = true;

    console.log('✅ API routes loaded successfully');

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

  } catch (error) {
    routesError = error;

    console.error('❌ API route startup error:');
    console.error(error);

    console.error(
      '⚠️ Server will remain online so the deployment platform can detect the port.'
    );
  }
}

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
      '⚠️ Server will remain online.'
    );

    return false;
  }
}

// ========================
// SERVER STARTUP
// ========================

// IMPORTANT:
// Start HTTP server FIRST.
// This allows Abasthan to detect the live port
// before loading routes or connecting to MongoDB.

const server = app.listen(PORT, () => {

  console.log(`
╔════════════════════════════════════════╗
║   🏆 VAULT KHAZANA BACKEND            ║
║   Server running on port ${PORT}        ║
║   Environment: ${process.env.NODE_ENV || 'production'} ║
║   Database: Connecting...              ║
╚════════════════════════════════════════╝
  `);

  // Load routes and connect to MongoDB
  // only AFTER the server is listening.

  loadRoutes()
    .then(() => connectDatabase())
    .catch((error) => {
      console.error(
        '❌ Startup initialization error:',
        error
      );
    });
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