import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types/error';
import { monitoringService } from '../services/monitoringService';
import { ErrorFactory } from '../factories/errorFactory';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  // Log error details
  monitoringService.trackError(err, req, res);

  // Create error response using error factory
  let errorResponse;
  if (err instanceof AppError) {
    errorResponse = {
      message: err.message,
      status: err.status,
      code: err.code,
      details: err.details,
    };
  } else {
    // Create a generic error response for unknown errors
    errorResponse = ErrorFactory.createError(
      'An unexpected error occurred',
      500,
      'INTERNAL_SERVER_ERROR',
    );
  }

  // Get user's language preference from request headers
  const lang = req.headers['accept-language'] || 'en';

  // Use localization service to get translated error message
  const translatedErrorMessage = monitoringService.getErrorMessage(errorResponse.code, lang);

  // Send error response with translated error message
  res.status(errorResponse.status).json({
    ...errorResponse,
    message: translatedErrorMessage,
  });
};

// Request validation middleware
export const requestValidator = (req: Request, res: Response, next: NextFunction): void => {
  // Validate request body size
  const bodySize = JSON.stringify(req.body).length;
  if (bodySize > monitoringService.getMaxRequestBodySize()) {
    return next(
      ErrorFactory.createValidationError('Request body too large', {
        maxSize: monitoringService.getMaxRequestBodySize(),
        actualSize: bodySize,
      }),
    );
  }

  // Validate request headers
  if (!req.headers['content-type']?.includes('application/json')) {
    return next(ErrorFactory.createValidationError('Invalid content type'));
  }

  // Validate request parameters
  const requiredParams = monitoringService.getRequiredParams(req.path);
  const missingParams = requiredParams.filter((param) => !req.body[param]);

  if (missingParams.length > 0) {
    return next(
      ErrorFactory.createValidationError('Missing required parameters', { missing: missingParams }),
    );
  }

  next();
};
