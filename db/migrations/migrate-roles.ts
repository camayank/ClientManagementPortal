import { db } from "@db";
import { roles, userRoles, users, permissions, rolePermissions } from "@db/schema";
import { eq } from "drizzle-orm";

const DEFAULT_PERMISSIONS = {
  admin: [
    { resource: 'users', action: 'manage' },
    { resource: 'clients', action: 'manage' },
    { resource: 'documents', action: 'manage' },
    { resource: 'projects', action: 'manage' },
    { resource: 'reports', action: 'manage' },
  ],
  client: [
    { resource: 'documents', action: 'read' },
    { resource: 'documents', action: 'create' },
    { resource: 'projects', action: 'read' },
    { resource: 'profile', action: 'manage' },
  ],
};

export async function migrateRoles() {
  try {
    // 1. Create default roles
    const [adminRole] = await db.insert(roles)
      .values({ name: 'admin', description: 'Administrator with full access' })
      .returning();

    const [clientRole] = await db.insert(roles)
      .values({ name: 'client', description: 'Client user with limited access' })
      .returning();

    // 2. Create permissions
    for (const [roleName, perms] of Object.entries(DEFAULT_PERMISSIONS)) {
      const roleId = roleName === 'admin' ? adminRole.id : clientRole.id;
      
      for (const perm of perms) {
        const [permission] = await db.insert(permissions)
          .values({
            name: `${perm.resource}:${perm.action}`,
            description: `Can ${perm.action} ${perm.resource}`,
            resource: perm.resource,
            action: perm.action,
          })
          .returning();

        // Link permission to role
        await db.insert(rolePermissions)
          .values({
            roleId,
            permissionId: permission.id,
          });
      }
    }

    // 3. Migrate existing users
    const existingUsers = await db.select().from(users);
    
    for (const user of existingUsers) {
      await db.insert(userRoles)
        .values({
          userId: user.id,
          roleId: user.role === 'admin' ? adminRole.id : clientRole.id,
        });
    }

    console.log('Role migration completed successfully');
    return true;
  } catch (error) {
    console.error('Role migration failed:', error);
    throw error;
  }
}
