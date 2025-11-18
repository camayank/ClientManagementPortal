import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "@db";
import { complianceDeadlines, deadlineTemplates, clients, accountingProfiles } from "@db/schema";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";
import { requirePermission } from "../middleware/check-permission";
import { apiLimiter } from "../middleware/rate-limit";
import { logger } from "../utils/logger";
import { z } from "zod";

const router = Router();

// ==========================================
// GET /api/compliance/calendar
// Get all upcoming deadlines across all clients
// ==========================================
router.get("/calendar",
  apiLimiter,
  requirePermission('clients', 'read'),
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, status, clientId, jurisdiction } = req.query;

      // Build query with joins
      let query = db
        .select({
          id: complianceDeadlines.id,
          clientId: complianceDeadlines.clientId,
          filingType: complianceDeadlines.filingType,
          formNumber: complianceDeadlines.formNumber,
          jurisdiction: complianceDeadlines.jurisdiction,
          dueDate: complianceDeadlines.dueDate,
          originalDueDate: complianceDeadlines.originalDueDate,
          extensionGranted: complianceDeadlines.extensionGranted,
          extensionDueDate: complianceDeadlines.extensionDueDate,
          status: complianceDeadlines.status,
          filedDate: complianceDeadlines.filedDate,
          confirmationNumber: complianceDeadlines.confirmationNumber,
          amountDue: complianceDeadlines.amountDue,
          amountPaid: complianceDeadlines.amountPaid,
          assignedTo: complianceDeadlines.assignedTo,
          priority: complianceDeadlines.priority,
          taxYear: complianceDeadlines.taxYear,
          period: complianceDeadlines.period,
          notes: complianceDeadlines.notes,
          metadata: complianceDeadlines.metadata,
          createdAt: complianceDeadlines.createdAt,
          updatedAt: complianceDeadlines.updatedAt,
          client: {
            id: clients.id,
            company: clients.company,
          },
        })
        .from(complianceDeadlines)
        .leftJoin(clients, eq(complianceDeadlines.clientId, clients.id))
        .orderBy(asc(complianceDeadlines.dueDate))
        .$dynamic();

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
        query = query.where(and(...filters));
      }

      const deadlines = await query;

      res.json({
        success: true,
        data: deadlines,
        total: deadlines.length,
      });
    } catch (error: any) {
      logger.error("Error fetching compliance calendar:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to fetch compliance calendar",
      });
    }
  }
);

// ==========================================
// GET /api/compliance/calendar/:clientId
// Get deadlines for specific client
// ==========================================
router.get("/calendar/:clientId",
  apiLimiter,
  requirePermission('clients', 'read'),
  async (req: Request, res: Response) => {
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
      logger.error("Error fetching client deadlines:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to fetch client deadlines",
      });
    }
  }
);

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

router.post("/deadlines",
  apiLimiter,
  requirePermission('clients', 'manage'),
  async (req: Request, res: Response) => {
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

      logger.info(`Created deadline ${deadline.id} for client ${validated.clientId}`);

      res.status(201).json({
        success: true,
        data: deadline,
      });
    } catch (error: any) {
      logger.error("Error creating deadline:", error);
      res.status(400).json({
        success: false,
        error: error.message || "Failed to create deadline",
      });
    }
  }
);

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

router.put("/deadlines/:id",
  apiLimiter,
  requirePermission('clients', 'manage'),
  async (req: Request, res: Response) => {
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

      logger.info(`Updated deadline ${id}`);

      res.json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      logger.error("Error updating deadline:", error);
      res.status(400).json({
        success: false,
        error: error.message || "Failed to update deadline",
      });
    }
  }
);

// ==========================================
// DELETE /api/compliance/deadlines/:id
// Delete a deadline
// ==========================================
router.delete("/deadlines/:id",
  apiLimiter,
  requirePermission('clients', 'manage'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await db
        .delete(complianceDeadlines)
        .where(eq(complianceDeadlines.id, parseInt(id)));

      logger.info(`Deleted deadline ${id}`);

      res.json({
        success: true,
        message: "Deadline deleted successfully",
      });
    } catch (error: any) {
      logger.error("Error deleting deadline:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to delete deadline",
      });
    }
  }
);

// ==========================================
// GET /api/compliance/upcoming/:days
// Get deadlines due in next X days
// ==========================================
router.get("/upcoming/:days",
  apiLimiter,
  requirePermission('clients', 'read'),
  async (req: Request, res: Response) => {
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
      logger.error("Error fetching upcoming deadlines:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to fetch upcoming deadlines",
      });
    }
  }
);

// ==========================================
// GET /api/compliance/overdue
// Get overdue deadlines
// ==========================================
router.get("/overdue",
  apiLimiter,
  requirePermission('clients', 'read'),
  async (req: Request, res: Response) => {
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
          .set({ status: "overdue", updatedAt: new Date() })
          .where(eq(complianceDeadlines.id, deadline.id));
      }

      res.json({
        success: true,
        data: overdueDeadlines,
        total: overdueDeadlines.length,
      });
    } catch (error: any) {
      logger.error("Error fetching overdue deadlines:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to fetch overdue deadlines",
      });
    }
  }
);

// ==========================================
// GET /api/compliance/templates
// Get all deadline templates
// ==========================================
router.get("/templates",
  apiLimiter,
  requirePermission('clients', 'read'),
  async (req: Request, res: Response) => {
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
      logger.error("Error fetching deadline templates:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to fetch deadline templates",
      });
    }
  }
);

// ==========================================
// POST /api/compliance/generate/:clientId
// Auto-generate deadlines for client based on templates
// ==========================================
router.post("/generate/:clientId",
  apiLimiter,
  requirePermission('clients', 'manage'),
  async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const { taxYear } = req.body; // e.g., "2024"

      if (!taxYear) {
        return res.status(400).json({
          success: false,
          error: "Tax year is required",
        });
      }

      // Get client details
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

      // Get accounting profile for entity type and fiscal year-end
      const [profile] = await db
        .select()
        .from(accountingProfiles)
        .where(eq(accountingProfiles.clientId, parseInt(clientId)));

      // Use profile data if available, otherwise use defaults
      const entityType = profile?.entityType || "c_corp"; // Default to C-Corp
      const fiscalYearEndStr = profile?.fiscalYearEnd || "12/31"; // Default to calendar year

      // Parse fiscal year-end (format: "MM/DD")
      const [month, day] = fiscalYearEndStr.split("/").map(Number);
      const fiscalYearEnd = new Date(parseInt(taxYear), month - 1, day);

      if (!profile) {
        logger.warn(`No accounting profile found for client ${clientId}, using defaults (C-Corp, 12/31 FYE)`);
      }

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
            formNumber: template.formNumber || undefined,
            jurisdiction: template.jurisdiction,
            dueDate,
            taxYear,
            status: "not_started",
            priority: "medium",
            metadata: {
              requirements: template.requirements || [],
              estimatedTime: template.estimatedTime || undefined,
            },
          })
          .returning();

        createdDeadlines.push(deadline);
      }

      logger.info(`Generated ${createdDeadlines.length} deadlines for client ${clientId}, tax year ${taxYear}`);

      res.json({
        success: true,
        message: `Generated ${createdDeadlines.length} deadlines for ${taxYear}`,
        data: createdDeadlines,
      });
    } catch (error: any) {
      logger.error("Error generating deadlines:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to generate deadlines",
      });
    }
  }
);

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
    // For Q1 (Jan-Mar), due date is April 30
    // For Q2 (Apr-Jun), due date is July 31
    // For Q3 (Jul-Sep), due date is October 31
    // For Q4 (Oct-Dec), due date is January 31 of next year
    const matches = relativeDueDate.match(/Q\+(\d+)M/);
    if (matches) {
      const monthsAfter = parseInt(matches[1]);
      // For now, default to Q1 deadline
      return new Date(parseInt(taxYear), 3, 30); // April 30
    }
  }

  // Month relative: "MONTH+20D" (20 days after month end)
  if (relativeDueDate.includes("MONTH")) {
    const matches = relativeDueDate.match(/MONTH\+(\d+)D/);
    if (matches) {
      const daysAfter = parseInt(matches[1]);
      // Default to next month
      const date = new Date(parseInt(taxYear), 1, daysAfter); // Feb + days
      return date;
    }
  }

  // Formation anniversary - for now, use default date
  if (relativeDueDate.includes("FORMATION_ANNIVERSARY")) {
    return new Date(parseInt(taxYear), 6, 1); // July 1 as default
  }

  // Formation + days - for new BOI reports
  if (relativeDueDate.includes("FORMATION")) {
    const matches = relativeDueDate.match(/FORMATION\+(\d+)D/);
    if (matches) {
      const daysAfter = parseInt(matches[1]);
      const date = new Date(parseInt(taxYear), 0, 1); // Jan 1 + days
      date.setDate(date.getDate() + daysAfter);
      return date;
    }
  }

  // Default fallback
  logger.warn(`Unknown relativeDueDate format: ${relativeDueDate}`);
  return new Date(parseInt(taxYear), 11, 31); // Dec 31
}

export default router;
