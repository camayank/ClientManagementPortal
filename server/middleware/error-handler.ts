import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import { Pool } from 'pg';

// Custom error class for application errors
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

// Middleware to ensure JSON responses
export const ensureJsonResponse = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Content-Type', 'application/json');
  next();
};

// Main error handler
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error details
  logger.error('Error:', {
    error: err,
    requestId: req.id,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    headers: req.headers,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      errors: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
    });
  }

  // Handle database errors
  if (err instanceof Pool.DatabaseError) {
    return res.status(500).json({
      status: 'error',
      message: 'Database error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }

  // Handle known operational errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message
    });
  }

  // Handle authentication errors
  if (err.name === 'UnauthorizedError' || err.message.toLowerCase().includes('unauthorized')) {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized access'
    });
  }

  // Handle unknown errors
  const statusCode = (err as any).statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  return res.status(statusCode).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err
    })
  });
};

// Handle unhandled rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('Unhandled Rejection:', err);
  // Give the server time to process existing requests before shutting down
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});