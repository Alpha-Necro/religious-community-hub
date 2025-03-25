import express from 'express';
import { Request, Response, NextFunction } from 'express';
import { configManager } from './configManager';
import { performanceMonitor } from '../services/performanceMonitor';
import { ipAccessControlService } from '../services/ipAccessControlService';
import { securityAlertService } from '../services/securityAlertService';
import { requestSanitizer } from '../middleware/requestSanitizer';
import { errorHandler } from '../middleware/errorHandler';
import { securityMiddleware, rateLimitMiddleware, corsMiddleware, authenticationMiddleware } from '../middleware/securityMiddleware';

// Define custom request type
type CustomRequest = Request & {
  user?: {
    id: string;
  };
  version?: string;
};

// Performance monitoring middleware
export const configurePerformanceMonitoring = (app: express.Application): void => {
  app.use((req: any, res: Response, next: NextFunction) => {
    const startTime = performance.now();

    // Store the original end method
    const originalEnd = res.end;
    
    // Override the end method to measure response time
    res.end = function (this: Response, chunk?: any, encoding?: BufferEncoding, cb?: () => void) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      performanceMonitor.updateMetrics(responseTime);

      // Log performance metrics
      const threshold = configManager.get<number>('api.responseTimeThreshold');
      if (threshold && responseTime > threshold) {
        performanceMonitor.createAlert({
          title: 'Performance Alert',
          description: `Slow response time for route: ${req.path}`,
          severity: 'WARNING',
          type: 'PERFORMANCE_ALERT',
          metadata: {
            route: req.path,
            responseTime: responseTime,
          },
        });
      }

      // Call the original end method
      return originalEnd.apply(this, arguments as any);
    } as Response['end'];

    next();
  });
};

// IP access control middleware
export const configureIPAccessControl = (app: express.Application): void => {
  app.use((req: any, res: Response, next: NextFunction) => {
    const ip = req.ip || req.connection.remoteAddress;
    
    if (!ip) {
      return next();
    }

    try {
      const isAllowed = ipAccessControlService.checkIP(ip);
      
      if (!isAllowed) {
        securityAlertService.createAlert({
          title: 'IP Access Denied',
          description: `Access denied from IP: ${ip}`,
          severity: 'HIGH',
          type: 'IP_ACCESS_DENIED',
          metadata: { ip },
        });
        
        return res.status(403).json({
          message: 'Access denied',
          code: 'IP_ACCESS_DENIED'
        });
      }

      next();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      securityAlertService.createAlert({
        title: 'IP Access Control Error',
        description: `Error checking IP: ${ip}`,
        severity: 'ERROR',
        type: 'IP_ACCESS_CONTROL_ERROR',
        metadata: { ip, error: errorMessage },
      });
      
      next(error);
    }
  });
};

// Request sanitization middleware
export const configureRequestSanitization = (app: express.Application): void => {
  app.use(requestSanitizer);
};

// Error handling middleware
export const configureErrorHandling = (app: express.Application): void => {
  app.use(errorHandler);
};

// API versioning middleware
export const configureAPIVersioning = (app: express.Application): void => {
  app.use((req: any, res: Response, next: NextFunction) => {
    const versionHeader = req.headers['api-version'];
    const version = Array.isArray(versionHeader) ? versionHeader[0] : versionHeader || '1.0';
    req.version = version;
    next();
  });
};

// Security middleware configuration
export const configureSecurityMiddleware = (app: express.Application): void => {
  // Apply security headers
  app.use(securityMiddleware);
  
  // Apply rate limiting
  app.use(rateLimitMiddleware);
  
  // Apply CORS configuration
  app.use(corsMiddleware);
  
  // Apply authentication for protected routes
  app.use('/api/protected', authenticationMiddleware);
};

export default {
  configurePerformanceMonitoring,
  configureIPAccessControl,
  configureRequestSanitization,
  configureErrorHandling,
  configureAPIVersioning,
  configureSecurityMiddleware
};
