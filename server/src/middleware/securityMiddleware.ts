import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { configManager } from '../config/configManager';

// Security headers configuration
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      reportUri: "/csp-report"
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false
});

// Rate limiting configuration
const rateLimiter = rateLimit({
  windowMs: configManager.get<number>('RATE_LIMIT_WINDOW') * 60 * 1000, // 15 minutes
  max: configManager.get<number>('RATE_LIMIT_MAX'), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// CORS configuration
const corsOptions = {
  origin: configManager.get<string>('CORS_ORIGIN'),
  methods: configManager.get<string>('CORS_METHODS').split(','),
  allowedHeaders: configManager.get<string>('CORS_HEADERS').split(','),
  credentials: configManager.get<boolean>('CORS_CREDENTIALS'),
  maxAge: configManager.get<number>('CORS_MAX_AGE'),
  exposeHeaders: configManager.get<string>('CORS_EXPOSE_HEADERS').split(','),
  allowPrivateNetwork: configManager.get<boolean>('CORS_ALLOW_PRIVATE_NETWORK')
};

// Security middleware
export const securityMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Apply security headers
  securityHeaders(req, res, next);
};

// Rate limit middleware
export const rateLimitMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Apply rate limiting
  rateLimiter(req, res, next);
};

// CORS middleware
export const corsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Apply CORS configuration
  cors(corsOptions)(req, res, next);
};

// Authentication middleware
export const authenticationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Add your token validation logic here
    // This is a placeholder - implement proper JWT validation
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};
