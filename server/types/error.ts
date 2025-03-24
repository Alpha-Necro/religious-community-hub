import { HttpStatus } from 'http-status-codes';

export interface ErrorDetails {
  [key: string]: any;
}

export interface AppError {
  message: string;
  status: number;
  code: string;
  details?: any;
  category: ErrorCategory;
  context?: ErrorContext;
  timestamp: string;
}

export enum ErrorCategory {
  SYSTEM = 'SYSTEM',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL = 'INTERNAL',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMIT = 'RATE_LIMIT',
  MAINTENANCE = 'MAINTENANCE',
  SECURITY = 'SECURITY',
  RESOURCE_LIMIT = 'RESOURCE_LIMIT',
  TIMEOUT = 'TIMEOUT',
  NETWORK = 'NETWORK',
  DATABASE = 'DATABASE',
  CACHE = 'CACHE',
  CDN = 'CDN',
  QUEUE = 'QUEUE',
  CONFIGURATION = 'CONFIGURATION',
  VERSION = 'VERSION',
  DEPENDENCY = 'DEPENDENCY',
  ENCRYPTION = 'ENCRYPTION',
  BACKUP = 'BACKUP',
  REPLICATION = 'REPLICATION',
  DISTRIBUTED = 'DISTRIBUTED',
  CLUSTER = 'CLUSTER',
  CONTAINER = 'CONTAINER',
  SECURITY_POLICY = 'SECURITY_POLICY',
  COMPLIANCE = 'COMPLIANCE',
  AUDIT = 'AUDIT',
  MONITORING = 'MONITORING',
  LOGGING = 'LOGGING',
  CONFIG_DRIFT = 'CONFIG_DRIFT',
  VERSION_COMPATIBILITY = 'VERSION_COMPATIBILITY',
  DEPENDENCY_CONFLICT = 'DEPENDENCY_CONFLICT',
  ENCRYPTION_KEY = 'ENCRYPTION_KEY',
  BACKUP_CORRUPTION = 'BACKUP_CORRUPTION',
  SESSION_TIMEOUT = 'SESSION_TIMEOUT',
  CACHE_CONSISTENCY = 'CACHE_CONSISTENCY',
  QUEUE_OVERFLOW = 'QUEUE_OVERFLOW',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  LOAD_BALANCER = 'LOAD_BALANCER',
  CDN_CACHE_INVALIDATION = 'CDN_CACHE_INVALIDATION',
  REPLICATION_LAG = 'REPLICATION_LAG',
  DISTRIBUTED_PARTITION = 'DISTRIBUTED_PARTITION',
  CLUSTERING_CONFIG = 'CLUSTERING_CONFIG',
  CONTAINER_RESOURCE_LIMIT = 'CONTAINER_RESOURCE_LIMIT',
  CLOUD_API = 'CLOUD_API',
  INFRASTRUCTURE_CAPACITY = 'INFRASTRUCTURE_CAPACITY',
  SECURITY_POLICY_ENFORCEMENT = 'SECURITY_POLICY_ENFORCEMENT',
  COMPLIANCE_VALIDATION = 'COMPLIANCE_VALIDATION',
  AUDIT_LOG_PROCESSING = 'AUDIT_LOG_PROCESSING',
  MONITORING_DATA_COLLECTION = 'MONITORING_DATA_COLLECTION',
  LOGGING_CONFIG = 'LOGGING_CONFIG',
  CONFIG_DRIFT_VALIDATION = 'CONFIG_DRIFT_VALIDATION',
  VERSION_COMPATIBILITY_VALIDATION = 'VERSION_COMPATIBILITY_VALIDATION',
  DEPENDENCY_CONFLICT_VALIDATION = 'DEPENDENCY_CONFLICT_VALIDATION',
  ENCRYPTION_KEY_VALIDATION = 'ENCRYPTION_KEY_VALIDATION',
  BACKUP_CORRUPTION_VALIDATION = 'BACKUP_CORRUPTION_VALIDATION',
  SESSION_TIMEOUT_VALIDATION = 'SESSION_TIMEOUT_VALIDATION',
  CACHE_CONSISTENCY_VALIDATION = 'CACHE_CONSISTENCY_VALIDATION',
  QUEUE_OVERFLOW_VALIDATION = 'QUEUE_OVERFLOW_VALIDATION',
  API_RATE_LIMIT_VALIDATION = 'API_RATE_LIMIT_VALIDATION',
  LOAD_BALANCER_HEALTH_CHECK = 'LOAD_BALANCER_HEALTH_CHECK',
  CDN_CACHE_INVALIDATION_VALIDATION = 'CDN_CACHE_INVALIDATION_VALIDATION',
  REPLICATION_LAG_VALIDATION = 'REPLICATION_LAG_VALIDATION',
  DISTRIBUTED_PARTITION_VALIDATION = 'DISTRIBUTED_PARTITION_VALIDATION',
  CLUSTERING_CONFIG_VALIDATION = 'CLUSTERING_CONFIG_VALIDATION',
  CONTAINER_RESOURCE_LIMIT_VALIDATION = 'CONTAINER_RESOURCE_LIMIT_VALIDATION',
  CLOUD_API_VALIDATION = 'CLOUD_API_VALIDATION',
  INFRASTRUCTURE_CAPACITY_VALIDATION = 'INFRASTRUCTURE_CAPACITY_VALIDATION',
  SECURITY_POLICY_ENFORCEMENT_VALIDATION = 'SECURITY_POLICY_ENFORCEMENT_VALIDATION',
  COMPLIANCE_VALIDATION_VALIDATION = 'COMPLIANCE_VALIDATION_VALIDATION',
  AUDIT_LOG_PROCESSING_VALIDATION = 'AUDIT_LOG_PROCESSING_VALIDATION',
  MONITORING_DATA_COLLECTION_VALIDATION = 'MONITORING_DATA_COLLECTION_VALIDATION',
  LOGGING_CONFIG_VALIDATION = 'LOGGING_CONFIG_VALIDATION',
  CONFIG_DRIFT_VALIDATION_VALIDATION = 'CONFIG_DRIFT_VALIDATION_VALIDATION',
  VERSION_COMPATIBILITY_VALIDATION_VALIDATION = 'VERSION_COMPATIBILITY_VALIDATION_VALIDATION',
  DEPENDENCY_CONFLICT_VALIDATION_VALIDATION = 'DEPENDENCY_CONFLICT_VALIDATION_VALIDATION',
  ENCRYPTION_KEY_VALIDATION_VALIDATION = 'ENCRYPTION_KEY_VALIDATION_VALIDATION',
  BACKUP_CORRUPTION_VALIDATION_VALIDATION = 'BACKUP_CORRUPTION_VALIDATION_VALIDATION',
  SESSION_TIMEOUT_VALIDATION_VALIDATION = 'SESSION_TIMEOUT_VALIDATION_VALIDATION',
  CACHE_CONSISTENCY_VALIDATION_VALIDATION = 'CACHE_CONSISTENCY_VALIDATION_VALIDATION',
  QUEUE_OVERFLOW_VALIDATION_VALIDATION = 'QUEUE_OVERFLOW_VALIDATION_VALIDATION',
  API_RATE_LIMIT_VALIDATION_VALIDATION = 'API_RATE_LIMIT_VALIDATION_VALIDATION',
  LOAD_BALANCER_HEALTH_CHECK_VALIDATION = 'LOAD_BALANCER_HEALTH_CHECK_VALIDATION',
}

export interface ErrorContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  operationId?: string;
  correlationId?: string;
  transactionId?: string;
  serviceId?: string;
  componentId?: string;
  environment?: string;
  region?: string;
  deploymentId?: string;
  version?: string;
  timestamp?: string;
  [key: string]: any;
}

export class AppError implements AppError {
  constructor(props: AppError) {
    Object.assign(this, props);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: ErrorDetails, context?: ErrorContext) {
    super({
      message,
      status: HttpStatus.BAD_REQUEST,
      code: 'VALIDATION_ERROR',
      category: ErrorCategory.VALIDATION,
      details,
      context,
      timestamp: new Date().toISOString(),
    });
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', details?: ErrorDetails, context?: ErrorContext) {
    super({
      message,
      status: HttpStatus.UNAUTHORIZED,
      code: 'AUTHENTICATION_ERROR',
      category: ErrorCategory.AUTHENTICATION,
      details,
      context,
      timestamp: new Date().toISOString(),
    });
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Authorization failed', details?: ErrorDetails, context?: ErrorContext) {
    super({
      message,
      status: HttpStatus.FORBIDDEN,
      code: 'AUTHORIZATION_ERROR',
      category: ErrorCategory.AUTHORIZATION,
      details,
      context,
      timestamp: new Date().toISOString(),
    });
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', details?: ErrorDetails, context?: ErrorContext) {
    super({
      message,
      status: HttpStatus.NOT_FOUND,
      code: 'NOT_FOUND',
      category: ErrorCategory.NOT_FOUND,
      details,
      context,
      timestamp: new Date().toISOString(),
    });
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable', details?: ErrorDetails, context?: ErrorContext) {
    super({
      message,
      status: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'SERVICE_UNAVAILABLE',
      category: ErrorCategory.SERVICE_UNAVAILABLE,
      details,
      context,
      timestamp: new Date().toISOString(),
    });
  }
}

export class TransientError extends AppError {
  constructor(
    message: string = 'Temporary error occurred',
    retryCount: number = 0,
    maxRetries: number = 3,
    details?: ErrorDetails,
    context?: ErrorContext,
  ) {
    super({
      message,
      status: HttpStatus.TOO_MANY_REQUESTS,
      code: 'TRANSIENT_ERROR',
      category: ErrorCategory.INTERNAL,
      details: {
        ...details,
        retryCount,
        maxRetries,
      },
      context,
      timestamp: new Date().toISOString(),
    });
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', details?: ErrorDetails, context?: ErrorContext) {
    super({
      message,
      status: HttpStatus.TOO_MANY_REQUESTS,
      code: 'RATE_LIMIT_ERROR',
      category: ErrorCategory.RATE_LIMIT,
      details,
      context,
      timestamp: new Date().toISOString(),
    });
  }
}
