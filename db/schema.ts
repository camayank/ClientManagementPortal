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

// Accounting profiles for CPA-specific client data
export const accountingProfiles = pgTable("accounting_profiles", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull().unique(),

  // Entity details
  entityType: text("entity_type", {
    enum: ["sole_prop", "partnership", "llc", "llc_s_corp", "llc_partnership", "s_corp", "c_corp", "nonprofit"]
  }),
  taxClassification: text("tax_classification"), // Can differ from entityType
  formationState: text("formation_state"), // Two-letter state code
  formationDate: timestamp("formation_date"),
  ein: text("ein"), // Encrypted in production

  // Fiscal details
  fiscalYearEnd: text("fiscal_year_end"), // "12/31" format
  accountingMethod: text("accounting_method", {
    enum: ["cash", "accrual", "hybrid"]
  }).default("accrual"),

  // State registrations
  foreignQualifiedStates: jsonb("foreign_qualified_states").$type<Array<{
    state: string;
    registrationDate: string;
    registrationNumber?: string;
  }>>(),
  salesTaxNexusStates: jsonb("sales_tax_nexus_states").$type<Array<{
    state: string;
    nexusType: "physical" | "economic" | "both";
    registrationDate: string;
    registrationNumber?: string;
  }>>(),
  payrollStates: text("payroll_states").array(), // Array of state codes
  incomeTaxStates: text("income_tax_states").array(), // States where income tax is filed

  // Software integrations
  quickbooksCompanyId: text("quickbooks_company_id"),
  quickbooksStatus: text("quickbooks_status", {
    enum: ["connected", "disconnected", "error", "pending"]
  }),
  quickbooksLastSync: timestamp("quickbooks_last_sync"),
  xeroOrganizationId: text("xero_organization_id"),
  xeroStatus: text("xero_status", {
    enum: ["connected", "disconnected", "error", "pending"]
  }),
  xeroLastSync: timestamp("xero_last_sync"),
  otherIntegrations: jsonb("other_integrations").$type<Record<string, any>>(),

  // Parent/subsidiary structure
  parentClientId: integer("parent_client_id").references(() => clients.id),
  ownershipPercentage: integer("ownership_percentage"), // 0-100
  requiresConsolidation: boolean("requires_consolidation").default(false),
  consolidationMethod: text("consolidation_method"), // "equity", "full_consolidation", etc.

  // Additional metadata
  notes: text("notes"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),

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

// Workflow Automation Engine tables
export const workflowTemplates = pgTable("workflow_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", {
    enum: ["month_end_close", "tax_prep", "audit", "payroll", "custom"]
  }).notNull(),
  description: text("description"),

  // Workflow configuration
  steps: jsonb("steps").$type<Array<{
    stepNumber: number;
    title: string;
    description?: string;
    assignedRole?: string;
    estimatedDuration?: number; // in hours
    dependencies?: number[]; // step numbers that must complete first
  }>>().notNull(),

  // Trigger conditions
  triggerConditions: jsonb("trigger_conditions").$type<{
    event?: string; // "fiscal_year_end", "quarter_end", "monthly"
    entityTypes?: string[]; // Which client entity types use this
    automatic?: boolean; // Auto-create instances
  }>(),

  // Applicability
  entityTypes: text("entity_types").array(),

  // Status
  isActive: boolean("is_active").default(true),

  // Metadata
  createdBy: integer("created_by").references(() => users.id),
  metadata: jsonb("metadata").$type<Record<string, any>>(),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const workflowInstances = pgTable("workflow_instances", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => workflowTemplates.id).notNull(),
  clientId: integer("client_id").references(() => clients.id).notNull(),

  // Status
  status: text("status", {
    enum: ["not_started", "in_progress", "blocked", "completed", "cancelled"]
  }).default("not_started"),

  // Dates
  dueDate: timestamp("due_date"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),

  // Progress tracking
  currentStep: integer("current_step"),
  completedSteps: integer("completed_steps").default(0),
  totalSteps: integer("total_steps").notNull(),

  // Metadata
  metadata: jsonb("metadata").$type<{
    period?: string; // "2024-12", "2024-Q4"
    notes?: string;
  }>(),

  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const workflowSteps = pgTable("workflow_steps", {
  id: serial("id").primaryKey(),
  workflowInstanceId: integer("workflow_instance_id").references(() => workflowInstances.id).notNull(),
  stepNumber: integer("step_number").notNull(),

  // Step details
  title: text("title").notNull(),
  description: text("description"),

  // Task linkage
  taskId: integer("task_id").references(() => tasks.id),

  // Dependencies
  dependencies: integer("dependencies").array(), // Step IDs that must complete first

  // Assignment
  assignedTo: integer("assigned_to").references(() => users.id),

  // Status
  status: text("status", {
    enum: ["pending", "ready", "in_progress", "blocked", "completed", "skipped"]
  }).default("pending"),

  // Dates
  dueDate: timestamp("due_date"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),

  // Metadata
  metadata: jsonb("metadata").$type<Record<string, any>>(),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Quality Control tables
export const qualityCheckpoints = pgTable("quality_checkpoints", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  clientId: integer("client_id").references(() => clients.id).notNull(),

  // QC layer (1: AI/Automation, 2: CA Review, 3: CPA Sign-off)
  layer: integer("layer", { enum: [1, 2, 3] }).notNull(),

  // Status
  status: text("status", {
    enum: ["pending", "in_progress", "passed", "failed", "skipped"]
  }).default("pending"),

  // Checklist
  checklistItems: jsonb("checklist_items").$type<Array<{
    id: string;
    name: string;
    type: "automated" | "manual" | "ai";
    status: "pending" | "passed" | "failed";
    notes?: string;
  }>>().notNull(),

  // Review details
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  timeSpent: integer("time_spent"), // Minutes

  // Issues and resolution
  issues: jsonb("issues").$type<Array<{
    issueType: string;
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    resolution?: string;
  }>>(),

  requiresRework: boolean("requires_rework").default(false),
  reworkReason: text("rework_reason"),

  // Metadata
  metadata: jsonb("metadata").$type<Record<string, any>>(),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const qualityChecklistTemplates = pgTable("quality_checklist_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  layer: integer("layer", { enum: [1, 2, 3] }).notNull(),

  // Checklist items
  checklistItems: jsonb("checklist_items").$type<Array<{
    id: string;
    name: string;
    type: "automated" | "manual" | "ai";
    description?: string;
  }>>().notNull(),

  // Applicability
  applicableTo: text("applicable_to").array(), // Entity types

  // Status
  isActive: boolean("is_active").default(true),

  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const qualityIssues = pgTable("quality_issues", {
  id: serial("id").primaryKey(),
  checkpointId: integer("checkpoint_id").references(() => qualityCheckpoints.id).notNull(),

  // Issue details
  issueType: text("issue_type").notNull(),
  severity: text("severity", {
    enum: ["low", "medium", "high", "critical"]
  }).notNull(),
  description: text("description").notNull(),
  resolution: text("resolution"),

  // Status
  status: text("status", {
    enum: ["open", "in_progress", "resolved", "wontfix"]
  }).default("open"),

  // Assignment
  assignedTo: integer("assigned_to").references(() => users.id),
  resolvedBy: integer("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),

  // Metadata
  metadata: jsonb("metadata").$type<Record<string, any>>(),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Time Tracking tables
export const timeEntries = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  clientId: integer("client_id").references(() => clients.id),
  projectId: integer("project_id").references(() => projects.id),
  taskId: integer("task_id").references(() => tasks.id),

  // Time details
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in minutes (calculated)

  // Billing
  billable: boolean("billable").default(true),
  hourlyRate: integer("hourly_rate"), // in cents

  // Description
  description: text("description"),
  notes: text("notes"),

  // Status (for approval workflow)
  status: text("status", {
    enum: ["draft", "submitted", "approved", "rejected"]
  }).default("draft"),

  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),

  // Metadata
  metadata: jsonb("metadata").$type<Record<string, any>>(),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const timesheets = pgTable("timesheets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),

  // Period
  weekStarting: timestamp("week_starting").notNull(),
  weekEnding: timestamp("week_ending").notNull(),

  // Totals
  totalHours: integer("total_hours"), // in minutes
  billableHours: integer("billable_hours"), // in minutes

  // Status
  status: text("status", {
    enum: ["draft", "submitted", "approved", "rejected"]
  }).default("draft"),

  // Approval
  submittedAt: timestamp("submitted_at"),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),

  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const hourlyRates = pgTable("hourly_rates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  roleId: integer("role_id").references(() => roles.id),

  // Rate
  standardRate: integer("standard_rate").notNull(), // in cents per hour

  // Effective period
  effectiveFrom: timestamp("effective_from").notNull(),
  effectiveTo: timestamp("effective_to"),

  // Client-specific override
  clientId: integer("client_id").references(() => clients.id),

  createdAt: timestamp("created_at").defaultNow(),
});

export const clientProfitability = pgTable("client_profitability", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),

  // Period (YYYY-MM format)
  period: text("period").notNull(),

  // Financials (all in cents)
  revenue: integer("revenue").default(0),
  directCosts: integer("direct_costs").default(0),
  margin: integer("margin").default(0),
  contributionMarginPercent: integer("contribution_margin_percent").default(0),

  // Hours
  hoursSpent: integer("hours_spent").default(0), // in minutes
  billableHours: integer("billable_hours").default(0), // in minutes

  // Rates
  averageHourlyRate: integer("average_hourly_rate"), // in cents

  calculatedAt: timestamp("calculated_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),
});

// Communication tables
export const communicationTemplates = pgTable("communication_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category", {
    enum: ["welcome", "status_update", "deadline_reminder", "document_request", "custom"]
  }).notNull(),

  // Template content
  subject: text("subject").notNull(),
  body: text("body").notNull(), // Supports variables: {{clientName}}, {{dueDate}}, etc.

  // Trigger
  triggerType: text("trigger_type", {
    enum: ["manual", "automatic", "scheduled"]
  }).default("manual"),

  triggerConditions: jsonb("trigger_conditions").$type<{
    event?: string;
    workflowType?: string;
    days?: number;
  }>(),

  // Delivery
  channel: text("channel", {
    enum: ["email", "sms", "in_app", "all"]
  }).default("email"),

  // Status
  isActive: boolean("is_active").default(true),

  // Metadata
  createdBy: integer("created_by").references(() => users.id),
  metadata: jsonb("metadata").$type<Record<string, any>>(),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const communicationLog = pgTable("communication_log", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  templateId: integer("template_id").references(() => communicationTemplates.id),

  // Recipient
  sentTo: text("sent_to").notNull(), // Email or phone number

  // Content
  subject: text("subject"),
  body: text("body").notNull(),

  // Delivery
  sentAt: timestamp("sent_at").defaultNow(),
  sentBy: text("sent_by"), // "system" or user ID
  channel: text("channel", {
    enum: ["email", "sms", "in_app"]
  }).notNull(),

  // Status
  status: text("status", {
    enum: ["sent", "delivered", "failed", "opened", "clicked"]
  }).default("sent"),

  errorMessage: text("error_message"),

  // Metadata
  metadata: jsonb("metadata").$type<Record<string, any>>(),

  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull().unique(),

  // Channels
  emailEnabled: boolean("email_enabled").default(true),
  smsEnabled: boolean("sms_enabled").default(false),
  whatsappEnabled: boolean("whatsapp_enabled").default(false),

  // Contact info
  email: text("email"),
  phone: text("phone"),
  whatsappNumber: text("whatsapp_number"),

  // Notification types
  notificationTypes: jsonb("notification_types").$type<{
    deadline_reminders?: boolean;
    status_updates?: boolean;
    document_requests?: boolean;
    monthly_reports?: boolean;
  }>().default({
    deadline_reminders: true,
    status_updates: true,
    document_requests: true,
    monthly_reports: false,
  }),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Document OCR table
export const documentOcrResults = pgTable("document_ocr_results", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id).notNull(),

  // OCR results
  extractedText: text("extracted_text"),
  confidence: integer("confidence"), // 0-100

  // Detected information
  detectedType: text("detected_type"), // Auto-detected document type
  detectedDate: timestamp("detected_date"), // Extracted date from document
  detectedAmount: integer("detected_amount"), // Extracted amount in cents

  // Metadata
  metadata: jsonb("metadata").$type<{
    vendor?: string;
    invoiceNumber?: string;
    accountNumber?: string;
    [key: string]: any;
  }>(),

  processedAt: timestamp("processed_at").defaultNow(),
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
  accountingProfile: one(accountingProfiles, {
    fields: [clients.id],
    references: [accountingProfiles.clientId],
  }),
}));

export const accountingProfilesRelations = relations(accountingProfiles, ({ one }) => ({
  client: one(clients, {
    fields: [accountingProfiles.clientId],
    references: [clients.id],
  }),
  parentClient: one(clients, {
    fields: [accountingProfiles.parentClientId],
    references: [clients.id],
  }),
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

export const workflowTemplatesRelations = relations(workflowTemplates, ({ one, many }) => ({
  creator: one(users, {
    fields: [workflowTemplates.createdBy],
    references: [users.id],
  }),
  instances: many(workflowInstances),
}));

export const workflowInstancesRelations = relations(workflowInstances, ({ one, many }) => ({
  template: one(workflowTemplates, {
    fields: [workflowInstances.templateId],
    references: [workflowTemplates.id],
  }),
  client: one(clients, {
    fields: [workflowInstances.clientId],
    references: [clients.id],
  }),
  creator: one(users, {
    fields: [workflowInstances.createdBy],
    references: [users.id],
  }),
  steps: many(workflowSteps),
}));

export const workflowStepsRelations = relations(workflowSteps, ({ one }) => ({
  workflowInstance: one(workflowInstances, {
    fields: [workflowSteps.workflowInstanceId],
    references: [workflowInstances.id],
  }),
  task: one(tasks, {
    fields: [workflowSteps.taskId],
    references: [tasks.id],
  }),
  assignee: one(users, {
    fields: [workflowSteps.assignedTo],
    references: [users.id],
  }),
}));

export const qualityCheckpointsRelations = relations(qualityCheckpoints, ({ one, many }) => ({
  project: one(projects, {
    fields: [qualityCheckpoints.projectId],
    references: [projects.id],
  }),
  client: one(clients, {
    fields: [qualityCheckpoints.clientId],
    references: [clients.id],
  }),
  reviewer: one(users, {
    fields: [qualityCheckpoints.reviewedBy],
    references: [users.id],
  }),
  issues: many(qualityIssues),
}));

export const qualityIssuesRelations = relations(qualityIssues, ({ one }) => ({
  checkpoint: one(qualityCheckpoints, {
    fields: [qualityIssues.checkpointId],
    references: [qualityCheckpoints.id],
  }),
  assignee: one(users, {
    fields: [qualityIssues.assignedTo],
    references: [users.id],
  }),
  resolver: one(users, {
    fields: [qualityIssues.resolvedBy],
    references: [users.id],
  }),
}));

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  user: one(users, {
    fields: [timeEntries.userId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [timeEntries.clientId],
    references: [clients.id],
  }),
  project: one(projects, {
    fields: [timeEntries.projectId],
    references: [projects.id],
  }),
  task: one(tasks, {
    fields: [timeEntries.taskId],
    references: [tasks.id],
  }),
  approver: one(users, {
    fields: [timeEntries.approvedBy],
    references: [users.id],
  }),
}));

export const timesheetsRelations = relations(timesheets, ({ one }) => ({
  user: one(users, {
    fields: [timesheets.userId],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [timesheets.approvedBy],
    references: [users.id],
  }),
}));

export const hourlyRatesRelations = relations(hourlyRates, ({ one }) => ({
  user: one(users, {
    fields: [hourlyRates.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [hourlyRates.roleId],
    references: [roles.id],
  }),
  client: one(clients, {
    fields: [hourlyRates.clientId],
    references: [clients.id],
  }),
}));

export const clientProfitabilityRelations = relations(clientProfitability, ({ one }) => ({
  client: one(clients, {
    fields: [clientProfitability.clientId],
    references: [clients.id],
  }),
}));

export const communicationTemplatesRelations = relations(communicationTemplates, ({ one, many }) => ({
  creator: one(users, {
    fields: [communicationTemplates.createdBy],
    references: [users.id],
  }),
  logs: many(communicationLog),
}));

export const communicationLogRelations = relations(communicationLog, ({ one }) => ({
  client: one(clients, {
    fields: [communicationLog.clientId],
    references: [clients.id],
  }),
  template: one(communicationTemplates, {
    fields: [communicationLog.templateId],
    references: [communicationTemplates.id],
  }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  client: one(clients, {
    fields: [notificationPreferences.clientId],
    references: [clients.id],
  }),
}));

export const documentOcrResultsRelations = relations(documentOcrResults, ({ one }) => ({
  document: one(documents, {
    fields: [documentOcrResults.documentId],
    references: [documents.id],
  }),
}));

// Schema validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertClientSchema = createInsertSchema(clients);
export const selectClientSchema = createSelectSchema(clients);
export const insertAccountingProfileSchema = createInsertSchema(accountingProfiles);
export const selectAccountingProfileSchema = createSelectSchema(accountingProfiles);
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
export const insertWorkflowTemplateSchema = createInsertSchema(workflowTemplates);
export const selectWorkflowTemplateSchema = createSelectSchema(workflowTemplates);
export const insertWorkflowInstanceSchema = createInsertSchema(workflowInstances);
export const selectWorkflowInstanceSchema = createSelectSchema(workflowInstances);
export const insertWorkflowStepSchema = createInsertSchema(workflowSteps);
export const selectWorkflowStepSchema = createSelectSchema(workflowSteps);
export const insertQualityCheckpointSchema = createInsertSchema(qualityCheckpoints);
export const selectQualityCheckpointSchema = createSelectSchema(qualityCheckpoints);
export const insertQualityChecklistTemplateSchema = createInsertSchema(qualityChecklistTemplates);
export const selectQualityChecklistTemplateSchema = createSelectSchema(qualityChecklistTemplates);
export const insertQualityIssueSchema = createInsertSchema(qualityIssues);
export const selectQualityIssueSchema = createSelectSchema(qualityIssues);
export const insertTimeEntrySchema = createInsertSchema(timeEntries);
export const selectTimeEntrySchema = createSelectSchema(timeEntries);
export const insertTimesheetSchema = createInsertSchema(timesheets);
export const selectTimesheetSchema = createSelectSchema(timesheets);
export const insertHourlyRateSchema = createInsertSchema(hourlyRates);
export const selectHourlyRateSchema = createSelectSchema(hourlyRates);
export const insertClientProfitabilitySchema = createInsertSchema(clientProfitability);
export const selectClientProfitabilitySchema = createSelectSchema(clientProfitability);
export const insertCommunicationTemplateSchema = createInsertSchema(communicationTemplates);
export const selectCommunicationTemplateSchema = createSelectSchema(communicationTemplates);
export const insertCommunicationLogSchema = createInsertSchema(communicationLog);
export const selectCommunicationLogSchema = createSelectSchema(communicationLog);
export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences);
export const selectNotificationPreferencesSchema = createSelectSchema(notificationPreferences);
export const insertDocumentOcrResultSchema = createInsertSchema(documentOcrResults);
export const selectDocumentOcrResultSchema = createSelectSchema(documentOcrResults);

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type AccountingProfile = typeof accountingProfiles.$inferSelect;
export type NewAccountingProfile = typeof accountingProfiles.$inferInsert;
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
export type WorkflowTemplate = typeof workflowTemplates.$inferSelect;
export type NewWorkflowTemplate = typeof workflowTemplates.$inferInsert;
export type WorkflowInstance = typeof workflowInstances.$inferSelect;
export type NewWorkflowInstance = typeof workflowInstances.$inferInsert;
export type WorkflowStep = typeof workflowSteps.$inferSelect;
export type NewWorkflowStep = typeof workflowSteps.$inferInsert;
export type QualityCheckpoint = typeof qualityCheckpoints.$inferSelect;
export type NewQualityCheckpoint = typeof qualityCheckpoints.$inferInsert;
export type QualityChecklistTemplate = typeof qualityChecklistTemplates.$inferSelect;
export type NewQualityChecklistTemplate = typeof qualityChecklistTemplates.$inferInsert;
export type QualityIssue = typeof qualityIssues.$inferSelect;
export type NewQualityIssue = typeof qualityIssues.$inferInsert;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type NewTimeEntry = typeof timeEntries.$inferInsert;
export type Timesheet = typeof timesheets.$inferSelect;
export type NewTimesheet = typeof timesheets.$inferInsert;
export type HourlyRate = typeof hourlyRates.$inferSelect;
export type NewHourlyRate = typeof hourlyRates.$inferInsert;
export type ClientProfitability = typeof clientProfitability.$inferSelect;
export type NewClientProfitability = typeof clientProfitability.$inferInsert;
export type CommunicationTemplate = typeof communicationTemplates.$inferSelect;
export type NewCommunicationTemplate = typeof communicationTemplates.$inferInsert;
export type CommunicationLog = typeof communicationLog.$inferSelect;
export type NewCommunicationLog = typeof communicationLog.$inferInsert;
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreferences = typeof notificationPreferences.$inferInsert;
export type DocumentOcrResult = typeof documentOcrResults.$inferSelect;
export type NewDocumentOcrResult = typeof documentOcrResults.$inferInsert;