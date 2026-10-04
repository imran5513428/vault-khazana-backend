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

const routeStatus = {
  auth: 'Loading',
  products: 'Loading',
  cart: 'Loading',
  orders: 'Loading'
};

const routeErrors = {};

let finalHandlersInstalled = false;

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
  const allRoutesLoaded =
    Object.values(routeStatus).every(
      (status) => status === 'Loaded'
    );

  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',

    database:
      mongoose.connection.readyState === 1
        ? 'Connected'
        : 'Disconnected',

    routes: allRoutesLoaded
      ? 'Loaded'
      : 'Partial / Failed',

    routeStatus,
    routeErrors,
    message: '✅ Server is running'
  });
});

// ========================
// ROOT ROUTE
// ========================

app.get('/', (req, res) => {
  const allRoutesLoaded =
    Object.values(routeStatus).every(
      (status) => status === 'Loaded'
    );

  res.json({
    message: '🏆 Vault Khazana Backend API',
    version: '1.0.0',
    status: 'Online',

    database:
      mongoose.connection.readyState === 1
        ? 'Connected'
        : 'Disconnected',

    routes: allRoutesLoaded
      ? 'Loaded'
      : 'Partial / Failed',

    routeStatus,
    message_detail: 'Backend server is running'
  });
});

// ========================
// LOAD ONE ROUTE
// ========================

async function loadSingleRoute(
  routeName,
  routeFile,
  mountPath
) {
  try {
    console.log(
      `🔎 Loading ${routeName} routes...`
    );

    const routeModule = await import(routeFile);

    if (!routeModule.default) {
      throw new Error(
        `${routeFile} does not export a default router.`
      );
    }

    app.use(
      mountPath,
      routeModule.default
    );

    routeStatus[routeName] = 'Loaded';

    console.log(
      `✅ ${routeName} routes loaded successfully`
    );

  } catch (error) {

    routeStatus[routeName] = 'Failed';

    routeErrors[routeName] =
      error.stack || error.message || String(error);

    console.error('');
    console.error(
      `❌ ${routeName.toUpperCase()} ROUTE IMPORT FAILED`
    );
    console.error(
      '────────────────────────────────────────'
    );
    console.error(
      error.stack || error
    );
    console.error(
      '────────────────────────────────────────'
    );
    console.error('');
  }
}

// ========================
// LOAD ALL API ROUTES
// ========================

async function loadRoutes() {

  console.log('');
  console.log('🔄 Starting API route diagnostics...');
  console.log('');

  await loadSingleRoute(
    'auth',
    './routes/auth.js',
    '/api/auth'
  );

  await loadSingleRoute(
    'products',
    './routes/products.js',
    '/api/products'
  );

  await loadSingleRoute(
    'cart',
    './routes/cart.js',
    '/api/cart'
  );

  await loadSingleRoute(
    'orders',
    './routes/orders.js',
    '/api/orders'
  );

  console.log('');
  console.log('📊 ROUTE DIAGNOSTIC RESULT');
  console.log('────────────────────────────────────────');
  console.log(
    `Auth: ${routeStatus.auth}`
  );
  console.log(
    `Products: ${routeStatus.products}`
  );
  console.log(
    `Cart: ${routeStatus.cart}`
  );
  console.log(
    `Orders: ${routeStatus.orders}`
  );
  console.log('────────────────────────────────────────');
  console.log('');

  const failedRoutes = Object.entries(routeStatus)
    .filter(([, status]) => status === 'Failed')
    .map(([name]) => name);

  if (failedRoutes.length > 0) {
    console.error(
      `❌ Failed route(s): ${failedRoutes.join(', ')}`
    );
  } else {
    console.log('✅ All API routes loaded successfully');
  }

  console.log('');
}

// ========================
// MONGODB CONNECTION
// ========================

async function connectDatabase() {

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI environment variable is missing.');
    console.error('⚠️ Server will remain online.');
    return;
  }

  try {

    const parsedUri = new URL(uri);

    console.log(
      `🔐 MongoDB diagnostic protocol: ${parsedUri.protocol}`
    );

    console.log(
      `🔐 MongoDB diagnostic hostname: ${parsedUri.hostname}`
    );

  } catch (error) {

    console.error(
      '❌ MongoDB URI format could not be parsed.'
    );

    console.error(
      error.message
    );

    console.error(
      '⚠️ Server will remain online.'
    );

    return;
  }

  try {

    console.log('🔄 Connecting to MongoDB...');

    await mongoose.connect(uri);

    console.log('✅ MongoDB connected successfully');

  } catch (error) {

    console.error('❌ MongoDB connection error:');

    console.error(
      error.message || error
    );

    console.error(
      '⚠️ Server will remain online.'
    );
  }
}

// ========================
// FINAL ERROR HANDLERS
// ========================

function installFinalHandlers() {

  if (finalHandlersInstalled) {
    return;
  }

  finalHandlersInstalled = true;

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      status: 'error',
      message: `Route not found: ${req.method} ${req.originalUrl}`
    });
  });

  // Global error handler
  app.use((error, req, res, next) => {

    console.error('❌ GLOBAL ERROR HANDLER');

    console.error(
      error.stack || error
    );

    const statusCode =
      error.statusCode ||
      error.status ||
      500;

    res.status(statusCode).json({
      status: 'error',
      message:
        error.message ||
        'Internal server error'
    });
  });
}

// ========================
// START SERVER
// ========================

const server = app.listen(PORT, () => {

  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║ 🏆 VAULT KHAZANA BACKEND              ║');
  console.log(`║ Server running on port ${PORT}           ║`);
  console.log('║ Environment: production                ║');
  console.log('║ Database: Connecting...                ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');

  loadRoutes()
    .then(() => {
      installFinalHandlers();
      return connectDatabase();
    })
    .catch((error) => {

      console.error(
        '❌ Backend startup sequence failed:'
      );

      console.error(
        error.stack || error
      );

      installFinalHandlers();
    });
});

// ========================
// GRACEFUL SHUTDOWN
// ========================

async function gracefulShutdown(signal) {

  console.log('');
  console.log(
    `🛑 ${signal} received. Shutting down gracefully...`
  );

  server.close(async () => {

    try {

      if (
        mongoose.connection.readyState !== 0
      ) {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed');
      }

      console.log('✅ Server shutdown complete');
      process.exit(0);

    } catch (error) {

      console.error(
        '❌ Error during shutdown:',
        error.message || error
      );

      process.exit(1);
    }
  });
}

process.on(
  'SIGINT',
  () => gracefulShutdown('SIGINT')
);

process.on(
  'SIGTERM',
  () => gracefulShutdown('SIGTERM')
);

// ========================
// EXPORT APP
// ========================

export default app;