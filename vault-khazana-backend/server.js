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

    message_detail:
      'Backend server is running'
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
    `Auth:     ${routeStatus.auth}`
  );
  console.log(
    `Products: ${routeStatus.products}`
  );
  console.log(
    `Cart:     ${routeStatus.cart}`
  );
  console.log(
    `Orders:   ${routeStatus.orders}`
  );
  console.log('────────────────────────────────────────');
  console.log('');

  const failedRoutes = Object.entries(routeStatus)
    .filter(([, status]) => status === 'Failed')
    .map(([name]) => name);

  if (failedRoutes.length === 0) {
    console.log(
      '✅ ALL API ROUTES LOADED SUCCESSFULLY'
    );
  } else {
    console.error(
      `❌ Failed route(s): ${failedRoutes.join(', ')}`
    );
  }

  console.log('');

  installFinalHandlers();
}

// ========================
// 404 + ERROR HANDLERS
// ========================

function installFinalHandlers() {

  if (finalHandlersInstalled) {
    return;
  }

  finalHandlersInstalled = true;

  // 404 HANDLER
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: `Route ${req.originalUrl} not found`
    });
  });

  // ERROR HANDLER
  app.use((err, req, res, next) => {

    console.error('❌ Express Error:');
    console.error(
      err.stack || err.message || err
    );

    res.status(err.statusCode || 500).json({
      success: false,
      statusCode: err.statusCode || 500,
      message:
        err.message ||
        'Internal Server Error'
    });
  });
}

// ========================
// DATABASE CONNECTION
// ========================

async function connectDatabase() {

  const uri = 'mongodb://Admin:[YOUR_PASSWORD]@ac-jizi34c-shard-00-00.mw3for0.mongodb.net:27017,ac-jizi34c-shard-00-01.mw3for0.mongodb.net:27017,ac-jizi34c-shard-00-02.mw3for0.mongodb.net:27017/?ssl=true&replicaSet=atlas-spixpz-shard-0&authSource=admin&appName=Cluster0';

  try {

    const parsedUri = new URL(uri);

    console.log(
      `🔐 MongoDB diagnostic hostname: ${parsedUri.hostname}`
    );

    console.log(
      `🔐 MongoDB diagnostic protocol: ${parsedUri.protocol}`
    );

    console.log(
      `🔐 MongoDB diagnostic database: ${parsedUri.pathname === '/' ? '(none specified)' : parsedUri.pathname.slice(1)}`
    );

    console.log(
      '🔄 Connecting to MongoDB...'
    );

    await mongoose.connect(uri);

    console.log(
      '✅ MongoDB connected successfully'
    );

    return true;

  } catch (error) {

    console.error(
      '❌ MongoDB connection error:'
    );

    console.error(
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
// This allows Abasthan to detect the port
// before route loading or database connection.

const server = app.listen(
  PORT,
  () => {

    console.log(`
╔════════════════════════════════════════╗
║   🏆 VAULT KHAZANA BACKEND            ║
║   Server running on port ${PORT}        ║
║   Environment: ${process.env.NODE_ENV || 'production'} ║
║   Database: Connecting...              ║
╚════════════════════════════════════════╝
    `);

    // Diagnose routes first.
    // Connect to MongoDB afterward.

    loadRoutes()
      .then(() => connectDatabase())
      .catch((error) => {

        console.error(
          '❌ Startup initialization error:'
        );

        console.error(
          error.stack || error
        );
      });
  }
);

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

      console.log(
        '✅ MongoDB disconnected'
      );

    } catch (error) {

      console.error(
        '❌ MongoDB disconnect error:',
        error.message
      );
    }

    process.exit(0);
  });
}

process.on(
  'SIGINT',
  () => shutdown('SIGINT')
);

process.on(
  'SIGTERM',
  () => shutdown('SIGTERM')
);

// ========================
// EXPORT APP
// ========================

export default app;