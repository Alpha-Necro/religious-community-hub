import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { setupSecurity } from './middleware/security.ts';
import { securityAuditMiddleware, securityErrorMiddleware } from './utils/securityLogger.ts';
import { securityMonitoringMiddleware } from './middleware/securityMonitoring.ts';
import userRoutes from './routes/userRoutes';
import { config } from './config/configManager';
import { initializeRedis } from './utils/redisHealthCheck';
import { logger } from './utils/logger';

class CustomError extends Error {
  public statusCode: number;
  public code: string;
  public details: any;

  constructor(message: string, statusCode: number, code: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

const app = express();

// Initialize Redis
initializeRedis()
  .then(isConnected => {
    if (isConnected) {
      logger.info('Redis connected successfully');
    } else {
      logger.warn('Redis connection failed. Some features may not work properly.');
    }
  })
  .catch(error => {
    logger.error('Redis initialization error:', error);
  });

// Security setup
setupSecurity(app);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(config.cors));

// Security monitoring
app.use(securityMonitoringMiddleware);

// Security audit logging
app.use(securityAuditMiddleware);

// Routes
app.use('/api', userRoutes);

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof CustomError) {
    res.status(err.statusCode).json({
      message: err.message,
      code: err.code,
      details: err.details,
    });
  } else {
    res.status(500).json({
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
});

const PORT = config.server.port;
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

export { app };
