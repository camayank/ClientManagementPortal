import { db } from "@db";
import { roles, userRoles, users, permissions, rolePermissions } from "@db/schema";
import { eq } from "drizzle-orm";

const DEFAULT_PERMISSIONS = {
  admin: [
    { resource: 'users', action: 'read' },
    { resource: 'users', action: 'create' },
    { resource: 'users', action: 'update' },
    { resource: 'users', action: 'delete' },
    { resource: 'clients', action: 'read' },
    { resource: 'clients', action: 'create' },
    { resource: 'clients', action: 'update' },
    { resource: 'documents', action: 'read' },
    { resource: 'documents', action: 'create' },
    { resource: 'documents', action: 'update' },
    { resource: 'documents', action: 'delete' },
    { resource: 'projects', action: 'read' },
    { resource: 'projects', action: 'create' },
    { resource: 'projects', action: 'update' },
    { resource: 'projects', action: 'delete' },
    { resource: 'reports', action: 'read' },
    { resource: 'reports', action: 'download' },
  ],
  client: [
    { resource: 'documents', action: 'read' },
    { resource: 'documents', action: 'create' },
    { resource: 'projects', action: 'read' },
    { resource: 'projects', action: 'create' },
    { resource: 'projects', action: 'update' },
    { resource: 'profile', action: 'manage' },
  ],
};

export async function migrateRoles() {
  try {
    // 1. Get or create roles
    let adminRole = await db.query.roles.findFirst({
      where: eq(roles.name, 'admin'),
    });

    let clientRole = await db.query.roles.findFirst({
      where: eq(roles.name, 'client'),
    });

    if (!adminRole) {
      [adminRole] = await db.insert(roles)
        .values({ name: 'admin', description: 'Administrator with full access' })
        .returning();
    }

    if (!clientRole) {
      [clientRole] = await db.insert(roles)
        .values({ name: 'client', description: 'Client user with limited access' })
        .returning();
    }

    // 2. Create permissions and link to roles
    for (const [roleName, perms] of Object.entries(DEFAULT_PERMISSIONS)) {
      const roleId = roleName === 'admin' ? adminRole.id : clientRole.id;

      for (const perm of perms) {
        // Check if permission exists
        let permission = await db.query.permissions.findFirst({
          where: eq(permissions.name, `${perm.resource}:${perm.action}`),
        });

        if (!permission) {
          [permission] = await db.insert(permissions)
            .values({
              name: `${perm.resource}:${perm.action}`,
              description: `Can ${perm.action} ${perm.resource}`,
              resource: perm.resource,
              action: perm.action,
            })
            .returning();
        }

        // Check if role-permission link exists
        const existingLink = await db.query.rolePermissions.findFirst({
          where: (rp) => eq(rp.roleId, roleId) && eq(rp.permissionId, permission.id),
        });

        if (!existingLink) {
          await db.insert(rolePermissions)
            .values({
              roleId,
              permissionId: permission.id,
            });
        }
      }
    }

    // 3. Ensure all users have appropriate roles
    const existingUsers = await db.query.users.findMany();

    for (const user of existingUsers) {
      const existingUserRole = await db.query.userRoles.findFirst({
        where: eq(userRoles.userId, user.id),
      });

      if (!existingUserRole) {
        await db.insert(userRoles)
          .values({
            userId: user.id,
            roleId: user.role === 'admin' ? adminRole.id : clientRole.id,
          });
      }
    }

    console.log('Role migration completed successfully');
    return true;
  } catch (error) {
    console.error('Role migration failed:', error);
    throw error;
  }
}