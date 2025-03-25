export class CustomError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean = true;
  public readonly details?: Record<string, any>;

  constructor(message: string, code: string, statusCode: number, details?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
