import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

// Roles and Permissions tables
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  resource: text("resource").notNull(),
  action: text("action").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").references(() => roles.id).notNull(),
  permissionId: integer("permission_id").references(() => permissions.id).notNull(),
});

export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  roleId: integer("role_id").references(() => roles.id).notNull(),
});

// Existing tables
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  role: text("role", { 
    enum: [
      "admin",
      "client",
      "manager",
      "partner",
      "team_lead",
      "staff_accountant",
      "quality_reviewer",
      "compliance_officer"
    ]
  }).default("client").notNull(),
  fullName: text("full_name"),
  email: text("email"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  company: text("company"),
  status: text("status", { enum: ["active", "inactive"] }).default("active"),
  projects: integer("projects").default(0),
  lastActivity: timestamp("last_activity"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  clientId: integer("client_id").references(() => clients.id),
  assignedTo: integer("assigned_to").references(() => users.id),
  status: text("status", { enum: ["active", "completed", "pending"] }).default("active"),
  businessType: text("business_type", {
    enum: [
      "bookkeeping",
      "tax_return_preparation",
      "audit_assurance",
      "payroll_services",
      "financial_planning",
      "business_advisory",
      "irs_representation",
      "other"
    ]
  }).notNull(),
  clientType: text("client_type", {
    enum: [
      "individual",
      "small_business",
      "corporation",
      "non_profit",
      "partnership",
      "trust_estate"
    ]
  }).notNull(),
  priority: text("priority", { enum: ["low", "medium", "high"] }).default("medium"),
  estimatedHours: integer("estimated_hours"),
  budget: integer("budget"),
  createdAt: timestamp("created_at").defaultNow(),
  lastDate: timestamp("last_date").notNull(),
  description: text("description"),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  size: integer("size").notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  clientId: integer("client_id").references(() => clients.id),
  projectId: integer("project_id").references(() => projects.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// New Milestone tables
export const milestones = pgTable("milestones", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["pending", "in_progress", "completed", "delayed"] }).default("pending").notNull(),
  dueDate: timestamp("due_date").notNull(),
  completedAt: timestamp("completed_at"),
  progress: integer("progress").default(0),
  priority: text("priority", { enum: ["low", "medium", "high"] }).default("medium"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const milestoneUpdates = pgTable("milestone_updates", {
  id: serial("id").primaryKey(),
  milestoneId: integer("milestone_id").references(() => milestones.id).notNull(),
  updatedBy: integer("updated_by").references(() => users.id).notNull(),
  previousStatus: text("previous_status"),
  newStatus: text("new_status"),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  roles: many(userRoles),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  permissions: many(rolePermissions),
  users: many(userRoles),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  roles: many(rolePermissions),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, {
    fields: [clients.userId],
    references: [users.id],
  }),
  documents: many(documents),
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  assignedUser: one(users, {
    fields: [projects.assignedTo],
    references: [users.id],
  }),
  documents: many(documents),
  milestones: many(milestones),
  template: one(projectTemplates, {
    fields: [projects.id],
    references: [projectTemplates.id],
  }),
}));


export const documentsRelations = relations(documents, ({ one }) => ({
  client: one(clients, {
    fields: [documents.clientId],
    references: [clients.id],
  }),
  project: one(projects, {
    fields: [documents.projectId],
    references: [projects.id],
  }),
  uploader: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
}));

export const milestonesRelations = relations(milestones, ({ one, many }) => ({
  project: one(projects, {
    fields: [milestones.projectId],
    references: [projects.id],
  }),
  updates: many(milestoneUpdates),
}));

export const milestoneUpdatesRelations = relations(milestoneUpdates, ({ one }) => ({
  milestone: one(milestones, {
    fields: [milestoneUpdates.milestoneId],
    references: [milestones.id],
  }),
  updatedByUser: one(users, {
    fields: [milestoneUpdates.updatedBy],
    references: [users.id],
  }),
}));


// Schema validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertClientSchema = createInsertSchema(clients);
export const selectClientSchema = createSelectSchema(clients);
export const insertProjectSchema = createInsertSchema(projects);
export const selectProjectSchema = createSelectSchema(projects);
export const insertDocumentSchema = createInsertSchema(documents);
export const selectDocumentSchema = createSelectSchema(documents);
export const insertRoleSchema = createInsertSchema(roles);
export const selectRoleSchema = createSelectSchema(roles);
export const insertPermissionSchema = createInsertSchema(permissions);
export const selectPermissionSchema = createSelectSchema(permissions);
export const insertMilestoneSchema = createInsertSchema(milestones);
export const selectMilestoneSchema = createSelectSchema(milestones);
export const insertMilestoneUpdateSchema = createInsertSchema(milestoneUpdates);
export const selectMilestoneUpdateSchema = createSelectSchema(milestoneUpdates);

// New Project Template Table
export const projectTemplates = pgTable("project_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  businessType: text("business_type", {
    enum: [
      "bookkeeping",
      "tax_return_preparation",
      "audit_assurance",
      "payroll_services",
      "financial_planning",
      "business_advisory",
      "irs_representation",
      "other"
    ]
  }).notNull(),
  clientType: text("client_type", {
    enum: [
      "individual",
      "small_business",
      "corporation",
      "non_profit",
      "partnership",
      "trust_estate"
    ]
  }).notNull(),
  priority: text("priority", { enum: ["low", "medium", "high"] }).default("medium"),
  estimatedHours: integer("estimated_hours"),
  budget: integer("budget"),
  defaultMilestones: jsonb("default_milestones"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Add relations
export const projectTemplatesRelations = relations(projectTemplates, ({ many }) => ({
  projects: many(projects),
}));

// Add to existing relations

// Add schema validation
export const insertProjectTemplateSchema = createInsertSchema(projectTemplates);
export const selectProjectTemplateSchema = createSelectSchema(projectTemplates);

// Add types
export type ProjectTemplate = typeof projectTemplates.$inferSelect;
export type NewProjectTemplate = typeof projectTemplates.$inferInsert;

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;
export type Milestone = typeof milestones.$inferSelect;
export type NewMilestone = typeof milestones.$inferInsert;
export type MilestoneUpdate = typeof milestoneUpdates.$inferSelect;
export type NewMilestoneUpdate = typeof milestoneUpdates.$inferInsert;