export class CustomError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean = true;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }

  static isCustomError(error: unknown): error is CustomError {
    return error instanceof Error && 'isOperational' in error;
  }
}
