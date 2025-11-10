import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "@db";
import { accountingProfiles, clients } from "@db/schema";
import { eq } from "drizzle-orm";
import { requirePermission } from "../middleware/check-permission";
import { apiLimiter } from "../middleware/rate-limit";
import { logger } from "../utils/logger";
import { z } from "zod";

const router = Router();

// ==========================================
// GET /api/accounting-profiles/:clientId
// Get accounting profile for a client
// ==========================================
router.get("/:clientId",
  apiLimiter,
  requirePermission('clients', 'read'),
  async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;

      const [profile] = await db
        .select()
        .from(accountingProfiles)
        .where(eq(accountingProfiles.clientId, parseInt(clientId)));

      if (!profile) {
        return res.status(404).json({
          success: false,
          error: "Accounting profile not found for this client",
        });
      }

      res.json({
        success: true,
        data: profile,
      });
    } catch (error: any) {
      logger.error("Error fetching accounting profile:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to fetch accounting profile",
      });
    }
  }
);

// ==========================================
// POST /api/accounting-profiles
// Create accounting profile for a client
// ==========================================
const createProfileSchema = z.object({
  clientId: z.number(),
  entityType: z.enum(["sole_prop", "partnership", "llc", "llc_s_corp", "llc_partnership", "s_corp", "c_corp", "nonprofit"]).optional(),
  taxClassification: z.string().optional(),
  formationState: z.string().max(2).optional(), // Two-letter state code
  formationDate: z.string().optional(),
  ein: z.string().optional(),
  fiscalYearEnd: z.string().optional(), // "MM/DD" format
  accountingMethod: z.enum(["cash", "accrual", "hybrid"]).default("accrual"),
  foreignQualifiedStates: z.array(z.object({
    state: z.string(),
    registrationDate: z.string(),
    registrationNumber: z.string().optional(),
  })).optional(),
  salesTaxNexusStates: z.array(z.object({
    state: z.string(),
    nexusType: z.enum(["physical", "economic", "both"]),
    registrationDate: z.string(),
    registrationNumber: z.string().optional(),
  })).optional(),
  payrollStates: z.array(z.string()).optional(),
  incomeTaxStates: z.array(z.string()).optional(),
  parentClientId: z.number().optional(),
  ownershipPercentage: z.number().min(0).max(100).optional(),
  requiresConsolidation: z.boolean().default(false),
  consolidationMethod: z.string().optional(),
  notes: z.string().optional(),
});

router.post("/",
  apiLimiter,
  requirePermission('clients', 'manage'),
  async (req: Request, res: Response) => {
    try {
      const validated = createProfileSchema.parse(req.body);

      // Check if client exists
      const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, validated.clientId));

      if (!client) {
        return res.status(404).json({
          success: false,
          error: "Client not found",
        });
      }

      // Check if profile already exists
      const [existingProfile] = await db
        .select()
        .from(accountingProfiles)
        .where(eq(accountingProfiles.clientId, validated.clientId));

      if (existingProfile) {
        return res.status(409).json({
          success: false,
          error: "Accounting profile already exists for this client. Use PUT to update.",
        });
      }

      // Parse date if provided
      const profileData: any = { ...validated };
      if (validated.formationDate) {
        profileData.formationDate = new Date(validated.formationDate);
      }

      const [profile] = await db
        .insert(accountingProfiles)
        .values(profileData)
        .returning();

      logger.info(`Created accounting profile for client ${validated.clientId}`);

      res.status(201).json({
        success: true,
        data: profile,
      });
    } catch (error: any) {
      logger.error("Error creating accounting profile:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({
          success: false,
          error: "Invalid input data",
          details: error.errors,
        });
      }
      res.status(500).json({
        success: false,
        error: error.message || "Failed to create accounting profile",
      });
    }
  }
);

// ==========================================
// PUT /api/accounting-profiles/:clientId
// Update accounting profile for a client
// ==========================================
const updateProfileSchema = createProfileSchema.partial().omit({ clientId: true });

router.put("/:clientId",
  apiLimiter,
  requirePermission('clients', 'manage'),
  async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const validated = updateProfileSchema.parse(req.body);

      // Parse date if provided
      const updateData: any = { ...validated, updatedAt: new Date() };
      if (validated.formationDate) {
        updateData.formationDate = new Date(validated.formationDate);
      }

      const [updated] = await db
        .update(accountingProfiles)
        .set(updateData)
        .where(eq(accountingProfiles.clientId, parseInt(clientId)))
        .returning();

      if (!updated) {
        return res.status(404).json({
          success: false,
          error: "Accounting profile not found",
        });
      }

      logger.info(`Updated accounting profile for client ${clientId}`);

      res.json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      logger.error("Error updating accounting profile:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({
          success: false,
          error: "Invalid input data",
          details: error.errors,
        });
      }
      res.status(500).json({
        success: false,
        error: error.message || "Failed to update accounting profile",
      });
    }
  }
);

// ==========================================
// DELETE /api/accounting-profiles/:clientId
// Delete accounting profile for a client
// ==========================================
router.delete("/:clientId",
  apiLimiter,
  requirePermission('clients', 'manage'),
  async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;

      await db
        .delete(accountingProfiles)
        .where(eq(accountingProfiles.clientId, parseInt(clientId)));

      logger.info(`Deleted accounting profile for client ${clientId}`);

      res.json({
        success: true,
        message: "Accounting profile deleted successfully",
      });
    } catch (error: any) {
      logger.error("Error deleting accounting profile:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to delete accounting profile",
      });
    }
  }
);

// ==========================================
// POST /api/accounting-profiles/:clientId/upsert
// Create or update accounting profile (convenience endpoint)
// ==========================================
router.post("/:clientId/upsert",
  apiLimiter,
  requirePermission('clients', 'manage'),
  async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const data = { ...req.body, clientId: parseInt(clientId) };

      // Check if profile exists
      const [existingProfile] = await db
        .select()
        .from(accountingProfiles)
        .where(eq(accountingProfiles.clientId, parseInt(clientId)));

      if (existingProfile) {
        // Update existing profile
        const validated = updateProfileSchema.parse(data);
        const updateData: any = { ...validated, updatedAt: new Date() };
        if (validated.formationDate) {
          updateData.formationDate = new Date(validated.formationDate);
        }

        const [updated] = await db
          .update(accountingProfiles)
          .set(updateData)
          .where(eq(accountingProfiles.clientId, parseInt(clientId)))
          .returning();

        logger.info(`Updated accounting profile for client ${clientId} via upsert`);

        return res.json({
          success: true,
          data: updated,
          action: "updated",
        });
      } else {
        // Create new profile
        const validated = createProfileSchema.parse(data);
        const profileData: any = { ...validated };
        if (validated.formationDate) {
          profileData.formationDate = new Date(validated.formationDate);
        }

        const [profile] = await db
          .insert(accountingProfiles)
          .values(profileData)
          .returning();

        logger.info(`Created accounting profile for client ${clientId} via upsert`);

        return res.status(201).json({
          success: true,
          data: profile,
          action: "created",
        });
      }
    } catch (error: any) {
      logger.error("Error upserting accounting profile:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({
          success: false,
          error: "Invalid input data",
          details: error.errors,
        });
      }
      res.status(500).json({
        success: false,
        error: error.message || "Failed to upsert accounting profile",
      });
    }
  }
);

export default router;
