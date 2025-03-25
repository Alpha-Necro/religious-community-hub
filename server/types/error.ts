import HttpStatus from 'http-status-codes';

/**
 * Interface for error details that can be included in error responses.
 * Details should be serializable and contain relevant error information.
 */
export interface ErrorDetails {
  [key: string]: string | number | boolean | null | undefined;
  retryCount?: number | null;
  maxRetries?: number | null;
}

/**
 * Interface representing a standardized error in the application.
 * All errors in the system should implement this interface.
 */
export interface AppError {
  /** A human-readable message describing the error */
  message: string;
  /** HTTP status code corresponding to the error type */
  status: number;
  /** Unique error code for identification */
  code: string;
  /** Additional error details (optional) */
  details?: ErrorDetails;
  /** Error category to classify the type of error */
  category: ErrorCategory;
  /** Context information about the error occurrence (optional) */
  context?: ErrorContext;
  /** Timestamp of when the error occurred */
  timestamp: string;
}

/**
 * Enum representing different categories of errors in the application.
 * Each category helps in classifying and handling errors appropriately.
 */
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
  LOGGING = 'LOGGING'
}

/**
 * Interface for contextual information that can be attached to errors.
 * This information helps in debugging and tracing error occurrences.
 */
export interface ErrorContext {
  /** Unique request identifier */
  requestId?: string;
  /** User identifier associated with the error */
  userId?: string;
  /** Session identifier */
  sessionId?: string;
  /** IP address of the client */
  ipAddress?: string;
  /** User agent string */
  userAgent?: string;
  /** Operation identifier */
  operationId?: string;
  /** Correlation identifier for distributed tracing */
  correlationId?: string;
  /** Transaction identifier */
  transactionId?: string;
  /** Service identifier */
  serviceId?: string;
  /** Component identifier */
  componentId?: string;
  /** Environment name */
  environment?: string;
  /** Region identifier */
  region?: string;
  /** Deployment identifier */
  deploymentId?: string;
  /** Application version */
  version?: string;
  /** Timestamp of the error occurrence */
  timestamp?: string;
}

/**
 * Utility function to validate if a status code is appropriate for a given error category.
 */
function isValidStatusCodeForCategory(status: number, category: ErrorCategory): boolean {
  switch (category) {
    case ErrorCategory.VALIDATION:
      return status === HttpStatus.BAD_REQUEST;
    case ErrorCategory.AUTHENTICATION:
      return status === HttpStatus.UNAUTHORIZED;
    case ErrorCategory.AUTHORIZATION:
      return status === HttpStatus.FORBIDDEN;
    case ErrorCategory.NOT_FOUND:
      return status === HttpStatus.NOT_FOUND;
    case ErrorCategory.CONFLICT:
      return status === HttpStatus.CONFLICT;
    case ErrorCategory.RATE_LIMIT:
      return status === HttpStatus.TOO_MANY_REQUESTS;
    case ErrorCategory.SERVICE_UNAVAILABLE:
      return status === HttpStatus.SERVICE_UNAVAILABLE;
    case ErrorCategory.MAINTENANCE:
      return status === HttpStatus.SERVICE_UNAVAILABLE;
    case ErrorCategory.TIMEOUT:
      return status === HttpStatus.GATEWAY_TIMEOUT;
    default:
      return status >= 500 && status < 600; // Internal server errors
  }
}

/**
 * Base class for all application errors.
 * Implements the AppError interface and provides common functionality.
 */
export class BaseError extends Error implements AppError {
  message!: string;
  status!: number;
  code!: string;
  details?: ErrorDetails;
  category!: ErrorCategory;
  context?: ErrorContext;
  timestamp!: string;

  constructor(props: AppError) {
    super(props.message);
    Object.assign(this, props);
    this.name = this.constructor.name;
    this.timestamp = props.timestamp;

    if (!isValidStatusCodeForCategory(this.status, this.category)) {
      throw new Error(`Invalid status code ${this.status} for error category ${this.category}`);
    }
  }

  /**
   * Returns a JSON representation of the error suitable for API responses.
   */
  toJSON(): AppError {
    return {
      message: this.message,
      status: this.status,
      code: this.code,
      details: this.details,
      category: this.category,
      context: this.context,
      timestamp: this.timestamp
    };
  }
}

/**
 * Error class for validation failures.
 * Used when input data fails validation checks.
 */
export class ValidationError extends BaseError {
  constructor(message: string, details?: ErrorDetails, context?: ErrorContext) {
    super({
      message,
      status: HttpStatus.BAD_REQUEST,
      code: 'VALIDATION_ERROR',
      category: ErrorCategory.VALIDATION,
      details,
      context,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Error class for authentication failures.
 * Used when authentication credentials are invalid.
 */
export class AuthenticationError extends BaseError {
  constructor(message: string = 'Authentication failed', details?: ErrorDetails, context?: ErrorContext) {
    super({
      message,
      status: HttpStatus.UNAUTHORIZED,
      code: 'AUTHENTICATION_ERROR',
      category: ErrorCategory.AUTHENTICATION,
      details,
      context,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Error class for authorization failures.
 * Used when a user lacks permission to perform an action.
 */
export class AuthorizationError extends BaseError {
  constructor(message: string = 'Authorization failed', details?: ErrorDetails, context?: ErrorContext) {
    super({
      message,
      status: HttpStatus.FORBIDDEN,
      code: 'AUTHORIZATION_ERROR',
      category: ErrorCategory.AUTHORIZATION,
      details,
      context,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Error class for resource not found scenarios.
 * Used when a requested resource does not exist.
 */
export class NotFoundError extends BaseError {
  constructor(message: string = 'Resource not found', details?: ErrorDetails, context?: ErrorContext) {
    super({
      message,
      status: HttpStatus.NOT_FOUND,
      code: 'NOT_FOUND',
      category: ErrorCategory.NOT_FOUND,
      details,
      context,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Error class for service availability issues.
 * Used when a service is temporarily unavailable.
 */
export class ServiceUnavailableError extends BaseError {
  constructor(message: string = 'Service temporarily unavailable', details?: ErrorDetails, context?: ErrorContext) {
    super({
      message,
      status: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'SERVICE_UNAVAILABLE',
      category: ErrorCategory.SERVICE_UNAVAILABLE,
      details,
      context,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Error class for transient errors with retry logic.
 * Used for errors that might resolve on their own after a retry.
 */
export class TransientError extends BaseError {
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
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Returns true if the error should be retried.
   */
  shouldRetry(): boolean {
    if (!this.details) return false;
    const retryCount = this.details.retryCount ?? 0;
    const maxRetries = this.details.maxRetries ?? 3;
    return retryCount < maxRetries;
  }
}

/**
 * Error class for rate limiting scenarios.
 * Used when a client exceeds their request rate limit.
 */
export class RateLimitError extends BaseError {
  constructor(message: string = 'Rate limit exceeded', details?: ErrorDetails, context?: ErrorContext) {
    super({
      message,
      status: HttpStatus.TOO_MANY_REQUESTS,
      code: 'RATE_LIMIT_ERROR',
      category: ErrorCategory.RATE_LIMIT,
      details,
      context,
      timestamp: new Date().toISOString()
    });
  }
}
