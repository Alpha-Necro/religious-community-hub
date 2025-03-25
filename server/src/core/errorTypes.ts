export enum ErrorCode {
  // General Errors
  UNKNOWN = 'ERR_UNKNOWN',
  TIMEOUT = 'ERR_TIMEOUT',
  NOT_FOUND = 'ERR_NOT_FOUND',
  INVALID_INPUT = 'ERR_INVALID_INPUT',
  BAD_REQUEST = 'ERR_BAD_REQUEST',
  UNAUTHORIZED = 'ERR_UNAUTHORIZED',
  FORBIDDEN = 'ERR_FORBIDDEN',
  INTERNAL_SERVER = 'ERR_INTERNAL_SERVER',

  // Redis Specific Errors
  REDIS_CONNECTION = 'ERR_REDIS_CONNECTION',
  REDIS_OPERATION = 'ERR_REDIS_OPERATION',
  REDIS_TIMEOUT = 'ERR_REDIS_TIMEOUT',
  REDIS_AUTH = 'ERR_REDIS_AUTH',

  // Database Errors
  DB_CONNECTION = 'ERR_DB_CONNECTION',
  DB_QUERY = 'ERR_DB_QUERY',
  DB_CONSTRAINT = 'ERR_DB_CONSTRAINT',

  // Cache Errors
  CACHE_MISS = 'ERR_CACHE_MISS',
  CACHE_TIMEOUT = 'ERR_CACHE_TIMEOUT',
  CACHE_STORE = 'ERR_CACHE_STORE',

  // Security Errors
  SECURITY_AUTHENTICATION = 'ERR_SECURITY_AUTHENTICATION',
  SECURITY_AUTHORIZATION = 'ERR_SECURITY_AUTHORIZATION',
  SECURITY_PERMISSION = 'ERR_SECURITY_PERMISSION',
  SECURITY_RATE_LIMIT = 'ERR_SECURITY_RATE_LIMIT',

  // Maintenance Errors
  MAINTENANCE_MODE = 'ERR_MAINTENANCE_MODE',
  MAINTENANCE_RECOVERY = 'ERR_MAINTENANCE_RECOVERY',

  // Request Validation Errors
  VALIDATION_SCHEMA = 'ERR_VALIDATION_SCHEMA',
  VALIDATION_TYPE = 'ERR_VALIDATION_TYPE',
  VALIDATION_REQUIRED = 'ERR_VALIDATION_REQUIRED',
  VALIDATION_FORMAT = 'ERR_VALIDATION_FORMAT',
}

export enum ErrorCategory {
  SYSTEM = 'SYSTEM',
  SECURITY = 'SECURITY',
  VALIDATION = 'VALIDATION',
  BUSINESS = 'BUSINESS',
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  UNAVAILABLE = 'UNAVAILABLE',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  RATE_LIMIT = 'RATE_LIMIT',
  MAINTENANCE = 'MAINTENANCE',
  CACHE = 'CACHE',
  DATABASE = 'DATABASE',
}

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  category: ErrorCategory;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  timestamp: string;
  context?: Record<string, unknown>;
  stack?: string;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly category: ErrorCategory;
  public readonly severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: ErrorCode,
    category: ErrorCategory,
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL',
    context?: Record<string, unknown>
  ) {
    super(message);
    this.code = code;
    this.category = category;
    this.severity = severity;
    this.context = context;
    this.name = 'AppError';

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  public toDetails(): ErrorDetails {
    return {
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      timestamp: new Date().toISOString(),
      context: this.context,
      stack: this.stack,
    };
  }
}
