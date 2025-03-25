export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class TransientError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = 'TransientError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = 'ServiceUnavailableError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}
