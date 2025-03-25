import { Request, Response, NextFunction } from 'express';
import { CustomError } from './errors';

interface SanitizeConfig {
  body?: boolean;
  query?: boolean;
  params?: boolean;
  headers?: boolean;
}

const defaultConfig: SanitizeConfig = {
  body: true,
  query: true,
  params: true,
  headers: false,
};

export function sanitizeInput(config: SanitizeConfig = defaultConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (config.body) {
        req.body = sanitizeObject(req.body);
      }
      if (config.query) {
        req.query = sanitizeObject(req.query);
      }
      if (config.params) {
        req.params = sanitizeObject(req.params);
      }
      if (config.headers) {
        req.headers = sanitizeObject(req.headers);
      }
      next();
    } catch (error) {
      next(new CustomError('Failed to sanitize input', 'SANITIZATION_ERROR', 500));
    }
  };
}

function sanitizeObject(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeString(key);
    sanitized[sanitizedKey] = sanitizeValue(value);
  }

  return sanitized;
}

function sanitizeString(str: string): string {
  if (typeof str !== 'string') return str;

  // Remove control characters
  str = str.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  
  // Remove HTML tags
  str = str.replace(/<[^>]*>/g, '');
  
  // Remove SQL injection attempts
  str = str.replace(/(\b(select|update|delete|drop|insert|alter|create|grant|revoke)\b)/gi, '');
  
  // Remove script tags
  str = str.replace(/<script[^>]*>.*?<\/script>/gi, '');
  
  // Remove XSS attempts
  str = str.replace(/on\w+\s*=\s*['"]?[^>]*['"]?/gi, '');
  
  return str.trim();
}

function sanitizeValue(value: any): any {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (typeof value === 'object' && value !== null) {
    return sanitizeObject(value);
  }

  if (typeof value === 'string') {
    return sanitizeString(value);
  }

  return value;
}
