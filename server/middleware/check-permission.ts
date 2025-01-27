import { db } from "@db";
import { rolePermissions, userRoles, permissions } from "@db/schema";
import { eq, and } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

export async function hasPermission(userId: number, resource: string, action: string): Promise<boolean> {
  const userPerms = await db.select()
    .from(userRoles)
    .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(and(
      eq(userRoles.userId, userId),
      eq(permissions.resource, resource),
      eq(permissions.action, action)
    ));

  return userPerms.length > 0;
}

export function requirePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = req.user as any;
    if (user.role === 'admin') {
      return next(); // Admin has all permissions
    }

    try {
      const hasAccess = await hasPermission(user.id, resource, action);
      if (!hasAccess) {
        console.log(`Permission denied for user ${user.id} on ${resource}:${action}`);
        return res.status(403).json({ message: "Forbidden" });
      }
      next();
    } catch (error) {
      console.error("Error checking permissions:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
}