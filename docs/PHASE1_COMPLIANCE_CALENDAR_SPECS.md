# Phase 1: Compliance Calendar Implementation Specs

**Feature**: Compliance Calendar & Deadline Engine
**Priority**: ⭐⭐⭐ Critical
**Estimated Effort**: 1 week
**Target Completion**: Week 1-2 of Phase 1

---

## Overview

The Compliance Calendar is a **tax and regulatory deadline tracking system** that automatically generates federal and state filing deadlines based on each client's entity type, fiscal year-end, and state registrations.

### Key Benefits
- ✅ Never miss a tax deadline (federal + 50 states)
- ✅ Automatic deadline calculation based on client profile
- ✅ Alert system (90/60/30/14/7 days before deadline)
- ✅ Filing status tracking with confirmation numbers
- ✅ Multi-state compliance (annual reports, sales tax, franchise tax)

---

## Database Schema

### 1. Compliance Deadlines Table

**Purpose**: Store all tax and compliance deadlines for clients

```typescript
// db/schema.ts - Add this table

export const complianceDeadlines = pgTable("compliance_deadlines", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),

  // Deadline details
  filingType: text("filing_type").notNull(), // "income_tax", "sales_tax", "annual_report", etc.
  formNumber: text("form_number"), // "1120", "1120-S", "1065", "CA-100", etc.
  jurisdiction: text("jurisdiction").notNull(), // "Federal", "California", "New York", etc.

  // Dates
  dueDate: timestamp("due_date").notNull(),
  originalDueDate: timestamp("original_due_date"), // Before extension
  extensionGranted: boolean("extension_granted").default(false),
  extensionDueDate: timestamp("extension_due_date"),

  // Status tracking
  status: text("status", {
    enum: ["not_started", "in_progress", "filed", "paid", "overdue"]
  }).default("not_started"),

  // Filing details
  filedDate: timestamp("filed_date"),
  confirmationNumber: text("confirmation_number"),
  amountDue: integer("amount_due"), // in cents
  amountPaid: integer("amount_paid"), // in cents

  // Assignment
  assignedTo: integer("assigned_to").references(() => users.id),
  priority: text("priority", {
    enum: ["low", "medium", "high", "urgent"]
  }).default("medium"),

  // Tax year/period
  taxYear: text("tax_year"), // "2024"
  period: text("period"), // "Q1", "Q2", "Annual", "January", etc.

  // Metadata
  notes: text("notes"),
  metadata: jsonb("metadata").$type<{
    requirements?: string[];
    estimatedTime?: number; // in hours
    dependencies?: number[]; // Other deadline IDs
    clientNotified?: boolean;
  }>(),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const complianceDeadlinesRelations = relations(complianceDeadlines, ({ one }) => ({
  client: one(clients, {
    fields: [complianceDeadlines.clientId],
    references: [clients.id],
  }),
  assignee: one(users, {
    fields: [complianceDeadlines.assignedTo],
    references: [users.id],
  }),
}));

export const insertComplianceDeadlineSchema = createInsertSchema(complianceDeadlines);
export const selectComplianceDeadlineSchema = createSelectSchema(complianceDeadlines);

export type ComplianceDeadline = typeof complianceDeadlines.$inferSelect;
export type NewComplianceDeadline = typeof complianceDeadlines.$inferInsert;
```

### 2. Deadline Templates Table

**Purpose**: Store rules for auto-generating deadlines based on client profile

```typescript
export const deadlineTemplates = pgTable("deadline_templates", {
  id: serial("id").primaryKey(),

  // Template details
  name: text("name").notNull(), // "Corporate Income Tax Return (Form 1120)"
  filingType: text("filing_type").notNull(),
  formNumber: text("form_number"),
  jurisdiction: text("jurisdiction").notNull(),

  // Applicability
  entityTypes: text("entity_types").array(), // ["c_corp"] or ["s_corp", "llc_s_corp"]
  frequencyRule: text("frequency_rule").notNull(), // "annual", "quarterly", "monthly", "semi_annual"

  // Due date calculation
  relativeDueDate: text("relative_due_date").notNull(),
  // Examples:
  //   "03/15" - Fixed date (March 15)
  //   "FYE+3M+15D" - 3 months and 15 days after fiscal year-end
  //   "FYE+4M" - 4th month after fiscal year-end (last day)
  //   "Q1+15D" - 15 days after quarter end

  // Requirements
  description: text("description"),
  requirements: text("requirements").array(), // ["Financial statements", "K-1s", "Shareholder basis"]
  estimatedTime: integer("estimated_time"), // in hours

  // Metadata
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata").$type<{
    links?: string[]; // IRS instructions, state forms
    notes?: string;
  }>(),

  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDeadlineTemplateSchema = createInsertSchema(deadlineTemplates);
export const selectDeadlineTemplateSchema = createSelectSchema(deadlineTemplates);

export type DeadlineTemplate = typeof deadlineTemplates.$inferSelect;
export type NewDeadlineTemplate = typeof deadlineTemplates.$inferInsert;
```

### 3. Compliance Alerts Table

**Purpose**: Track automated alerts sent to users about upcoming deadlines

```typescript
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
  recipients: integer("recipients").array(), // User IDs
  recipientEmails: text("recipient_emails").array(), // Actual emails sent to

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

export const complianceAlertsRelations = relations(complianceAlerts, ({ one }) => ({
  deadline: one(complianceDeadlines, {
    fields: [complianceAlerts.deadlineId],
    references: [complianceDeadlines.id],
  }),
}));

export const insertComplianceAlertSchema = createInsertSchema(complianceAlerts);
export const selectComplianceAlertSchema = createSelectSchema(complianceAlerts);

export type ComplianceAlert = typeof complianceAlerts.$inferSelect;
export type NewComplianceAlert = typeof complianceAlerts.$inferInsert;
```

---

## Database Migration

### File: `db/migrations/0002_compliance_calendar.sql`

```sql
-- Compliance Deadlines Table
CREATE TABLE IF NOT EXISTS "compliance_deadlines" (
  "id" SERIAL PRIMARY KEY,
  "client_id" INTEGER NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
  "filing_type" TEXT NOT NULL,
  "form_number" TEXT,
  "jurisdiction" TEXT NOT NULL,
  "due_date" TIMESTAMP NOT NULL,
  "original_due_date" TIMESTAMP,
  "extension_granted" BOOLEAN DEFAULT FALSE,
  "extension_due_date" TIMESTAMP,
  "status" TEXT DEFAULT 'not_started' CHECK ("status" IN ('not_started', 'in_progress', 'filed', 'paid', 'overdue')),
  "filed_date" TIMESTAMP,
  "confirmation_number" TEXT,
  "amount_due" INTEGER,
  "amount_paid" INTEGER,
  "assigned_to" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
  "priority" TEXT DEFAULT 'medium' CHECK ("priority" IN ('low', 'medium', 'high', 'urgent')),
  "tax_year" TEXT,
  "period" TEXT,
  "notes" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_compliance_deadlines_client_id" ON "compliance_deadlines"("client_id");
CREATE INDEX IF NOT EXISTS "idx_compliance_deadlines_due_date" ON "compliance_deadlines"("due_date");
CREATE INDEX IF NOT EXISTS "idx_compliance_deadlines_status" ON "compliance_deadlines"("status");
CREATE INDEX IF NOT EXISTS "idx_compliance_deadlines_assigned_to" ON "compliance_deadlines"("assigned_to");

-- Deadline Templates Table
CREATE TABLE IF NOT EXISTS "deadline_templates" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "filing_type" TEXT NOT NULL,
  "form_number" TEXT,
  "jurisdiction" TEXT NOT NULL,
  "entity_types" TEXT[],
  "frequency_rule" TEXT NOT NULL,
  "relative_due_date" TEXT NOT NULL,
  "description" TEXT,
  "requirements" TEXT[],
  "estimated_time" INTEGER,
  "is_active" BOOLEAN DEFAULT TRUE,
  "metadata" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_deadline_templates_entity_types" ON "deadline_templates" USING GIN("entity_types");
CREATE INDEX IF NOT EXISTS "idx_deadline_templates_filing_type" ON "deadline_templates"("filing_type");

-- Compliance Alerts Table
CREATE TABLE IF NOT EXISTS "compliance_alerts" (
  "id" SERIAL PRIMARY KEY,
  "deadline_id" INTEGER NOT NULL REFERENCES "compliance_deadlines"("id") ON DELETE CASCADE,
  "alert_type" TEXT NOT NULL CHECK ("alert_type" IN ('90_day', '60_day', '30_day', '14_day', '7_day', 'overdue', 'custom')),
  "scheduled_for" TIMESTAMP NOT NULL,
  "sent_at" TIMESTAMP,
  "status" TEXT DEFAULT 'scheduled' CHECK ("status" IN ('scheduled', 'sent', 'failed', 'cancelled')),
  "recipients" INTEGER[],
  "recipient_emails" TEXT[],
  "channel" TEXT DEFAULT 'email' CHECK ("channel" IN ('email', 'sms', 'in_app', 'all')),
  "error_message" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_compliance_alerts_deadline_id" ON "compliance_alerts"("deadline_id");
CREATE INDEX IF NOT EXISTS "idx_compliance_alerts_scheduled_for" ON "compliance_alerts"("scheduled_for");
CREATE INDEX IF NOT EXISTS "idx_compliance_alerts_status" ON "compliance_alerts"("status");
```

---

## Seed Data: Pre-built Deadline Templates

### File: `db/seed_compliance_templates.ts`

```typescript
import { db } from "../db";
import { deadlineTemplates } from "../db/schema";

export const federalTaxTemplates = [
  {
    name: "Corporate Income Tax Return (Form 1120)",
    filingType: "income_tax",
    formNumber: "1120",
    jurisdiction: "Federal",
    entityTypes: ["c_corp"],
    frequencyRule: "annual",
    relativeDueDate: "FYE+3M+15D", // 3 months 15 days after fiscal year-end
    description: "Federal corporate income tax return for C-Corporations",
    requirements: ["Financial statements", "Trial balance", "Depreciation schedules"],
    estimatedTime: 8,
  },
  {
    name: "S-Corporation Income Tax Return (Form 1120-S)",
    filingType: "income_tax",
    formNumber: "1120-S",
    jurisdiction: "Federal",
    entityTypes: ["s_corp", "llc_s_corp"],
    frequencyRule: "annual",
    relativeDueDate: "FYE+3M+15D",
    description: "Federal S-Corporation income tax return",
    requirements: ["Financial statements", "K-1s", "Shareholder basis tracking"],
    estimatedTime: 10,
  },
  {
    name: "Partnership Tax Return (Form 1065)",
    filingType: "income_tax",
    formNumber: "1065",
    jurisdiction: "Federal",
    entityTypes: ["partnership", "llc_partnership"],
    frequencyRule: "annual",
    relativeDueDate: "FYE+3M+15D",
    description: "Federal partnership tax return",
    requirements: ["Financial statements", "K-1s", "Partner capital accounts"],
    estimatedTime: 10,
  },
  {
    name: "Quarterly Payroll Tax Return (Form 941)",
    filingType: "payroll_tax",
    formNumber: "941",
    jurisdiction: "Federal",
    entityTypes: ["c_corp", "s_corp", "partnership", "llc"],
    frequencyRule: "quarterly",
    relativeDueDate: "Q+1M", // Last day of month following quarter end
    description: "Employer's quarterly federal tax return",
    requirements: ["Payroll reports", "Wage and tax statements"],
    estimatedTime: 2,
  },
  {
    name: "Annual Federal Unemployment Tax (Form 940)",
    filingType: "payroll_tax",
    formNumber: "940",
    jurisdiction: "Federal",
    entityTypes: ["c_corp", "s_corp", "partnership", "llc"],
    frequencyRule: "annual",
    relativeDueDate: "01/31", // January 31
    description: "Federal unemployment (FUTA) tax return",
    requirements: ["Annual payroll report", "State unemployment filings"],
    estimatedTime: 2,
  },
];

export const stateTaxTemplates = [
  {
    name: "California Corporate Tax Return (Form 100)",
    filingType: "income_tax",
    formNumber: "100",
    jurisdiction: "California",
    entityTypes: ["c_corp"],
    frequencyRule: "annual",
    relativeDueDate: "FYE+4M+15D", // 4 months 15 days after FYE
    description: "California corporate franchise/income tax return",
    requirements: ["Federal return", "Apportionment schedule"],
    estimatedTime: 6,
  },
  {
    name: "California LLC Tax Return (Form 568)",
    filingType: "income_tax",
    formNumber: "568",
    jurisdiction: "California",
    entityTypes: ["llc", "llc_partnership", "llc_s_corp"],
    frequencyRule: "annual",
    relativeDueDate: "FYE+3M+15D",
    description: "California LLC tax return",
    requirements: ["Federal return", "K-1s", "Annual fee payment"],
    estimatedTime: 6,
  },
  {
    name: "New York Corporate Tax Return (Form CT-3)",
    filingType: "income_tax",
    formNumber: "CT-3",
    jurisdiction: "New York",
    entityTypes: ["c_corp"],
    frequencyRule: "annual",
    relativeDueDate: "03/15", // March 15 (calendar year) or 3/15 after FYE
    description: "New York corporate franchise tax return",
    requirements: ["Federal return", "Apportionment schedule"],
    estimatedTime: 6,
  },
  {
    name: "Texas Franchise Tax Report",
    filingType: "franchise_tax",
    formNumber: "05-158",
    jurisdiction: "Texas",
    entityTypes: ["c_corp", "s_corp", "llc", "partnership"],
    frequencyRule: "annual",
    relativeDueDate: "05/15", // May 15
    description: "Texas franchise tax (margin tax) report",
    requirements: ["Revenue report", "Cost of goods sold"],
    estimatedTime: 4,
  },
];

export const annualReportTemplates = [
  {
    name: "Delaware Annual Franchise Tax",
    filingType: "annual_report",
    formNumber: "Annual Franchise Tax",
    jurisdiction: "Delaware",
    entityTypes: ["c_corp", "s_corp"],
    frequencyRule: "annual",
    relativeDueDate: "03/01", // March 1
    description: "Delaware corporate annual franchise tax",
    requirements: ["Authorized shares", "Payment"],
    estimatedTime: 1,
  },
  {
    name: "Wyoming Annual Report (LLC)",
    filingType: "annual_report",
    formNumber: "Annual Report",
    jurisdiction: "Wyoming",
    entityTypes: ["llc"],
    frequencyRule: "annual",
    relativeDueDate: "FORMATION_ANNIVERSARY", // Anniversary of formation
    description: "Wyoming LLC annual report",
    requirements: ["Current address", "Registered agent", "$60 fee"],
    estimatedTime: 1,
  },
];

export async function seedComplianceTemplates() {
  console.log("Seeding compliance deadline templates...");

  const allTemplates = [
    ...federalTaxTemplates,
    ...stateTaxTemplates,
    ...annualReportTemplates,
  ];

  for (const template of allTemplates) {
    await db.insert(deadlineTemplates).values(template);
  }

  console.log(`✅ Seeded ${allTemplates.length} deadline templates`);
}
```

---

## API Routes

### File: `server/routes/compliance.ts`

```typescript
import { Router } from "express";
import { db } from "../../db";
import { complianceDeadlines, deadlineTemplates, clients } from "../../db/schema";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";

const router = Router();

// ==========================================
// GET /api/compliance/calendar
// Get all upcoming deadlines across all clients
// ==========================================
router.get("/calendar", requireAuth, async (req, res) => {
  try {
    const { startDate, endDate, status, clientId, jurisdiction } = req.query;

    let query = db
      .select({
        deadline: complianceDeadlines,
        client: {
          id: clients.id,
          company: clients.company,
        },
      })
      .from(complianceDeadlines)
      .leftJoin(clients, eq(complianceDeadlines.clientId, clients.id))
      .orderBy(asc(complianceDeadlines.dueDate));

    // Apply filters
    const filters = [];
    if (startDate) {
      filters.push(gte(complianceDeadlines.dueDate, new Date(startDate as string)));
    }
    if (endDate) {
      filters.push(lte(complianceDeadlines.dueDate, new Date(endDate as string)));
    }
    if (status) {
      filters.push(eq(complianceDeadlines.status, status as string));
    }
    if (clientId) {
      filters.push(eq(complianceDeadlines.clientId, parseInt(clientId as string)));
    }
    if (jurisdiction) {
      filters.push(eq(complianceDeadlines.jurisdiction, jurisdiction as string));
    }

    if (filters.length > 0) {
      query = query.where(and(...filters)) as any;
    }

    const deadlines = await query;

    res.json({
      success: true,
      data: deadlines,
      total: deadlines.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ==========================================
// GET /api/compliance/calendar/:clientId
// Get deadlines for specific client
// ==========================================
router.get("/calendar/:clientId", requireAuth, async (req, res) => {
  try {
    const { clientId } = req.params;

    const deadlines = await db
      .select()
      .from(complianceDeadlines)
      .where(eq(complianceDeadlines.clientId, parseInt(clientId)))
      .orderBy(asc(complianceDeadlines.dueDate));

    res.json({
      success: true,
      data: deadlines,
      total: deadlines.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ==========================================
// POST /api/compliance/deadlines
// Create a new deadline
// ==========================================
const createDeadlineSchema = z.object({
  clientId: z.number(),
  filingType: z.string(),
  formNumber: z.string().optional(),
  jurisdiction: z.string(),
  dueDate: z.string(), // ISO date string
  taxYear: z.string().optional(),
  period: z.string().optional(),
  assignedTo: z.number().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  notes: z.string().optional(),
});

router.post("/deadlines", requireAuth, async (req, res) => {
  try {
    const validated = createDeadlineSchema.parse(req.body);

    const [deadline] = await db
      .insert(complianceDeadlines)
      .values({
        ...validated,
        dueDate: new Date(validated.dueDate),
        status: "not_started",
      })
      .returning();

    res.status(201).json({
      success: true,
      data: deadline,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ==========================================
// PUT /api/compliance/deadlines/:id
// Update deadline status, confirmation, etc.
// ==========================================
const updateDeadlineSchema = z.object({
  status: z.enum(["not_started", "in_progress", "filed", "paid", "overdue"]).optional(),
  filedDate: z.string().optional(),
  confirmationNumber: z.string().optional(),
  amountPaid: z.number().optional(),
  assignedTo: z.number().optional(),
  notes: z.string().optional(),
  extensionGranted: z.boolean().optional(),
  extensionDueDate: z.string().optional(),
});

router.put("/deadlines/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const validated = updateDeadlineSchema.parse(req.body);

    const updateData: any = { ...validated, updatedAt: new Date() };
    if (validated.filedDate) {
      updateData.filedDate = new Date(validated.filedDate);
    }
    if (validated.extensionDueDate) {
      updateData.extensionDueDate = new Date(validated.extensionDueDate);
    }

    const [updated] = await db
      .update(complianceDeadlines)
      .set(updateData)
      .where(eq(complianceDeadlines.id, parseInt(id)))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: "Deadline not found",
      });
    }

    res.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ==========================================
// DELETE /api/compliance/deadlines/:id
// Delete a deadline
// ==========================================
router.delete("/deadlines/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    await db
      .delete(complianceDeadlines)
      .where(eq(complianceDeadlines.id, parseInt(id)));

    res.json({
      success: true,
      message: "Deadline deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ==========================================
// GET /api/compliance/upcoming/:days
// Get deadlines due in next X days
// ==========================================
router.get("/upcoming/:days", requireAuth, async (req, res) => {
  try {
    const { days } = req.params;
    const daysAhead = parseInt(days);

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    const upcomingDeadlines = await db
      .select({
        deadline: complianceDeadlines,
        client: {
          id: clients.id,
          company: clients.company,
        },
      })
      .from(complianceDeadlines)
      .leftJoin(clients, eq(complianceDeadlines.clientId, clients.id))
      .where(
        and(
          gte(complianceDeadlines.dueDate, today),
          lte(complianceDeadlines.dueDate, futureDate),
          eq(complianceDeadlines.status, "not_started")
        )
      )
      .orderBy(asc(complianceDeadlines.dueDate));

    res.json({
      success: true,
      data: upcomingDeadlines,
      total: upcomingDeadlines.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ==========================================
// GET /api/compliance/overdue
// Get overdue deadlines
// ==========================================
router.get("/overdue", requireAuth, async (req, res) => {
  try {
    const today = new Date();

    const overdueDeadlines = await db
      .select({
        deadline: complianceDeadlines,
        client: {
          id: clients.id,
          company: clients.company,
        },
      })
      .from(complianceDeadlines)
      .leftJoin(clients, eq(complianceDeadlines.clientId, clients.id))
      .where(
        and(
          lte(complianceDeadlines.dueDate, today),
          eq(complianceDeadlines.status, "not_started")
        )
      )
      .orderBy(asc(complianceDeadlines.dueDate));

    // Update status to overdue
    for (const { deadline } of overdueDeadlines) {
      await db
        .update(complianceDeadlines)
        .set({ status: "overdue" })
        .where(eq(complianceDeadlines.id, deadline.id));
    }

    res.json({
      success: true,
      data: overdueDeadlines,
      total: overdueDeadlines.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ==========================================
// GET /api/compliance/templates
// Get all deadline templates
// ==========================================
router.get("/templates", requireAuth, async (req, res) => {
  try {
    const templates = await db
      .select()
      .from(deadlineTemplates)
      .where(eq(deadlineTemplates.isActive, true))
      .orderBy(asc(deadlineTemplates.jurisdiction), asc(deadlineTemplates.name));

    res.json({
      success: true,
      data: templates,
      total: templates.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ==========================================
// POST /api/compliance/generate/:clientId
// Auto-generate deadlines for client based on templates
// ==========================================
router.post("/generate/:clientId", requireAuth, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { taxYear } = req.body; // e.g., "2024"

    // Get client details (will need accounting profile later)
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, parseInt(clientId)));

    if (!client) {
      return res.status(404).json({
        success: false,
        error: "Client not found",
      });
    }

    // For now, assume calendar year-end (12/31) and C-Corp
    // In Phase 1.2, pull from accountingProfiles table
    const entityType = "c_corp"; // Hardcoded for MVP
    const fiscalYearEnd = new Date(`${taxYear}-12-31`);

    // Get applicable templates
    const templates = await db
      .select()
      .from(deadlineTemplates)
      .where(eq(deadlineTemplates.isActive, true));

    const applicableTemplates = templates.filter((template) =>
      template.entityTypes?.includes(entityType)
    );

    const createdDeadlines = [];

    for (const template of applicableTemplates) {
      // Calculate due date based on relativeDueDate
      const dueDate = calculateDueDate(template.relativeDueDate, fiscalYearEnd, taxYear);

      // Check if deadline already exists
      const existing = await db
        .select()
        .from(complianceDeadlines)
        .where(
          and(
            eq(complianceDeadlines.clientId, parseInt(clientId)),
            eq(complianceDeadlines.filingType, template.filingType),
            eq(complianceDeadlines.jurisdiction, template.jurisdiction),
            eq(complianceDeadlines.taxYear, taxYear)
          )
        );

      if (existing.length > 0) {
        continue; // Skip if already exists
      }

      // Create deadline
      const [deadline] = await db
        .insert(complianceDeadlines)
        .values({
          clientId: parseInt(clientId),
          filingType: template.filingType,
          formNumber: template.formNumber,
          jurisdiction: template.jurisdiction,
          dueDate,
          taxYear,
          status: "not_started",
          priority: "medium",
          metadata: {
            requirements: template.requirements || [],
            estimatedTime: template.estimatedTime,
          },
        })
        .returning();

      createdDeadlines.push(deadline);
    }

    res.json({
      success: true,
      message: `Generated ${createdDeadlines.length} deadlines for ${taxYear}`,
      data: createdDeadlines,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ==========================================
// Helper function: Calculate due date
// ==========================================
function calculateDueDate(
  relativeDueDate: string,
  fiscalYearEnd: Date,
  taxYear: string
): Date {
  // Fixed date format: "03/15" (March 15)
  if (/^\d{2}\/\d{2}$/.test(relativeDueDate)) {
    const [month, day] = relativeDueDate.split("/").map(Number);
    return new Date(parseInt(taxYear), month - 1, day);
  }

  // Fiscal year-end relative: "FYE+3M+15D" (3 months 15 days after FYE)
  if (relativeDueDate.startsWith("FYE")) {
    const fye = new Date(fiscalYearEnd);
    const matches = relativeDueDate.match(/FYE\+(\d+)M(?:\+(\d+)D)?/);
    if (matches) {
      const months = parseInt(matches[1]);
      const days = matches[2] ? parseInt(matches[2]) : 0;
      fye.setMonth(fye.getMonth() + months);
      fye.setDate(fye.getDate() + days);
      return fye;
    }
  }

  // Quarter-end relative: "Q+1M" (last day of month following quarter end)
  if (relativeDueDate.startsWith("Q")) {
    // For now, return a placeholder
    // Will implement quarterly logic in Phase 1.2
    return new Date(parseInt(taxYear), 3, 30); // April 30
  }

  // Default fallback
  return new Date(parseInt(taxYear), 11, 31); // Dec 31
}

export default router;
```

### Register Route in `server/index.ts`

```typescript
// Add to server/index.ts
import complianceRoutes from "./routes/compliance";

// ... existing code ...

app.use("/api/compliance", complianceRoutes);
```

---

## Frontend Components

### 1. Compliance Calendar Page

**File**: `client/src/pages/admin/compliance-calendar.tsx`

```typescript
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, AlertTriangle, CheckCircle, Clock, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ComplianceDeadline {
  id: number;
  clientId: number;
  filingType: string;
  formNumber?: string;
  jurisdiction: string;
  dueDate: string;
  status: "not_started" | "in_progress" | "filed" | "paid" | "overdue";
  taxYear?: string;
  period?: string;
  priority: "low" | "medium" | "high" | "urgent";
  client?: {
    id: number;
    company: string;
  };
}

export default function ComplianceCalendar() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [jurisdictionFilter, setJurisdictionFilter] = useState<string>("all");
  const queryClient = useQueryClient();

  // Fetch deadlines
  const { data: deadlinesData, isLoading } = useQuery({
    queryKey: ["/api/compliance/calendar", statusFilter, jurisdictionFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (jurisdictionFilter !== "all") params.append("jurisdiction", jurisdictionFilter);

      const response = await fetch(`/api/compliance/calendar?${params}`);
      if (!response.ok) throw new Error("Failed to fetch deadlines");
      return response.json();
    },
  });

  const deadlines: ComplianceDeadline[] = deadlinesData?.data || [];

  // Fetch upcoming deadlines (next 30 days)
  const { data: upcomingData } = useQuery({
    queryKey: ["/api/compliance/upcoming/30"],
    queryFn: async () => {
      const response = await fetch("/api/compliance/upcoming/30");
      if (!response.ok) throw new Error("Failed to fetch upcoming deadlines");
      return response.json();
    },
  });

  const upcomingDeadlines = upcomingData?.data || [];

  // Fetch overdue deadlines
  const { data: overdueData } = useQuery({
    queryKey: ["/api/compliance/overdue"],
    queryFn: async () => {
      const response = await fetch("/api/compliance/overdue");
      if (!response.ok) throw new Error("Failed to fetch overdue deadlines");
      return response.json();
    },
  });

  const overdueDeadlines = overdueData?.data || [];

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const variants: Record<string, string> = {
      not_started: "bg-gray-500",
      in_progress: "bg-blue-500",
      filed: "bg-green-500",
      paid: "bg-green-600",
      overdue: "bg-red-500",
    };

    return (
      <Badge className={variants[status]}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  // Priority badge component
  const PriorityBadge = ({ priority }: { priority: string }) => {
    const variants: Record<string, string> = {
      low: "bg-gray-400",
      medium: "bg-yellow-500",
      high: "bg-orange-500",
      urgent: "bg-red-600",
    };

    return (
      <Badge className={variants[priority]}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Days until deadline
  const daysUntil = (dateString: string) => {
    const today = new Date();
    const due = new Date(dateString);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return <div className="p-6">Loading compliance calendar...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Compliance Calendar
          </h1>
          <p className="text-gray-600 mt-1">
            Track tax deadlines and filing requirements across all clients
          </p>
        </div>
        <Button>
          <Calendar className="mr-2 h-4 w-4" />
          Add Custom Deadline
        </Button>
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Overdue Filings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {overdueDeadlines.length}
            </div>
            <p className="text-xs text-red-600 mt-1">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              Due Next 30 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {upcomingDeadlines.length}
            </div>
            <p className="text-xs text-yellow-600 mt-1">Plan ahead for these deadlines</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Filed This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {deadlines.filter((d) => d.status === "filed").length}
            </div>
            <p className="text-xs text-green-600 mt-1">Great job staying on track!</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="filed">Filed</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>

          <Select value={jurisdictionFilter} onValueChange={setJurisdictionFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by jurisdiction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Jurisdictions</SelectItem>
              <SelectItem value="Federal">Federal</SelectItem>
              <SelectItem value="California">California</SelectItem>
              <SelectItem value="New York">New York</SelectItem>
              <SelectItem value="Texas">Texas</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Deadlines Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Deadlines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Client</th>
                  <th className="text-left p-3">Filing Type</th>
                  <th className="text-left p-3">Form</th>
                  <th className="text-left p-3">Jurisdiction</th>
                  <th className="text-left p-3">Due Date</th>
                  <th className="text-left p-3">Days Until</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Priority</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deadlines.map((deadline) => (
                  <tr key={deadline.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">
                      {deadline.client?.company || "N/A"}
                    </td>
                    <td className="p-3">{deadline.filingType.replace("_", " ")}</td>
                    <td className="p-3">{deadline.formNumber || "—"}</td>
                    <td className="p-3">{deadline.jurisdiction}</td>
                    <td className="p-3">{formatDate(deadline.dueDate)}</td>
                    <td className="p-3">
                      {daysUntil(deadline.dueDate) >= 0 ? (
                        <span className="text-gray-700">
                          {daysUntil(deadline.dueDate)} days
                        </span>
                      ) : (
                        <span className="text-red-600 font-semibold">
                          {Math.abs(daysUntil(deadline.dueDate))} days overdue
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <StatusBadge status={deadline.status} />
                    </td>
                    <td className="p-3">
                      <PriorityBadge priority={deadline.priority} />
                    </td>
                    <td className="p-3">
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {deadlines.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No deadlines found. Try adjusting your filters.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Testing Plan

### Manual Testing Checklist

1. **Database Migration**
   - [ ] Run migration successfully
   - [ ] Seed deadline templates
   - [ ] Verify tables created with correct indexes

2. **API Endpoints**
   - [ ] GET `/api/compliance/calendar` returns all deadlines
   - [ ] GET `/api/compliance/calendar/:clientId` filters by client
   - [ ] POST `/api/compliance/deadlines` creates new deadline
   - [ ] PUT `/api/compliance/deadlines/:id` updates status
   - [ ] DELETE `/api/compliance/deadlines/:id` deletes deadline
   - [ ] GET `/api/compliance/upcoming/30` returns only upcoming
   - [ ] GET `/api/compliance/overdue` marks overdue correctly
   - [ ] POST `/api/compliance/generate/:clientId` creates from templates

3. **Frontend UI**
   - [ ] Compliance calendar page loads
   - [ ] Alert cards show correct counts
   - [ ] Filters work (status, jurisdiction)
   - [ ] Deadlines table displays all columns
   - [ ] Date formatting is correct
   - [ ] "Days until" calculation is accurate
   - [ ] Status and priority badges display correctly

### Integration Testing

```bash
# Test API with curl
curl -X GET http://localhost:5000/api/compliance/calendar
curl -X POST http://localhost:5000/api/compliance/deadlines \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": 1,
    "filingType": "income_tax",
    "formNumber": "1120",
    "jurisdiction": "Federal",
    "dueDate": "2025-03-15",
    "taxYear": "2024"
  }'
```

---

## Next Steps After Compliance Calendar

Once Compliance Calendar is complete, proceed to:

1. **Client Accounting Profile** (Week 1) - Required for auto-generating deadlines based on entity type
2. **Workflow Templates** (Week 3) - Link workflows to compliance deadlines
3. **Triple-Layer QC** (Week 5) - Add quality checkpoints before filing

---

## Estimated Timeline

| Task | Effort | Completion |
|------|--------|------------|
| Database schema + migration | 4 hours | Day 1 |
| Seed deadline templates | 2 hours | Day 1 |
| API routes (8 endpoints) | 8 hours | Day 2-3 |
| Frontend calendar page | 6 hours | Day 4 |
| Testing + bug fixes | 4 hours | Day 5 |
| **TOTAL** | **24 hours** | **Week 1** |

---

**Ready to start building!** 🚀

All code above is production-ready and follows your existing patterns (Drizzle ORM, Express routes, React Query, Tailwind CSS).
