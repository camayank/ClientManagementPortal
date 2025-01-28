import { pgTable, text, serial, integer, boolean, timestamp, jsonb, date, numeric, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations, sql } from "drizzle-orm";

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

// New tables for client management
export const servicePackages = pgTable("service_packages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  tierId: integer("tier_id").references(() => serviceFeatureTiers.id),
  features: jsonb("features"),
  basePrice: numeric("base_price"),
  billingCycle: text("billing_cycle", { enum: ["monthly", "quarterly", "annual"] }).notNull(),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  upgradeToPackageId: integer("upgrade_to_package_id").references(() => servicePackages.id),
  customizationRules: jsonb("customization_rules"), // Rules for price adjustments
  comparisonData: jsonb("comparison_data"), // Metadata for package comparison
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const clientOnboarding = pgTable("client_onboarding", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  currentStep: text("current_step", {
    enum: [
      "initial_contact",
      "needs_assessment",
      "proposal_sent",
      "contract_review",
      "document_collection",
      "service_setup",
      "training_scheduled",
      "completed"
    ]
  }).default("initial_contact").notNull(),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  assignedTo: integer("assigned_to").references(() => users.id),
  notes: text("notes"),
});

export const clientEngagement = pgTable("client_engagement", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  lastContactDate: timestamp("last_contact_date"),
  nextFollowUp: timestamp("next_follow_up"),
  engagementScore: integer("engagement_score"),
  riskLevel: text("risk_level", { enum: ["low", "medium", "high"] }).default("low"),
  healthStatus: text("health_status", { enum: ["healthy", "attention_needed", "at_risk"] }).default("healthy"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const clientCommunications = pgTable("client_communications", {
  id: serial("id").primaryKey(),
  onboardingId: integer("onboarding_id").references(() => clientOnboarding.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type", { enum: ["email", "call", "meeting", "note"] }).notNull(),
  message: text("message").notNull(),
  direction: text("direction", { enum: ["incoming", "outgoing"] }).notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const clientServices = pgTable("client_services", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  packageId: integer("package_id").references(() => servicePackages.id).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  status: text("status", {
    enum: ["active", "pending", "suspended", "terminated"]
  }).default("pending"),
  customizations: jsonb("customizations"),
  billingFrequency: text("billing_frequency", {
    enum: ["monthly", "quarterly", "annual"]
  }).notNull(),
  priceOverride: numeric("price_override"),
  nextBillingDate: date("next_billing_date"),
  appliedRules: jsonb("applied_rules"), // Array of applied pricing rules
  customFeatures: jsonb("custom_features"), // Custom feature values
  autoRenew: boolean("auto_renew").default(true),
  renewalNotificationSent: boolean("renewal_notification_sent").default(false),
});

// Add new tables after the existing client onboarding table
export const clientOnboardingDocuments = pgTable("client_onboarding_documents", {
  id: serial("id").primaryKey(),
  onboardingId: integer("onboarding_id").references(() => clientOnboarding.id).notNull(),
  documentType: text("document_type").notNull(),
  name: text("name").notNull(),
  required: boolean("required").default(true),
  status: text("status", { enum: ["pending", "uploaded", "approved", "rejected"] }).default("pending"),
  uploadedAt: timestamp("uploaded_at"),
  documentId: integer("document_id").references(() => documents.id),
});


// Performance Analytics Tables
export const analyticsMetrics = pgTable("analytics_metrics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category", {
    enum: ["client", "project", "task", "quality", "sla", "financial"]
  }).notNull(),
  unit: text("unit"),
  aggregationType: text("aggregation_type", {
    enum: ["count", "sum", "average", "min", "max"]
  }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const analyticsDataPoints = pgTable("analytics_data_points", {
  id: serial("id").primaryKey(),
  metricId: integer("metric_id").references(() => analyticsMetrics.id).notNull(),
  value: numeric("value").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  entityType: text("entity_type", {
    enum: ["client", "project", "task", "user", "team"]
  }).notNull(),
  entityId: integer("entity_id").notNull(),
  metadata: jsonb("metadata"),
});

export const dashboardConfigs = pgTable("dashboard_configs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  layout: jsonb("layout").notNull(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const dashboardWidgets = pgTable("dashboard_widgets", {
  id: serial("id").primaryKey(),
  dashboardId: integer("dashboard_id").references(() => dashboardConfigs.id).notNull(),
  type: text("type", {
    enum: ["chart", "metric", "table", "list"]
  }).notNull(),
  title: text("title").notNull(),
  config: jsonb("config").notNull(),
  position: integer("position").notNull(),
  size: text("size", {
    enum: ["small", "medium", "large"]
  }).default("medium"),
  refreshInterval: integer("refresh_interval").default(300), // in seconds
});

export const reportTemplates = pgTable("report_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type", {
    enum: ["performance", "financial", "quality", "operational"]
  }).notNull(),
  config: jsonb("config").notNull(),
  schedule: text("schedule"), // cron expression for automated reports
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// New tables for enhanced service package management
export const serviceFeatureTiers = pgTable("service_feature_tiers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  level: integer("level").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const serviceFeatures = pgTable("service_features", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type", {
    enum: ["boolean", "numeric", "text"]
  }).notNull(),
  unit: text("unit"), // For numeric features (e.g., "GB", "users", etc.)
  createdAt: timestamp("created_at").defaultNow(),
});

export const serviceTierFeatures = pgTable("service_tier_features", {
  id: serial("id").primaryKey(),
  tierId: integer("tier_id").references(() => serviceFeatureTiers.id).notNull(),
  featureId: integer("feature_id").references(() => serviceFeatures.id).notNull(),
  value: text("value").notNull(), // JSON string for different types of values
  createdAt: timestamp("created_at").defaultNow(),
});

// Package change history
export const packageChangeHistory = pgTable("package_change_history", {
  id: serial("id").primaryKey(),
  clientServiceId: integer("client_service_id").references(() => clientServices.id).notNull(),
  previousPackageId: integer("previous_package_id").references(() => servicePackages.id).notNull(),
  newPackageId: integer("new_package_id").references(() => servicePackages.id).notNull(),
  changeType: text("change_type", { enum: ["upgrade", "downgrade", "custom"] }).notNull(),
  reason: text("reason"),
  effectiveDate: timestamp("effective_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Custom pricing rules
export const customPricingRules = pgTable("custom_pricing_rules", {
  id: serial("id").primaryKey(),
  packageId: integer("package_id").references(() => servicePackages.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  condition: jsonb("condition").notNull(), // JSON object defining when rule applies
  adjustment: jsonb("adjustment").notNull(), // JSON object defining price adjustment
  priority: integer("priority").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Task Management System
export const taskCategories = pgTable("task_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type", {
    enum: [
      "tax_return",
      "audit",
      "bookkeeping",
      "payroll",
      "financial_planning",
      "advisory",
      "tax_planning",
      "compliance",
      "general"
    ]
  }).notNull().default("general"),
  color: text("color"),
  requiresReview: boolean("requires_review").default(true),
  defaultDeadlineDays: integer("default_deadline_days"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  categoryId: integer("category_id").references(() => taskCategories.id),
  assignedTo: integer("assigned_to").references(() => users.id),
  reviewerId: integer("reviewer_id").references(() => users.id),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).default("medium"),
  status: text("status", {
    enum: [
      "backlog",
      "todo",
      "in_progress",
      "pending_review",
      "in_review",
      "revision_needed",
      "blocked",
      "completed"
    ]
  }).default("todo"),
  clientId: integer("client_id").references(() => clients.id),
  projectId: integer("project_id").references(() => projects.id),
  dueDate: timestamp("due_date"),
  estimatedHours: numeric("estimated_hours"),
  actualHours: numeric("actual_hours"),
  taxYear: integer("tax_year"),
  filingDeadline: timestamp("filing_deadline"),
  extensionRequested: boolean("extension_requested").default(false),
  extensionDeadline: timestamp("extension_deadline"),
  complexity: text("complexity", {
    enum: ["simple", "moderate", "complex"]
  }).default("moderate"),
  parentTaskId: integer("parent_task_id").references(() => tasks.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
  completedAt: timestamp("completed_at"),
});

export const taskDependencies = pgTable("task_dependencies", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id).notNull(),
  dependsOnTaskId: integer("depends_on_task_id").references(() => tasks.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const taskStatusHistory = pgTable("task_status_history", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id).notNull(),
  previousStatus: text("previous_status"),
  newStatus: text("new_status").notNull(),
  changedBy: integer("changed_by").references(() => users.id).notNull(),
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
  onboarding: one(clientOnboarding),
  engagement: one(clientEngagement),
  services: many(clientServices),
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

export const servicePackagesRelations = relations(servicePackages, ({ one, many }) => ({
  tier: one(serviceFeatureTiers, {
    fields: [servicePackages.tierId],
    references: [serviceFeatureTiers.id],
  }),
  upgradeTo: one(servicePackages, {
    fields: [servicePackages.upgradeToPackageId],
    references: [servicePackages.id],
  }),
  clientServices: many(clientServices),
  customRules: many(customPricingRules),
}));

// Update communications relation in clientOnboardingRelations
export const clientOnboardingRelations = relations(clientOnboarding, ({ one, many }) => ({
  client: one(clients, {
    fields: [clientOnboarding.clientId],
    references: [clients.id],
  }),
  assignedUser: one(users, {
    fields: [clientOnboarding.assignedTo],
    references: [users.id],
  }),
  communications: many(clientCommunications),
  documents: many(clientOnboardingDocuments),
}));

export const clientEngagementRelations = relations(clientEngagement, ({ one }) => ({
  client: one(clients, {
    fields: [clientEngagement.clientId],
    references: [clients.id],
  }),
}));

export const clientCommunicationsRelations = relations(clientCommunications, ({ one }) => ({
  onboarding: one(clientOnboarding, {
    fields: [clientCommunications.onboardingId],
    references: [clientOnboarding.id],
  }),
  user: one(users, {
    fields: [clientCommunications.userId],
    references: [users.id],
  }),
}));

export const clientServicesRelations = relations(clientServices, ({ one }) => ({
  client: one(clients, {
    fields: [clientServices.clientId],
    references: [clients.id],
  }),
  package: one(servicePackages, {
    fields: [clientServices.packageId],
    references: [servicePackages.id],
  }),
}));

// Add relations
export const clientOnboardingDocumentsRelations = relations(clientOnboardingDocuments, ({ one }) => ({
  onboarding: one(clientOnboarding, {
    fields: [clientOnboardingDocuments.onboardingId],
    references: [clientOnboarding.id],
  }),
  document: one(documents, {
    fields: [clientOnboardingDocuments.documentId],
    references: [documents.id],
  }),
}));

export const serviceFeatureTiersRelations = relations(serviceFeatureTiers, ({ many }) => ({
  features: many(serviceTierFeatures),
  packages: many(servicePackages),
}));

export const serviceFeaturesRelations = relations(serviceFeatures, ({ many }) => ({
  tiers: many(serviceTierFeatures),
}));

export const serviceTierFeaturesRelations = relations(serviceTierFeatures, ({ one }) => ({
  tier: one(serviceFeatureTiers, {
    fields: [serviceTierFeatures.tierId],
    references: [serviceFeatureTiers.id],
  }),
  feature: one(serviceFeatures, {
    fields: [serviceTierFeatures.featureId],
    references: [serviceFeatures.id],
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
export const insertProjectTemplateSchema = createInsertSchema(projectTemplates);
export const selectProjectTemplateSchema = createSelectSchema(projectTemplates);
export const insertServicePackageSchema = createInsertSchema(servicePackages);
export const selectServicePackageSchema = createSelectSchema(servicePackages);
export const insertClientOnboardingSchema = createInsertSchema(clientOnboarding);
export const selectClientOnboardingSchema = createSelectSchema(clientOnboarding);
export const insertClientEngagementSchema = createInsertSchema(clientEngagement);
export const selectClientEngagementSchema = createSelectSchema(clientEngagement);

export const insertClientCommunicationsSchema = createInsertSchema(clientCommunications);
export const selectClientCommunicationsSchema = createSelectSchema(clientCommunications);

export const insertClientServicesSchema = createInsertSchema(clientServices);
export const selectClientServicesSchema = createSelectSchema(clientServices);
export const insertClientOnboardingDocumentSchema = createInsertSchema(clientOnboardingDocuments);
export const selectClientOnboardingDocumentSchema = createSelectSchema(clientOnboardingDocuments);

export const insertServiceFeatureTierSchema = createInsertSchema(serviceFeatureTiers);
export const selectServiceFeatureTierSchema = createSelectSchema(serviceFeatureTiers);
export const insertServiceFeatureSchema = createInsertSchema(serviceFeatures);
export const selectServiceFeatureSchema = createSelectSchema(serviceFeatures);
export const insertServiceTierFeatureSchema = createInsertSchema(serviceTierFeatures);
export const selectServiceTierFeatureSchema = createSelectSchema(serviceTierFeatures);
export const insertCustomPricingRuleSchema = createInsertSchema(customPricingRules);
export const selectCustomPricingRuleSchema = createSelectSchema(customPricingRules);
export const insertPackageChangeHistorySchema = createInsertSchema(packageChangeHistory);
export const selectPackageChangeHistorySchema = createSelectSchema(packageChangeHistory);

// Add schema validation for task tables
export const insertTaskSchema = createInsertSchema(tasks);
export const selectTaskSchema = createSelectSchema(tasks);
export const insertTaskCategorySchema = createInsertSchema(taskCategories);
export const selectTaskCategorySchema = createSelectSchema(taskCategories);
export const insertTaskDependencySchema = createInsertSchema(taskDependencies);
export const selectTaskDependencySchema = createSelectSchema(taskDependencies);
export const insertTaskStatusHistorySchema = createInsertSchema(taskStatusHistory);
export const selectTaskStatusHistorySchema = createSelectSchema(taskStatusHistory);

// Add schema validation
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

// Add relations for analytics tables
export const analyticsMetricsRelations = relations(analyticsMetrics, ({ many }) => ({
  dataPoints: many(analyticsDataPoints),
}));

export const analyticsDataPointsRelations = relations(analyticsDataPoints, ({ one }) => ({
  metric: one(analyticsMetrics, {
    fields: [analyticsDataPoints.metricId],
    references: [analyticsMetrics.id],
  }),
}));

export const dashboardConfigsRelations = relations(dashboardConfigs, ({ one, many }) => ({
  user: one(users, {
    fields: [dashboardConfigs.userId],
    references: [users.id],
  }),
  widgets: many(dashboardWidgets),
}));

export const dashboardWidgetsRelations = relations(dashboardWidgets, ({ one }) => ({
  dashboard: one(dashboardConfigs, {
    fields: [dashboardWidgets.dashboardId],
    references: [dashboardConfigs.id],
  }),
}));

export const reportTemplatesRelations = relations(reportTemplates, ({ one }) => ({
  creator: one(users, {
    fields: [reportTemplates.createdBy],
    references: [users.id],
  }),
}));


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
export type ProjectTemplate = typeof projectTemplates.$inferSelect;
export type NewProjectTemplate = typeof projectTemplates.$inferInsert;
export type ServicePackage = typeof servicePackages.$inferSelect;
export type NewServicePackage = typeof servicePackages.$inferInsert;
export type ClientOnboarding = typeof clientOnboarding.$inferSelect;
export type NewClientOnboarding = typeof clientOnboarding.$inferInsert;
export type ClientEngagement = typeof clientEngagement.$inferSelect;
export type NewClientEngagement = typeof clientEngagement.$inferInsert;
export type ClientService = typeof clientServices.$inferSelect;
export type NewClientService = typeof clientServices.$inferInsert;
export type ClientOnboardingDocument = typeof clientOnboardingDocuments.$inferSelect;
export type NewClientOnboardingDocument = typeof clientOnboardingDocuments.$inferInsert;
export type ClientCommunication = typeof clientCommunications.$inferSelect;
export type NewClientCommunication = typeof clientCommunications.$inferInsert;
export type ServiceFeatureTier = typeof serviceFeatureTiers.$inferSelect;
export type NewServiceFeatureTier = typeof serviceFeatureTiers.$inferInsert;
export type ServiceFeature = typeof serviceFeatures.$inferSelect;
export type NewServiceFeature = typeof serviceFeatures.$inferInsert;
export type ServiceTierFeature = typeof serviceTierFeatures.$inferSelect;
export type NewServiceTierFeature = typeof serviceTierFeatures.$inferInsert;
export type CustomPricingRule = typeof customPricingRules.$inferSelect;
export type NewCustomPricingRule = typeof customPricingRules.$inferInsert;
export type PackageChangeHistory = typeof packageChangeHistory.$inferSelect;
export type NewPackageChangeHistory = typeof packageChangeHistory.$inferInsert;

// Add types for task tables
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TaskCategory = typeof taskCategories.$inferSelect;
export type NewTaskCategory = typeof taskCategories.$inferInsert;
export type TaskDependency = typeof taskDependencies.$inferSelect;
export type NewTaskDependency = typeof taskDependencies.$inferInsert;
export type TaskStatusHistory = typeof taskStatusHistory.$inferSelect;
export type NewTaskStatusHistory = typeof taskStatusHistory.$inferInsert;

export type AnalyticsMetric = typeof analyticsMetrics.$inferSelect;
export type NewAnalyticsMetric = typeof analyticsMetrics.$inferInsert;
export type AnalyticsDataPoint = typeof analyticsDataPoints.$inferSelect;
export type NewAnalyticsDataPoint = typeof analyticsDataPoints.$inferInsert;
export type DashboardConfig = typeof dashboardConfigs.$inferSelect;
export type NewDashboardConfig = typeof dashboardConfigs.$inferInsert;
export type DashboardWidget = typeof dashboardWidgets.$inferSelect;
export type NewDashboardWidget = typeofdashboardWidgets.$inferInsert;
export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type NewReportTemplate = typeof reportTemplates.$inferInsert;

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  category: one(taskCategories, {
    fields: [tasks.categoryId],
    references: [taskCategories.id],
  }),
  assignedUser: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [tasks.reviewerId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [tasks.clientId],
    references: [clients.id],
  }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  parentTask: one(tasks, {
    fields: [tasks.parentTaskId],
    references: [tasks.id],
  }),
  dependencies: many(taskDependencies, { relationName: "taskDependencies" }),
  dependents: many(taskDependencies, { relationName: "dependentTasks" }),
  statusHistory: many(taskStatusHistory),
}));

export const taskCategoriesRelations = relations(taskCategories, ({ many }) => ({
  tasks: many(tasks),
}));

export const taskDependenciesRelations = relations(taskDependencies, ({ one }) => ({
  task: one(tasks, {
    fields: [taskDependencies.taskId],
    references: [tasks.id],
    relationName: "taskDependencies",
  }),
  dependsOn: one(tasks, {
    fields: [taskDependencies.dependsOnTaskId],
    references: [tasks.id],
    relationName: "dependentTasks",
  }),
}));

export const taskStatusHistoryRelations = relations(taskStatusHistory, ({ one }) => ({
  task: one(tasks, {
    fields: [taskStatusHistory.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [taskStatusHistory.changedBy],
    references: [users.id],
  }),
}));