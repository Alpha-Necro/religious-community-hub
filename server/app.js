const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const csurf = require('csurf');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');
const { limiter, authLimiter, apiKeyLimiter, ipLimiter } = require('./middleware/rateLimiter');
const { securityAlertService } = require('./services/securityAlertService');
const { ipAccessControlService } = require('./services/ipAccessControlService');
const { performanceMonitor } = require('./services/performanceMonitor');
const { codeSplitting } = require('./middleware/codeSplitting');
const { securityMiddleware } = require('./middleware/security');
const requestSanitizer = require('./middleware/requestSanitizer');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();

// Initialize performance monitoring
performanceMonitor.initialize();

// Initialize code splitting
codeSplitting.initialize(app);

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));
app.use(xss());
app.use(csurf());
securityMiddleware(app);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting middleware
app.use('/api/v1', limiter);
app.use('/api/v1/auth', authLimiter);
app.use('/api/v1', apiKeyLimiter);
app.use('/api/v1', ipLimiter);

// IP access control middleware
app.use(async (req, res, next) => {
  try {
    await ipAccessControlService.validateIP(req.ip, req.user?.id);
    next();
  } catch (error) {
    await securityAlertService.createAlert({
      title: 'IP Access Control Failed',
      description: `IP access control failed: ${error.message}`,
      severity: 'ERROR',
      type: 'IP_ACCESS_CONTROL_FAILED',
      metadata: {
        ip: req.ip,
        error: error.message
      }
    });
    res.status(403).json({
      error: 'Access denied from this IP address'
    });
  }
});

// Request sanitization
app.use(requestSanitizer);

// API versioning
app.use('/api/v1', require('./routes/v1/index'));

// Performance monitoring middleware
app.use((req, res, next) => {
  const startTime = performance.now();
  
  res.on('finish', () => {
    const endTime = performance.now();
    const responseTime = endTime - startTime;

    performanceMonitor.metrics.responseTime = {
      ...performanceMonitor.metrics.responseTime,
      current: responseTime
    };

    // Log performance metrics
    if (responseTime > process.env.RESPONSE_TIME_THRESHOLD) {
      performanceMonitor.createAlert({
        title: 'Performance Alert',
        description: `Slow response time for route: ${req.path}`,
        severity: 'WARNING',
        type: 'PERFORMANCE_ALERT',
        metadata: {
          route: req.path,
          responseTime,
          method: req.method
        }
      });
    }
  });

  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Log security-related errors
  if (err.name === 'SecurityError') {
    securityAlertService.createAlert({
      title: 'Security Error',
      description: err.message,
      severity: 'ERROR',
      type: 'SECURITY_ERROR',
      metadata: {
        ip: req.ip,
        endpoint: req.path,
        method: req.method
      }
    });
  }

  // Log performance-related errors
  performanceMonitor.trackError();
  performanceMonitor.createAlert({
    title: 'Error Alert',
    description: `Error in route: ${req.path}`,
    severity: 'ERROR',
    type: 'ERROR_ALERT',
    metadata: {
      error: err.message,
      route: req.path,
      method: req.method
    }
  });

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR',
    details: process.env.NODE_ENV === 'development' ? err.details : null
  });
});

module.exports = app;
