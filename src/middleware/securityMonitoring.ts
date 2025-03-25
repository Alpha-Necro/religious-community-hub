import { Request, Response, NextFunction } from 'express';
import { CustomError } from '../utils/errors';
import { securityLogger } from '../utils/securityLogger';

interface SecurityMetrics {
  requestCount: number;
  errorCount: number;
  blockedRequests: number;
  suspiciousActivities: number;
  lastReset: Date;
}

const securityMetrics: SecurityMetrics = {
  requestCount: 0,
  errorCount: 0,
  blockedRequests: 0,
  suspiciousActivities: 0,
  lastReset: new Date(),
};

// Reset metrics every hour
setInterval(() => {
  securityMetrics.requestCount = 0;
  securityMetrics.errorCount = 0;
  securityMetrics.blockedRequests = 0;
  securityMetrics.suspiciousActivities = 0;
  securityMetrics.lastReset = new Date();
}, 3600000); // 1 hour

export function securityMonitoringMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  securityMetrics.requestCount++;

  // Check for suspicious patterns
  const isSuspicious = checkForSuspiciousActivity(req);
  if (isSuspicious) {
    securityMetrics.suspiciousActivities++;
    securityLogger.warn('Suspicious activity detected', {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      path: req.path,
      method: req.method,
    });
  }

  res.on('finish', () => {
    if (res.statusCode >= 400) {
      securityMetrics.errorCount++;
    }
  });

  next();
}

function checkForSuspiciousActivity(req: Request): boolean {
  const suspiciousPatterns = [
    /\b(select|update|delete|drop|insert|alter|create|grant|revoke)\b/gi,
    /<script[^>]*>.*?<\/script>/gi,
    /on\w+\s*=\s*['"]?[^>]*['"]?/gi,
    /\bunion\b.*\bselect\b/gi,
    /\bexec\b.*\bmaster\b.*\badd\b.*\blogin\b/gi,
    /\bdeclare\b.*\b@\w+\b.*\bvarchar\b.*\bexec\b/gi,
  ];

  const checkObject = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(obj));
    }
    if (obj && typeof obj === 'object') {
      return Object.values(obj).some(checkObject);
    }
    return false;
  };

  return (
    checkObject(req.body) ||
    checkObject(req.query) ||
    checkObject(req.params) ||
    checkObject(req.headers)
  );
}

export function getSecurityMetrics(): SecurityMetrics {
  return {
    ...securityMetrics,
    lastReset: new Date(), // Return current time for freshness
  };
}
