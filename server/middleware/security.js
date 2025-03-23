const helmet = require('helmet');
const csrf = require('csurf');
const xss = require('xss-clean');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
};

// CSRF configuration
const csrfProtection = csrf({
  cookie: true,
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
});

const security = (app) => {
  // Security headers
  app.use(helmet());
  
  // XSS protection
  app.use(xss());
  
  // CORS
  app.use(cors(corsOptions));
  
  // Rate limiting
  app.use('/api', apiLimiter);
  
  // CSRF protection
  app.use(csrfProtection);
  
  // Add CSRF token to response
  app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
  });
};

module.exports = { security, csrfProtection, corsOptions };
