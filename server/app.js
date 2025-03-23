const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const csurf = require('csurf');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Import security middleware
const securityMiddleware = require('./middleware/security');
const requestSanitizer = require('./middleware/requestSanitizer');

const app = express();

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Security middleware
app.use(cors());
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(xss());
app.use(csurf());
securityMiddleware(app);

// Request body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request sanitization
app.use(requestSanitizer);

// Routes
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/forum', require('./routes/forum'));
app.use('/api/v1/events', require('./routes/events'));
app.use('/api/v1/resources', require('./routes/resources'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = app;
