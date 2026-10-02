import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import 'express-async-errors';
import mongoose from 'mongoose';

import authRoutes from './routes/auth.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payments.js';
import productRoutes from './routes/products.js';

// Load environment variables
dotenv.config();

// ========================
// MIDDLEWARE
// ========================

const app = express();
const PORT = process.env.PORT || 5000;

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// CORS middleware
app.use(cors({
  origin: [process.env.FRONTEND_URL, process.env.FRONTEND_PRODUCTION_URL],
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

// Payments
app.use('/api/payments', paymentRoutes);

// ========================
// ROOT ROUTE
// ========================

app.get('/', (req, res) => {
  res.json({
    message: '🏆 Vault Khazana Backend API',
    version: '1.0.0',
    status: 'Online'
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
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vault-khazana';

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
}

// ========================
// SERVER STARTUP
// ========================

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();

    // Start server
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║   🏆 VAULT KHAZANA BACKEND              ║
║   Server running on port ${PORT}          ║
║   Environment: ${process.env.NODE_ENV}        ║
║   Database: Connected ✅                ║
║   Frontend: ${process.env.FRONTEND_URL}   ║
╚════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// ========================
// GRACEFUL SHUTDOWN
// ========================

process.on('SIGINT', async () => {
  console.log('\n📛 Shutting down gracefully...');
  await mongoose.disconnect();
  process.exit(0);
});

export default app;

Only one functional correction: the 404 message now correctly uses a template literal.

Save/commit this complete file. Don't change anything else yet. Then tell me Done, and I’ll verify the actual GitHub file before we take the next step.