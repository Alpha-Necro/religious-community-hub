import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ServiceUnavailableError,
  TransientError,
  RateLimitError,
} from '../types/error';

export class ErrorFactory {
  static createError(
    message: string,
    status: number = 500,
    code: string = 'INTERNAL_SERVER_ERROR',
    details?: Record<string, any>,
  ): AppError {
    return new AppError({
      message,
      status,
      code,
      details,
    });
  }

  static createValidationError(message: string, details?: Record<string, any>): ValidationError {
    return new ValidationError(message, details);
  }

  static createAuthenticationError(
    message: string = 'Authentication failed',
    details?: Record<string, any>,
  ): AuthenticationError {
    return new AuthenticationError(message, details);
  }

  static createAuthorizationError(
    message: string = 'Authorization failed',
    details?: Record<string, any>,
  ): AuthorizationError {
    return new AuthorizationError(message, details);
  }

  static createNotFoundError(
    message: string = 'Resource not found',
    details?: Record<string, any>,
  ): NotFoundError {
    return new NotFoundError(message, details);
  }

  static createServiceUnavailableError(
    message: string = 'Service temporarily unavailable',
    details?: Record<string, any>,
  ): ServiceUnavailableError {
    return new ServiceUnavailableError(message, details);
  }

  static createTransientError(
    message: string = 'Temporary error occurred',
    retryCount: number = 0,
    maxRetries: number = 3,
    details?: Record<string, any>,
  ): TransientError {
    return new TransientError(message, retryCount, maxRetries, details);
  }

  static createRateLimitError(
    message: string = 'Rate limit exceeded',
    details?: Record<string, any>,
  ): RateLimitError {
    return new RateLimitError(message, details);
  }
}
