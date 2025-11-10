import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

// Core user and authentication tables
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  email: text("email"),
  fullName: text("full_name"),
  role: text("role", {
    enum: ["admin", "manager", "staff", "client"]
  }).default("client").notNull(),
  status: text("status", {
    enum: ["active", "inactive", "pending"]
  }).default("pending"),
  lastLogin: timestamp("last_login"),
  workflowPosition: text("workflow_position").default("none"),
  location: text("location"),
  experienceLevel: text("experience_level", {
    enum: ["junior", "mid", "senior", "lead"]
  }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Task management tables
export const taskCategories = pgTable("task_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", {
    enum: ["todo", "in_progress", "review", "completed"]
  }).default("todo"),
  priority: text("priority", {
    enum: ["low", "medium", "high"]
  }).default("medium"),
  dueDate: timestamp("due_date"),
  categoryId: integer("category_id").references(() => taskCategories.id),
  assignedTo: integer("assigned_to").references(() => users.id),
  createdBy: integer("created_by").references(() => users.id),
  projectId: integer("project_id").references(() => projects.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const taskStatusHistory = pgTable("task_status_history", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id).notNull(),
  previousStatus: text("previous_status").notNull(),
  newStatus: text("new_status").notNull(),
  changedBy: integer("changed_by").references(() => users.id),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: jsonb("permissions").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  resource: text("resource").notNull(),
  action: text("action").notNull(),
  scope: text("scope").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  roleId: integer("role_id").references(() => roles.id).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
});

export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").references(() => roles.id).notNull(),
  permissionId: integer("permission_id").references(() => permissions.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  company: text("company"),
  status: text("status", { enum: ["active", "inactive"] }).default("active"),
  industry: text("industry"),
  contactEmail: text("contact_email"),
  phone: text("phone"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  clientId: integer("client_id").references(() => clients.id),
  status: text("status", {
    enum: ["draft", "active", "on_hold", "completed", "cancelled"]
  }).default("draft"),
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"),
  priority: text("priority", { enum: ["low", "medium", "high"] }).default("medium"),
  assignedTo: integer("assigned_to").references(() => users.id),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Document management tables
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  size: integer("size").notNull(),
  path: text("path").notNull(),
  clientId: integer("client_id").references(() => clients.id),
  projectId: integer("project_id").references(() => projects.id),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const documentVersions = pgTable("document_versions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  version: integer("version").notNull(),
  filename: text("filename").notNull(),
  contentHash: text("content_hash").notNull(),
  size: integer("size").notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const documentClassifications = pgTable("document_classifications", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const documentTags = pgTable("document_tags", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  classificationId: integer("classification_id").references(() => documentClassifications.id).notNull(),
  addedBy: integer("added_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const documentAuditLogs = pgTable("document_audit_logs", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(),
  metadata: jsonb("metadata"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Analytics tables
export const analyticsMetrics = pgTable("analytics_metrics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  type: text("type", {
    enum: ["counter", "gauge", "histogram"]
  }).notNull(),
  unit: text("unit"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const analyticsDataPoints = pgTable("analytics_data_points", {
  id: serial("id").primaryKey(),
  metricId: integer("metric_id").references(() => analyticsMetrics.id).notNull(),
  value: integer("value").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dashboardConfigs = pgTable("dashboard_configs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  layout: jsonb("layout").notNull(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const dashboardWidgets = pgTable("dashboard_widgets", {
  id: serial("id").primaryKey(),
  dashboardId: integer("dashboard_id").references(() => dashboardConfigs.id).notNull(),
  metricId: integer("metric_id").references(() => analyticsMetrics.id),
  widgetType: text("widget_type").notNull(),
  position: jsonb("position").notNull(),
  config: jsonb("config"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reportTemplates = pgTable("report_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  templateType: text("template_type").notNull(),
  config: jsonb("config").notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Compliance and deadline management tables
export const complianceDeadlines = pgTable("compliance_deadlines", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),

  // Deadline details
  filingType: text("filing_type").notNull(),
  formNumber: text("form_number"),
  jurisdiction: text("jurisdiction").notNull(),

  // Dates
  dueDate: timestamp("due_date").notNull(),
  originalDueDate: timestamp("original_due_date"),
  extensionGranted: boolean("extension_granted").default(false),
  extensionDueDate: timestamp("extension_due_date"),

  // Status tracking
  status: text("status", {
    enum: ["not_started", "in_progress", "filed", "paid", "overdue"]
  }).default("not_started"),

  // Filing details
  filedDate: timestamp("filed_date"),
  confirmationNumber: text("confirmation_number"),
  amountDue: integer("amount_due"),
  amountPaid: integer("amount_paid"),

  // Assignment
  assignedTo: integer("assigned_to").references(() => users.id),
  priority: text("priority", {
    enum: ["low", "medium", "high", "urgent"]
  }).default("medium"),

  // Tax year/period
  taxYear: text("tax_year"),
  period: text("period"),

  // Metadata
  notes: text("notes"),
  metadata: jsonb("metadata").$type<{
    requirements?: string[];
    estimatedTime?: number;
    dependencies?: number[];
    clientNotified?: boolean;
  }>(),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const deadlineTemplates = pgTable("deadline_templates", {
  id: serial("id").primaryKey(),

  // Template details
  name: text("name").notNull(),
  filingType: text("filing_type").notNull(),
  formNumber: text("form_number"),
  jurisdiction: text("jurisdiction").notNull(),

  // Applicability
  entityTypes: text("entity_types").array(),
  frequencyRule: text("frequency_rule").notNull(),

  // Due date calculation
  relativeDueDate: text("relative_due_date").notNull(),

  // Requirements
  description: text("description"),
  requirements: text("requirements").array(),
  estimatedTime: integer("estimated_time"),

  // Metadata
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata").$type<{
    links?: string[];
    notes?: string;
  }>(),

  createdAt: timestamp("created_at").defaultNow(),
});

export const complianceAlerts = pgTable("compliance_alerts", {
  id: serial("id").primaryKey(),
  deadlineId: integer("deadline_id").references(() => complianceDeadlines.id).notNull(),

  // Alert details
  alertType: text("alert_type", {
    enum: ["90_day", "60_day", "30_day", "14_day", "7_day", "overdue", "custom"]
  }).notNull(),

  // Schedule
  scheduledFor: timestamp("scheduled_for").notNull(),
  sentAt: timestamp("sent_at"),

  // Status
  status: text("status", {
    enum: ["scheduled", "sent", "failed", "cancelled"]
  }).default("scheduled"),

  // Recipients
  recipients: integer("recipients").array(),
  recipientEmails: text("recipient_emails").array(),

  // Delivery channel
  channel: text("channel", {
    enum: ["email", "sms", "in_app", "all"]
  }).default("email"),

  // Error tracking
  errorMessage: text("error_message"),

  // Metadata
  metadata: jsonb("metadata").$type<{
    templateUsed?: string;
    emailSubject?: string;
  }>(),

  createdAt: timestamp("created_at").defaultNow(),
});

// Define relationships
export const usersRelations = relations(users, ({ many }) => ({
  roles: many(userRoles),
  projects: many(projects, { relationName: "assignedProjects" }),
  documents: many(documents, { relationName: "uploadedDocuments" }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, {
    fields: [clients.userId],
    references: [users.id],
  }),
  projects: many(projects),
  documents: many(documents),
  complianceDeadlines: many(complianceDeadlines),
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
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  category: one(taskCategories, {
    fields: [tasks.categoryId],
    references: [taskCategories.id],
  }),
  assignee: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
  rolePermissions: many(rolePermissions),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
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
  versions: many(documentVersions),
  tags: many(documentTags),
  auditLogs: many(documentAuditLogs),
}));

export const documentTagsRelations = relations(documentTags, ({ one }) => ({
  document: one(documents, {
    fields: [documentTags.documentId],
    references: [documents.id],
  }),
  classification: one(documentClassifications, {
    fields: [documentTags.classificationId],
    references: [documentClassifications.id],
  }),
}));

export const complianceDeadlinesRelations = relations(complianceDeadlines, ({ one, many }) => ({
  client: one(clients, {
    fields: [complianceDeadlines.clientId],
    references: [clients.id],
  }),
  assignee: one(users, {
    fields: [complianceDeadlines.assignedTo],
    references: [users.id],
  }),
  alerts: many(complianceAlerts),
}));

export const complianceAlertsRelations = relations(complianceAlerts, ({ one }) => ({
  deadline: one(complianceDeadlines, {
    fields: [complianceAlerts.deadlineId],
    references: [complianceDeadlines.id],
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
export const insertTaskSchema = createInsertSchema(tasks);
export const selectTaskSchema = createSelectSchema(tasks);
export const insertTaskCategorySchema = createInsertSchema(taskCategories);
export const selectTaskCategorySchema = createSelectSchema(taskCategories);
export const insertPermissionSchema = createInsertSchema(permissions);
export const selectPermissionSchema = createSelectSchema(permissions);
export const insertRolePermissionSchema = createInsertSchema(rolePermissions);
export const selectRolePermissionSchema = createSelectSchema(rolePermissions);
export const insertDocumentVersionSchema = createInsertSchema(documentVersions);
export const selectDocumentVersionSchema = createSelectSchema(documentVersions);
export const insertDocumentClassificationSchema = createInsertSchema(documentClassifications);
export const selectDocumentClassificationSchema = createSelectSchema(documentClassifications);
export const insertDocumentTagSchema = createInsertSchema(documentTags);
export const selectDocumentTagSchema = createSelectSchema(documentTags);
export const insertDocumentAuditLogSchema = createInsertSchema(documentAuditLogs);
export const selectDocumentAuditLogSchema = createSelectSchema(documentAuditLogs);
export const insertAnalyticsMetricSchema = createInsertSchema(analyticsMetrics);
export const selectAnalyticsMetricSchema = createSelectSchema(analyticsMetrics);
export const insertAnalyticsDataPointSchema = createInsertSchema(analyticsDataPoints);
export const selectAnalyticsDataPointSchema = createSelectSchema(analyticsDataPoints);
export const insertDashboardConfigSchema = createInsertSchema(dashboardConfigs);
export const selectDashboardConfigSchema = createSelectSchema(dashboardConfigs);
export const insertDashboardWidgetSchema = createInsertSchema(dashboardWidgets);
export const selectDashboardWidgetSchema = createSelectSchema(dashboardWidgets);
export const insertReportTemplateSchema = createInsertSchema(reportTemplates);
export const selectReportTemplateSchema = createSelectSchema(reportTemplates);
export const insertComplianceDeadlineSchema = createInsertSchema(complianceDeadlines);
export const selectComplianceDeadlineSchema = createSelectSchema(complianceDeadlines);
export const insertDeadlineTemplateSchema = createInsertSchema(deadlineTemplates);
export const selectDeadlineTemplateSchema = createSelectSchema(deadlineTemplates);
export const insertComplianceAlertSchema = createInsertSchema(complianceAlerts);
export const selectComplianceAlertSchema = createSelectSchema(complianceAlerts);

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TaskCategory = typeof taskCategories.$inferSelect;
export type NewTaskCategory = typeof taskCategories.$inferInsert;
export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type NewRolePermission = typeof rolePermissions.$inferInsert;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type NewDocumentVersion = typeof documentVersions.$inferInsert;
export type DocumentClassification = typeof documentClassifications.$inferSelect;
export type NewDocumentClassification = typeof documentClassifications.$inferInsert;
export type DocumentTag = typeof documentTags.$inferSelect;
export type NewDocumentTag = typeof documentTags.$inferInsert;
export type DocumentAuditLog = typeof documentAuditLogs.$inferSelect;
export type NewDocumentAuditLog = typeof documentAuditLogs.$inferInsert;
export type AnalyticsMetric = typeof analyticsMetrics.$inferSelect;
export type NewAnalyticsMetric = typeof analyticsMetrics.$inferInsert;
export type AnalyticsDataPoint = typeof analyticsDataPoints.$inferSelect;
export type NewAnalyticsDataPoint = typeof analyticsDataPoints.$inferInsert;
export type DashboardConfig = typeof dashboardConfigs.$inferSelect;
export type NewDashboardConfig = typeof dashboardConfigs.$inferInsert;
export type DashboardWidget = typeof dashboardWidgets.$inferSelect;
export type NewDashboardWidget = typeof dashboardWidgets.$inferInsert;
export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type NewReportTemplate = typeof reportTemplates.$inferInsert;
export type ComplianceDeadline = typeof complianceDeadlines.$inferSelect;
export type NewComplianceDeadline = typeof complianceDeadlines.$inferInsert;
export type DeadlineTemplate = typeof deadlineTemplates.$inferSelect;
export type NewDeadlineTemplate = typeof deadlineTemplates.$inferInsert;
export type ComplianceAlert = typeof complianceAlerts.$inferSelect;
export type NewComplianceAlert = typeof complianceAlerts.$inferInsert;