import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import xss from 'xss-clean';
import csurf from 'csurf';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './configManager';
import { authMiddleware, refreshTokenMiddleware } from '../middleware/auth';

// Rate limiting configurations
export const limiter = rateLimit({
  windowMs: config.security.rateLimit.windowMs,
  max: config.security.rateLimit.max,
  standardHeaders: config.security.rateLimit.standardHeaders,
  legacyHeaders: config.security.rateLimit.legacyHeaders,
  message: 'Too many requests from this IP, please try again later.',
  statusCode: 429,
  skipFailedRequests: true,
});

export const authLimiter = rateLimit({
  windowMs: config.security.rateLimit.windowMs,
  max: config.security.rateLimit.max / 5,
  standardHeaders: config.security.rateLimit.standardHeaders,
  legacyHeaders: config.security.rateLimit.legacyHeaders,
  message: 'Too many authentication attempts from this IP, please try again later.',
  statusCode: 429,
  skipFailedRequests: true,
});

export const apiKeyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: config.security.rateLimit.max * 10,
  standardHeaders: config.security.rateLimit.standardHeaders,
  legacyHeaders: config.security.rateLimit.legacyHeaders,
  message: 'API rate limit exceeded. Please contact support.',
  statusCode: 429,
  skipFailedRequests: true,
});

export const ipLimiter = rateLimit({
  windowMs: config.security.rateLimit.windowMs,
  max: config.security.rateLimit.max / 2,
  standardHeaders: config.security.rateLimit.standardHeaders,
  legacyHeaders: config.security.rateLimit.legacyHeaders,
  message: 'Too many requests from this IP, please try again later.',
  statusCode: 429,
  skipFailedRequests: true,
});

// CORS configuration
const corsOptions = {
  origin: config.security.cors.origin,
  methods: config.security.cors.methods.split(','),
  allowedHeaders: config.security.cors.headers.split(','),
  credentials: true,
  optionsSuccessStatus: 204,
};

// Security middleware configuration
export const configureSecurity = (app: express.Application): void => {
  // Apply security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "http:"],
        styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: ["'self'", "https:", "http:"],
        fontSrc: ["'self'", "https:", "http:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", "https:", "http:"],
        frameSrc: ["'self'", "https:", "http:"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // XSS protection
  app.use(xss());
  
  // CSRF protection
  app.use(csurf(config.security.csrf));
  
  // CORS configuration
  app.use(cors(corsOptions));

  // Authentication middleware
  app.use('/api/auth', authMiddleware);
  app.use('/api/protected', authMiddleware);
  app.use('/api/refresh', refreshTokenMiddleware);
};

// Rate limiting middleware configuration
export const configureRateLimiting = (app: express.Application): void => {
  app.use('/api/v1', limiter);
  app.use('/api/v1/auth', authLimiter);
  app.use('/api/v1', apiKeyLimiter);
  app.use('/api/v1', ipLimiter);
};

export default {
  configureSecurity,
  configureRateLimiting,
  corsOptions,
};
