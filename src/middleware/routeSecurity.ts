import { Request, Response, NextFunction } from 'express';
import { CustomError } from '../utils/errors';
import { securityLogger } from '../utils/securityLogger';
import { sanitizeInput } from '../utils/sanitizer';
import { validateRequest } from '../utils/validation';

interface RouteSecurityConfig {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  rateLimit?: {
    windowMs: number;
    max: number;
  };
  validationSchema?: {
    body?: any;
    query?: any;
    params?: any;
    headers?: any;
  };
  sanitize?: {
    body?: boolean;
    query?: boolean;
    params?: boolean;
    headers?: boolean;
  };
}

export function secureRoute(config: RouteSecurityConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Rate limiting
      if (config.rateLimit) {
        const rateLimiter = require('express-rate-limit');
        const limiter = rateLimiter(config.rateLimit);
        await new Promise((resolve, reject) => {
          limiter(req, res, (error: any) => {
            if (error) reject(error);
            else resolve(true);
          });
        });
      }

      // Authentication
      if (config.requireAuth) {
        if (!req.user) {
          throw new CustomError(
            'Authentication required',
            'AUTH_REQUIRED',
            401
          );
        }
      }

      // Admin access
      if (config.requireAdmin) {
        if (!req.user || !req.user.isAdmin) {
          throw new CustomError(
            'Admin access required',
            'ADMIN_REQUIRED',
            403
          );
        }
      }

      // Input validation
      if (config.validationSchema) {
        await validateRequest(config.validationSchema)(req, res, next);
      }

      // Input sanitization
      if (config.sanitize) {
        sanitizeInput(config.sanitize)(req, res, next);
      }

      next();
    } catch (error) {
      securityLogger.error('Route security error', {
        error: error.message,
        path: req.path,
        method: req.method,
        ipAddress: req.ip,
      });
      next(error);
    }
  };
}
