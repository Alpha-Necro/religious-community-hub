const helmet = require('helmet');
const cors = require('cors');
const csrf = require('csurf');
const { rateLimiter } = require('./rateLimiter');

// Configure CORS
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
};

// Configure CSRF protection
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  },
});

module.exports = {
  setupSecurity: (app) => {
    // Set up security headers
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", process.env.API_URL || 'http://localhost:5000'],
          },
        },
        crossOriginEmbedderPolicy: false,
      })
    );

    // Set up CORS
    app.use(cors(corsOptions));

    // Rate limiting
    app.use(rateLimiter);

    // CSRF protection
    app.use(csrfProtection);

    // Add security headers
    app.use((req, res, next) => {
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'interest-cohort=()');
      next();
    });
  },
};
