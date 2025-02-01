import { Request, Response, NextFunction } from "express";
import { AppError } from "./error-handler";

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    throw new AppError("Not authenticated", 401);
  }
  next();
};

export const requireAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || req.user?.role !== "admin") {
    throw new AppError("Admin access required", 403);
  }
  next();
};

export const requireClient = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || req.user?.role !== "client") {
    throw new AppError("Client access required", 403);
  }
  next();
};

export const checkPermission = (resource: string, action: "read" | "write" | "delete") => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      throw new AppError("Not authenticated", 401);
    }

    // Admin has all permissions
    if (user.role === "admin") {
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
        throw new AppError("Resource access denied", 403);
      }

      const resourceActions = allowedActions[resource as keyof typeof allowedActions];
      if (!resourceActions?.includes(action)) {
        throw new AppError("Action not allowed", 403);
      }
    }

    next();
  };
};
