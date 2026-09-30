import fs from 'fs';
import path from 'path';

// ========================
// LOGGER SETUP
// ========================

const LOG_DIR = 'logs';

// Create logs directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR);
}

const getLogFile = () => {
  const date = new Date().toISOString().split('T')[0];
  return path.join(LOG_DIR, `${date}.log`);
};

// ========================
// LOGGER FUNCTIONS
// ========================

export const logger = {
  info: (message, data = {}) => {
    const timestamp = new Date().toISOString();
    const log = `[${timestamp}] ℹ️  INFO: ${message} ${JSON.stringify(data)}`;
    console.log(log);
    writeLog(log);
  },

  warn: (message, data = {}) => {
    const timestamp = new Date().toISOString();
    const log = `[${timestamp}] ⚠️  WARN: ${message} ${JSON.stringify(data)}`;
    console.warn(log);
    writeLog(log);
  },

  error: (message, error = {}) => {
    const timestamp = new Date().toISOString();
    const errorData = error instanceof Error ? error.message : JSON.stringify(error);
    const log = `[${timestamp}] ❌ ERROR: ${message} - ${errorData}`;
    console.error(log);
    writeLog(log);
  },

  success: (message, data = {}) => {
    const timestamp = new Date().toISOString();
    const log = `[${timestamp}] ✅ SUCCESS: ${message} ${JSON.stringify(data)}`;
    console.log(log);
    writeLog(log);
  }
};

// ========================
// WRITE TO LOG FILE
// ========================

const writeLog = (message) => {
  try {
    fs.appendFileSync(getLogFile(), message + '\n');
  } catch (error) {
    console.error('Failed to write log:', error);
  }
};

// ========================
// REQUEST LOGGER MIDDLEWARE
// ========================

export const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log incoming request
  const requestLog = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?._id || 'guest'
  };

  logger.info(`→ ${req.method} ${req.originalUrl}`, requestLog);

  // Override res.json to log response
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    const duration = Date.now() - startTime;

    const responseLog = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?._id || 'guest'
    };

    if (res.statusCode >= 400) {
      logger.error(`✗ ${req.method} ${req.originalUrl}`, responseLog);
    } else {
      logger.success(`✓ ${req.method} ${req.originalUrl}`, responseLog);
    }

    return originalJson(data);
  };

  next();
};

// ========================
// PERFORMANCE LOGGER
// ========================

export const performanceLogger = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    // Warn if request takes too long
    if (duration > 1000) {
      logger.warn(`Slow request: ${req.method} ${req.originalUrl}`, {
        duration: `${duration}ms`
      });
    }
  });

  next();
};

// ========================
// ERROR LOGGER
// ========================

export const errorLogger = (err, req, res, next) => {
  logger.error(`${req.method} ${req.originalUrl}`, {
    message: err.message,
    statusCode: err.statusCode,
    userId: req.user?._id || 'guest'
  });

  next(err);
};

// ========================
// DATABASE LOGGER
// ========================

export const dbLogger = (operation, collection, data = {}) => {
  logger.info(`[DB] ${operation} on ${collection}`, data);
};

// ========================
// AUTHENTICATION LOGGER
// ========================

export const authLogger = (action, userId, details = {}) => {
  logger.info(`[AUTH] ${action}`, {
    userId,
    ...details
  });
};

// ========================
// PAYMENT LOGGER
// ========================

export const paymentLogger = (action, paymentData = {}) => {
  logger.info(`[PAYMENT] ${action}`, {
    amount: paymentData.amount,
    method: paymentData.method,
    status: paymentData.status,
    orderId: paymentData.orderId
  });
};
