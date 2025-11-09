import { Router } from "express";
import { logger } from "../utils/logger";
import { requirePermission } from "../middleware/check-permission";
import { userManagementLimiter } from "../middleware/rate-limit";
import type { Request, Response } from "express";
import { AppError } from "../middleware/error-handler";
import { z } from "zod";
import { users } from "@db/schema";
import { db } from "@db";
import { eq } from 'drizzle-orm';

const router = Router();

const userQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
  role: z.enum(["admin", "client", "manager", "partner", "team_lead", "staff_accountant", "quality_reviewer", "compliance_officer"]).optional(),
});

// User management routes with rate limiting and validation
router.get("/", 
  userManagementLimiter,
  requirePermission('users', 'read'), 
  async (req: Request, res: Response) => {
    try {
      const queryParams = userQuerySchema.safeParse(req.query);
      if (!queryParams.success) {
        throw new AppError("Invalid query parameters", 400);
      }

      const { page, limit, role } = queryParams.data;
      const offset = (page - 1) * limit;

      const userQuery = db.select({
        id: users.id,
        username: users.username,
        role: users.role,
        fullName: users.fullName,
        email: users.email,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
      })
      .from(users)
      .limit(limit)
      .offset(offset);

      if (role) {
        userQuery.where(eq(users.role, role));
      }

      const results = await userQuery;

      res.json({
        page,
        limit,
        data: results,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error("Error in user management:", error);
      throw new AppError(error.message || "User operation failed", error.statusCode || 500);
    }
  }
);

export default router;