import { AppError } from '../types/error';
import { v4 as uuidv4 } from 'uuid';
import i18n from '../i18n'; // Import i18n instance

export class ValidationError extends Error {
  validationErrors: Array<{
    field: string;
    message: string;
  }>;

  constructor(
    validationErrors: Array<{
      field: string;
      message: string;
    }>,
  ) {
    super(i18n.t('validationFailed')); // Use i18n to translate error message
    this.validationErrors = validationErrors;
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = i18n.t('authenticationRequired')) {
    // Use i18n to translate error message
    super(message);
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = i18n.t('unauthorizedAccess')) {
    // Use i18n to translate error message
    super(message);
  }
}

export class NotFoundError extends Error {
  resource: string;

  constructor(resource: string, message: string = i18n.t('resourceNotFound', { resource })) {
    // Use i18n to translate error message
    super(message);
    this.resource = resource;
  }
}

export class BadRequestError extends Error {
  validationErrors?: Array<{
    field: string;
    message: string;
  }>;

  constructor(
    message: string = i18n.t('badRequest'),
    validationErrors?: Array<{
      field: string;
      message: string;
    }>,
  ) {
    super(message);
    this.validationErrors = validationErrors;
  }
}

export class InternalServerError extends Error {
  errorId: string;

  constructor(message: string = i18n.t('internalServerError'), errorId?: string) {
    // Use i18n to translate error message
    super(message);
    this.errorId = errorId || uuidv4();
  }
}

export const createError = (error: Error, locale: string): AppError => {
  // Add locale parameter
  i18n.locale = locale; // Set locale for i18n instance

  if (error instanceof ValidationError) {
    return {
      message: error.message,
      status: 400,
      code: 'VALIDATION_ERROR',
      timestamp: new Date().toISOString(),
      validationErrors: error.validationErrors,
    };
  } else if (error instanceof AuthenticationError) {
    return {
      message: error.message,
      status: 401,
      code: 'AUTHENTICATION_ERROR',
      timestamp: new Date().toISOString(),
      type: 'AUTHENTICATION_ERROR',
    };
  } else if (error instanceof AuthorizationError) {
    return {
      message: error.message,
      status: 403,
      code: 'AUTHORIZATION_ERROR',
      timestamp: new Date().toISOString(),
      type: 'AUTHORIZATION_ERROR',
    };
  } else if (error instanceof NotFoundError) {
    return {
      message: error.message,
      status: 404,
      code: 'NOT_FOUND',
      timestamp: new Date().toISOString(),
      type: 'NOT_FOUND',
      resource: error.resource,
    };
  } else if (error instanceof BadRequestError) {
    return {
      message: error.message,
      status: 400,
      code: 'BAD_REQUEST',
      timestamp: new Date().toISOString(),
      type: 'BAD_REQUEST',
      validationErrors: error.validationErrors,
    };
  } else if (error instanceof InternalServerError) {
    return {
      message: error.message,
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
      type: 'INTERNAL_SERVER_ERROR',
      errorId: error.errorId,
    };
  } else {
    const errorId = uuidv4();
    return {
      message: error.message,
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
      type: 'INTERNAL_SERVER_ERROR',
      errorId,
    };
  }
};

export default {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  BadRequestError,
  InternalServerError,
  createError,
};
