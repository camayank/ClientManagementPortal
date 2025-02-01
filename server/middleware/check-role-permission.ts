import { type Request, type Response, type NextFunction } from "express";
import { db } from "@db";
import { roles, rolePermissions, permissions, userRoles } from "@db/schema";
import { and, eq, inArray } from "drizzle-orm";

export async function checkRolePermission(
  req: Request,
  res: Response,
  next: NextFunction,
  requiredPermission: string
) {
  try {
    if (!req.user) {
      return res.status(401).send("Authentication required");
    }

    // Admin bypass - admins have all permissions
    if (req.user.role === 'admin') {
      return next();
    }

    // Get user's roles
    const userRolesList = await db
      .select({
        roleId: userRoles.roleId,
      })
      .from(userRoles)
      .where(eq(userRoles.userId, req.user.id));

    if (!userRolesList.length) {
      return res.status(403).send("No roles assigned");
    }

    // Get permissions for user's roles
    const roleIds = userRolesList.map(ur => ur.roleId);
    const rolePerms = await db
      .select({
        permissionName: permissions.name,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(
        and(
          inArray(rolePermissions.roleId, roleIds),
          eq(permissions.name, requiredPermission)
        )
      );

    if (!rolePerms.length) {
      return res.status(403).send("Insufficient permissions");
    }

    next();
  } catch (error) {
    console.error("Permission check error:", error);
    res.status(500).send("Error checking permissions");
  }
}

// Middleware factory
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => 
    checkRolePermission(req, res, next, permission);
}