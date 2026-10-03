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