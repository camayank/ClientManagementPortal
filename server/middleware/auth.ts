import { Request, Response, NextFunction } from "express";
import { AppError } from "./error-handler";
import { rateLimit } from "express-rate-limit";
import winston from "winston";

// Setup logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/auth.log' })
  ]
});

// Rate limiting middleware
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many authentication attempts, please try again later"
});

// Session configuration
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

// Enhanced authentication middleware
export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    logger.warn(`Unauthenticated access attempt from IP: ${req.ip}`);
    throw new AppError("Not authenticated", 401);
  }

  // Update last activity
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

// Enhanced permission checking middleware
export const checkPermission = (resource: string, action: "read" | "write" | "delete") => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      logger.warn(`Permission check failed - no user found. IP: ${req.ip}`);
      throw new AppError("Not authenticated", 401);
    }

    // Admin has all permissions
    if (user.role === "admin") {
      logger.info(`Admin permission granted for ${resource}:${action}. User: ${user.id}`);
      return next();
    }

    // Client permissions are restricted
    if (user.role === "client") {
      // Clients can only access their own data
      const allowedResources = ["projects", "documents", "tasks", "messages"];
      const allowedActions = {
        projects: ["read", "write"],
        documents: ["read", "write"],
        tasks: ["read"],
        messages: ["read", "write"],
      };

      if (!allowedResources.includes(resource)) {
        logger.warn(`Client attempted to access forbidden resource. User: ${user.id}, Resource: ${resource}`);
        throw new AppError("Resource access denied", 403);
      }

      const resourceActions = allowedActions[resource as keyof typeof allowedActions];
      if (!resourceActions?.includes(action)) {
        logger.warn(`Client attempted forbidden action. User: ${user.id}, Resource: ${resource}, Action: ${action}`);
        throw new AppError("Action not allowed", 403);
      }

      logger.info(`Client permission granted for ${resource}:${action}. User: ${user.id}`);
    }

    next();
  };
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