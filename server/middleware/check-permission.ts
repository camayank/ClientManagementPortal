import { db } from "@db";
import { rolePermissions, userRoles, permissions } from "@db/schema";
import { eq, and } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

export async function hasPermission(userId: number, resource: string, action: string): Promise<boolean> {
  const userPerms = await db
    .select()
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
      return res.status(401).send("Unauthorized");
    }

    const hasAccess = await hasPermission(req.user.id, resource, action);
    if (!hasAccess) {
      return res.status(403).send("Forbidden");
    }

    next();
  };
}
