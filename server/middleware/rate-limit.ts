import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

interface CustomResponse extends Response {
  retryAfter?: number;
}

const getClientIp = (req: Request): string => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    return Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
  }
  return req.socket.remoteAddress || 'unknown';
};

const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message: string;
  skipSuccessfulRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests,
    keyGenerator: getClientIp,
    handler: (req: Request, res: CustomResponse) => {
      res.retryAfter = Math.ceil(options.windowMs / 1000);
      res.status(429).json({
        error: options.message,
        retryAfter: res.retryAfter,
      });
    },
    skip: (req: Request) => {
      // Skip rate limiting for internal requests (e.g., health checks)
      const internalHeader = req.headers['x-internal-request'];
      return internalHeader === process.env.INTERNAL_REQUEST_KEY;
    },
  });
};

// General API rate limiter - More lenient
export const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

// Strict limiter for authentication endpoints
export const authLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many login attempts from this IP, please try again after an hour',
  skipSuccessfulRequests: true, // Don't count successful logins against the limit
});

// Specific limiter for file upload endpoints
export const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'File upload limit reached, please try again after an hour',
});

// Task creation/update limiter
export const taskLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30,
  message: 'Too many task operations, please try again in 5 minutes',
});

// Document operations limiter
export const documentLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20,
  message: 'Too many document operations, please try again in 5 minutes',
});

// User management operations limiter
export const userManagementLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: 'Too many user management operations, please try again in 15 minutes',
});