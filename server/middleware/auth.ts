import { Request, Response, NextFunction } from "express";
import { AppError } from "./error-handler";
import { rateLimit } from "express-rate-limit";
import { logger } from "../utils/logger";

// Extend Express.Session interface
declare module 'express-session' {
  interface SessionData {
    lastActivity: Date;
  }
}

// Rate limiting middleware for authentication routes
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many authentication attempts, please try again later"
});

// Session configuration with secure defaults
export const sessionConfig = {
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict' as const
  },
  rolling: true,
  resave: false,
  saveUninitialized: false
};

// Enhanced authentication middleware with logging
export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    logger.warn(`Unauthenticated access attempt from IP: ${req.ip}`);
    throw new AppError("Not authenticated", 401);
  }

  // Update last activity timestamp
  if (req.session) {
    req.session.lastActivity = new Date();
  }

  next();
};

// Role-based middleware
export const requireAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || req.user?.role !== "admin") {
    logger.warn(`Unauthorized admin access attempt from IP: ${req.ip}, User: ${req.user?.id}`);
    throw new AppError("Admin access required", 403);
  }
  next();
};

export const requireClient = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || req.user?.role !== "client") {
    logger.warn(`Unauthorized client access attempt from IP: ${req.ip}, User: ${req.user?.id}`);
    throw new AppError("Client access required", 403);
  }
  next();
};

// Session timeout checker
export const checkSessionTimeout = (req: Request, _res: Response, next: NextFunction) => {
  if (req.session && req.session.lastActivity) {
    const inactiveTime = Date.now() - new Date(req.session.lastActivity).getTime();
    if (inactiveTime > sessionConfig.cookie.maxAge) {
      logger.info(`Session timeout for user: ${req.user?.id}`);
      req.logout(err => {
        if (err) {
          logger.error(`Error during logout: ${err}`);
        }
      });
      throw new AppError("Session expired", 440);
    }
  }
  next();
};