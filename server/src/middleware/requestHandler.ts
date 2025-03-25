import { Request, Response, NextFunction } from 'express';
import { performanceMonitor } from '../services/performanceMonitor';
import { monitoringService } from '../services/monitoringService';
import { databaseHealthCheck } from '../services/databaseHealthCheck';

export const requestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Start performance monitoring
    performanceMonitor.start();
    
    // Check cache first
    const cacheKey = `request:${req.method}:${req.path}`;
    const cachedResponse = await monitoringService.getCache(cacheKey);
    
    if (cachedResponse) {
      res.status(200).json(cachedResponse);
      return;
    }
    
    // Verify database connection
    await databaseHealthCheck.validateConnection();
    
    // Continue with request processing
    next();
  } catch (error) {
    next(error);
  }
};
