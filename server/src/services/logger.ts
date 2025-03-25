import winston from 'winston';
import { config } from '../config/configManager';
import { performanceMonitor } from './performanceMonitor';

const { combine, timestamp, json, prettyPrint } = winston.format;

const logger = winston.createLogger({
  level: config.server.logLevel,
  format: combine(timestamp(), json()),
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add console transport in development mode
if (config.server.environment === 'development') {
  logger.add(
    new winston.transports.Console({
      format: combine(timestamp(), prettyPrint()),
    }),
  );
}

// Add performance monitoring
logger.add(
  new winston.transports.File({
    filename: 'logs/performance.log',
    level: 'info',
    format: combine(timestamp(), json()),
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
);

// Add security audit logging
logger.add(
  new winston.transports.File({
    filename: 'logs/security.log',
    level: 'info',
    format: combine(timestamp(), json()),
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
);

export const logPerformance = (req: any, res: any, duration: number): void => {
  logger.info('Performance metrics', {
    path: req.path,
    method: req.method,
    duration,
    timestamp: new Date().toISOString(),
    status: res.statusCode,
    responseSize: res.get('Content-Length'),
  });
};

export const logSecurityEvent = (type: string, details: any): void => {
  logger.info('Security event', {
    type,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

export const logError = (error: Error, context: any): void => {
  logger.error('Error occurred', {
    error: error.message,
    stack: error.stack,
    ...context,
    timestamp: new Date().toISOString(),
  });
};

export const logAudit = (action: string, details: any): void => {
  logger.info('Audit log', {
    action,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

export default logger;
