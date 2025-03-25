import { Request, Response, NextFunction } from 'express';
import { Logger } from './logger';
import { CustomError } from './errors';

const securityLogger = new Logger('Security');

interface SecurityAuditLog {
  timestamp: string;
  method: string;
  path: string;
  ipAddress: string;
  userAgent: string;
  status: number;
  responseTime: number;
  userId?: string;
  action: string;
  details?: Record<string, any>;
}

export function securityAuditMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startTime = Date.now();
  const auditLog: Partial<SecurityAuditLog> = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || 'unknown',
    action: 'REQUEST_RECEIVED',
  };

  res.on('finish', () => {
    auditLog.status = res.statusCode;
    auditLog.responseTime = Date.now() - startTime;

    if (req.user) {
      auditLog.userId = req.user.id;
    }

    securityLogger.info('Security Audit Log', auditLog);
  });

  next();
}

export function securityErrorMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (error instanceof CustomError) {
    const auditLog: SecurityAuditLog = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || 'unknown',
      status: error.statusCode,
      responseTime: 0, // Response time not available in error middleware
      userId: req.user?.id,
      action: 'ERROR_OCCURRED',
      details: {
        code: error.code,
        message: error.message,
      },
    };

    securityLogger.error('Security Error', auditLog);
  }

  next(error);
}
