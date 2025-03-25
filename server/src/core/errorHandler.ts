import { AppError, ErrorDetails, ErrorCode, ErrorCategory } from './errorTypes';
import { securityAuditService } from '../services/securityAuditService';
import { performanceMonitor } from '../services/performanceMonitor';
import { websocketServer } from '../services/websocketServer';

interface WebSocketServerManager {
  broadcastError(error: AppError): void;
}

export class ErrorHandler {
  private static instance: ErrorHandler;

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  public handleError(error: Error): ErrorDetails {
    const details = this.getErrorDetails(error);
    
    // Log to security audit service
    securityAuditService.logSystemEvent(
      details.code,
      {
        error: details.message,
        category: details.category,
        severity: details.severity,
        context: details.context,
      },
      details.severity.toLowerCase() as 'error' | 'info' | 'warning' | 'critical'
    );

    // Update performance metrics
    performanceMonitor.updateMetrics({
      errors: {
        total: (performanceMonitor.metrics.errors?.total ?? 0) + 1,
        byType: {
          ...performanceMonitor.metrics.errors?.byType,
          [details.code]: (performanceMonitor.metrics.errors?.byType?.[details.code] ?? 0) + 1,
        },
        byCategory: {
          ...performanceMonitor.metrics.errors?.byCategory,
          [details.category]: (performanceMonitor.metrics.errors?.byCategory?.[details.category] ?? 0) + 1,
        },
      },
    });

    // Broadcast critical errors to connected clients
    if (details.severity === 'CRITICAL') {
      websocketServer.broadcastError(details);
    }

    return details;
  }

  private getErrorDetails(error: Error): ErrorDetails {
    if (error instanceof AppError) {
      return error.toDetails();
    }

    // Convert generic Error to AppError
    const code = this.determineErrorCode(error.message);
    const category = this.determineErrorCategory(code);
    const severity = this.determineErrorSeverity(error);

    return {
      code,
      message: error.message,
      category,
      severity,
      timestamp: new Date().toISOString(),
      context: {
        name: error.name,
        stack: error.stack,
      },
      stack: error.stack,
    };
  }

  private determineErrorCode(message: string): ErrorCode {
    // Add more specific error code determination logic here
    if (message.includes('Redis')) {
      return ErrorCode.REDIS_OPERATION;
    }
    if (message.includes('Database')) {
      return ErrorCode.DB_QUERY;
    }
    if (message.includes('Authentication')) {
      return ErrorCode.SECURITY_AUTHENTICATION;
    }
    return ErrorCode.UNKNOWN;
  }

  private determineErrorCategory(code: ErrorCode): ErrorCategory {
    switch (code) {
      case ErrorCode.REDIS_CONNECTION:
      case ErrorCode.REDIS_OPERATION:
      case ErrorCode.REDIS_TIMEOUT:
      case ErrorCode.REDIS_AUTH:
        return ErrorCategory.DATABASE;

      case ErrorCode.DB_CONNECTION:
      case ErrorCode.DB_QUERY:
      case ErrorCode.DB_CONSTRAINT:
        return ErrorCategory.DATABASE;

      case ErrorCode.CACHE_MISS:
      case ErrorCode.CACHE_TIMEOUT:
      case ErrorCode.CACHE_STORE:
        return ErrorCategory.CACHE;

      case ErrorCode.SECURITY_AUTHENTICATION:
      case ErrorCode.SECURITY_AUTHORIZATION:
      case ErrorCode.SECURITY_PERMISSION:
      case ErrorCode.SECURITY_RATE_LIMIT:
        return ErrorCategory.SECURITY;

      case ErrorCode.MAINTENANCE_MODE:
      case ErrorCode.MAINTENANCE_RECOVERY:
        return ErrorCategory.MAINTENANCE;

      case ErrorCode.VALIDATION_SCHEMA:
      case ErrorCode.VALIDATION_TYPE:
      case ErrorCode.VALIDATION_REQUIRED:
      case ErrorCode.VALIDATION_FORMAT:
        return ErrorCategory.VALIDATION;

      default:
        return ErrorCategory.SYSTEM;
    }
  }

  private determineErrorSeverity(error: Error): 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' {
    if (error instanceof AppError) {
      return error.severity;
    }

    // Determine severity based on error type
    if (error.name === 'TimeoutError') {
      return 'WARNING';
    }
    if (error.name === 'ValidationError') {
      return 'WARNING';
    }
    if (error.name === 'AuthenticationError') {
      return 'ERROR';
    }
    if (error.name === 'AuthorizationError') {
      return 'ERROR';
    }
    if (error.name === 'CriticalError') {
      return 'CRITICAL';
    }
    return 'ERROR';
  }
}

export const errorHandler = ErrorHandler.getInstance();
