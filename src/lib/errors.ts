export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ExternalAPIError extends AppError {
  constructor(message: string) {
    super(message, 502); // Bad Gateway
  }
}

export class CacheError extends AppError {
  constructor(message: string) {
    super(message, 500);
    this.isOperational = false;
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(message, 500);
    this.isOperational = false;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400); // Bad Request
  }
}
