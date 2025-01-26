import { db } from "@db";
import { roles, userRoles, users, permissions, rolePermissions } from "@db/schema";
import { eq } from "drizzle-orm";

const ENHANCED_ROLES = {
  manager: {
    name: 'manager',
    description: 'Manager with strategic planning and high-level approval capabilities',
    permissions: [
      { resource: 'users', action: 'manage' },
      { resource: 'clients', action: 'manage' },
      { resource: 'projects', action: 'manage' },
      { resource: 'documents', action: 'manage' },
      { resource: 'reports', action: 'manage' },
      { resource: 'approvals', action: 'manage' },
      { resource: 'strategic_planning', action: 'manage' }
    ]
  },
  partner: {
    name: 'partner',
    description: 'Partner with full visibility and strategic planning capabilities',
    permissions: [
      { resource: 'users', action: 'manage' },
      { resource: 'clients', action: 'manage' },
      { resource: 'projects', action: 'manage' },
      { resource: 'documents', action: 'manage' },
      { resource: 'reports', action: 'manage' },
      { resource: 'approvals', action: 'manage' },
      { resource: 'strategic_planning', action: 'manage' }
    ]
  },
  team_lead: {
    name: 'team_lead',
    description: 'Team Lead with task assignment and team performance tracking capabilities',
    permissions: [
      { resource: 'users', action: 'read' },
      { resource: 'clients', action: 'read' },
      { resource: 'projects', action: 'manage' },
      { resource: 'documents', action: 'manage' },
      { resource: 'tasks', action: 'manage' },
      { resource: 'team_performance', action: 'manage' },
      { resource: 'approvals', action: 'partial' }
    ]
  },
  staff_accountant: {
    name: 'staff_accountant',
    description: 'Staff Accountant for day-to-day tasks and document processing',
    permissions: [
      { resource: 'clients', action: 'read' },
      { resource: 'projects', action: 'read' },
      { resource: 'documents', action: 'process' },
      { resource: 'tasks', action: 'process' }
    ]
  },
  quality_reviewer: {
    name: 'quality_reviewer',
    description: 'Quality Reviewer for task and document review',
    permissions: [
      { resource: 'projects', action: 'review' },
      { resource: 'documents', action: 'review' },
      { resource: 'quality_findings', action: 'manage' }
    ]
  },
  compliance_officer: {
    name: 'compliance_officer',
    description: 'Compliance Officer for regulatory tracking and compliance management',
    permissions: [
      { resource: 'compliance', action: 'manage' },
      { resource: 'documents', action: 'review' },
      { resource: 'regulatory_updates', action: 'manage' },
      { resource: 'deadlines', action: 'manage' }
    ]
  }
};

export async function migrateEnhancedRoles() {
  try {
    // Create new roles
    for (const [roleKey, roleData] of Object.entries(ENHANCED_ROLES)) {
      // Check if role exists
      let [existingRole] = await db.select()
        .from(roles)
        .where(eq(roles.name, roleData.name))
        .limit(1);

      if (!existingRole) {
        [existingRole] = await db.insert(roles)
          .values({
            name: roleData.name,
            description: roleData.description
          })
          .returning();
      }

      // Create and link permissions
      for (const perm of roleData.permissions) {
        // Check if permission exists
        let [permission] = await db.select()
          .from(permissions)
          .where(eq(permissions.name, `${perm.resource}:${perm.action}`))
          .limit(1);

        if (!permission) {
          [permission] = await db.insert(permissions)
            .values({
              name: `${perm.resource}:${perm.action}`,
              description: `Can ${perm.action} ${perm.resource}`,
              resource: perm.resource,
              action: perm.action
            })
            .returning();
        }

        // Link role and permission if not already linked
        const [existingLink] = await db.select()
          .from(rolePermissions)
          .where(eq(rolePermissions.roleId, existingRole.id))
          .where(eq(rolePermissions.permissionId, permission.id))
          .limit(1);

        if (!existingLink) {
          await db.insert(rolePermissions)
            .values({
              roleId: existingRole.id,
              permissionId: permission.id
            });
        }
      }
    }

    console.log('Enhanced roles migration completed successfully');
    return true;
  } catch (error) {
    console.error('Enhanced roles migration failed:', error);
    throw error;
  }
}
