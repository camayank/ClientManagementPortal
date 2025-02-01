import { db } from "@db";
import { roles, userRoles, users, permissions, rolePermissions } from "@db/schema";
import { eq } from "drizzle-orm";

const CPA_ROLES = {
  // US Office Staff Roles
  us_office_senior: {
    name: 'us_office_senior',
    description: 'Senior CPA professional working in US office',
    permissions: [
      { resource: 'clients', action: 'manage' },
      { resource: 'projects', action: 'manage' },
      { resource: 'documents', action: 'manage' },
      { resource: 'reports', action: 'manage' },
      { resource: 'approvals', action: 'manage' },
      { resource: 'tasks', action: 'manage' },
      { resource: 'team_performance', action: 'manage' },
      { resource: 'quality_review', action: 'manage' }
    ]
  },
  us_office_reviewer: {
    name: 'us_office_reviewer',
    description: 'Review specialist in US office',
    permissions: [
      { resource: 'documents', action: 'review' },
      { resource: 'projects', action: 'review' },
      { resource: 'quality_findings', action: 'manage' },
      { resource: 'tasks', action: 'review' }
    ]
  },
  us_office_staff: {
    name: 'us_office_staff',
    description: 'Regular staff accountant in US office',
    permissions: [
      { resource: 'clients', action: 'read' },
      { resource: 'projects', action: 'process' },
      { resource: 'documents', action: 'process' },
      { resource: 'tasks', action: 'process' }
    ]
  },

  // US Remote Staff Roles
  us_remote_senior: {
    name: 'us_remote_senior',
    description: 'Senior CPA professional working remotely in US',
    permissions: [
      { resource: 'clients', action: 'manage' },
      { resource: 'projects', action: 'manage' },
      { resource: 'documents', action: 'manage' },
      { resource: 'reports', action: 'manage' },
      { resource: 'tasks', action: 'manage' },
      { resource: 'team_performance', action: 'manage' }
    ]
  },
  us_remote_staff: {
    name: 'us_remote_staff',
    description: 'Regular remote staff accountant in US',
    permissions: [
      { resource: 'clients', action: 'read' },
      { resource: 'projects', action: 'process' },
      { resource: 'documents', action: 'process' },
      { resource: 'tasks', action: 'process' }
    ]
  },

  // Offshore Staff Roles
  offshore_team_lead: {
    name: 'offshore_team_lead',
    description: 'Offshore team leader',
    permissions: [
      { resource: 'projects', action: 'manage' },
      { resource: 'documents', action: 'manage' },
      { resource: 'tasks', action: 'manage' },
      { resource: 'team_performance', action: 'manage' }
    ]
  },
  offshore_senior: {
    name: 'offshore_senior',
    description: 'Senior offshore staff member',
    permissions: [
      { resource: 'projects', action: 'process' },
      { resource: 'documents', action: 'process' },
      { resource: 'tasks', action: 'process' },
      { resource: 'quality_review', action: 'process' }
    ]
  },
  offshore_junior: {
    name: 'offshore_junior',
    description: 'Junior offshore staff member',
    permissions: [
      { resource: 'projects', action: 'read' },
      { resource: 'documents', action: 'process' },
      { resource: 'tasks', action: 'process' }
    ]
  },

  // Outsourced Team Roles
  outsource_lead: {
    name: 'outsource_lead',
    description: 'Outsourced team leader',
    permissions: [
      { resource: 'projects', action: 'manage' },
      { resource: 'documents', action: 'manage' },
      { resource: 'tasks', action: 'manage' }
    ]
  },
  outsource_staff: {
    name: 'outsource_staff',
    description: 'Regular outsourced staff member',
    permissions: [
      { resource: 'projects', action: 'process' },
      { resource: 'documents', action: 'process' },
      { resource: 'tasks', action: 'process' }
    ]
  },

  // Specialized Workflow Roles
  maker: {
    name: 'maker',
    description: 'Initial processor of tasks and documents',
    permissions: [
      { resource: 'documents', action: 'create' },
      { resource: 'tasks', action: 'create' },
      { resource: 'projects', action: 'create' }
    ]
  },
  checker: {
    name: 'checker',
    description: 'Verifies work before final review',
    permissions: [
      { resource: 'documents', action: 'verify' },
      { resource: 'tasks', action: 'verify' },
      { resource: 'quality_findings', action: 'create' }
    ]
  },
  reviewer: {
    name: 'reviewer',
    description: 'Final reviewer of completed work',
    permissions: [
      { resource: 'documents', action: 'review' },
      { resource: 'tasks', action: 'review' },
      { resource: 'quality_findings', action: 'manage' },
      { resource: 'approvals', action: 'manage' }
    ]
  },

  // Training Roles
  intern: {
    name: 'intern',
    description: 'Internship role with limited access',
    permissions: [
      { resource: 'documents', action: 'read' },
      { resource: 'tasks', action: 'read' },
      { resource: 'training_materials', action: 'read' }
    ]
  },
  trainee: {
    name: 'trainee',
    description: 'New hire in training period',
    permissions: [
      { resource: 'documents', action: 'create' },
      { resource: 'tasks', action: 'create' },
      { resource: 'training_materials', action: 'read' }
    ]
  }
};

export async function migrateCPARoles() {
  try {
    // Create new roles with their permissions
    for (const [roleKey, roleData] of Object.entries(CPA_ROLES)) {
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

    console.log('CPA roles migration completed successfully');
    return true;
  } catch (error) {
    console.error('CPA roles migration failed:', error);
    throw error;
  }
}
