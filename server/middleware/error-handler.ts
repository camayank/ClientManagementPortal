import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error:', {
    error: err,
    requestId: req.id,
    path: req.path,
    method: req.method,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      errors: err.errors,
    });
  }

  // Handle known operational errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  // Handle unknown errors
  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }

  // Development error response with stack trace
  return res.status(500).json({
    status: 'error',
    message: err.message,
    stack: err.stack,
  });
};

// Handle unhandled rejections and exceptions
process.on('unhandledRejection', (err: Error) => {
  logger.error('Unhandled Rejection:', err);
  // Give the server time to process existing requests before shutting down
  process.exit(1);
});

process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});
