import { Router } from "express";
import { requirePermission } from "../middleware/check-permission";
import { apiLimiter } from "../middleware/rate-limit";
import { logger } from "../utils/logger";
import type { Request, Response } from "express";
import { db } from "@db";
import { clients } from "@db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", 
  apiLimiter,
  requirePermission('clients', 'read'), 
  async (req: Request, res: Response) => {
    try {
      const allClients = await db.query.clients.findMany({
        orderBy: (clients, { desc }) => [desc(clients.createdAt)]
      });
      res.json(allClients);
    } catch (error: any) {
      logger.error("Error fetching clients:", error);
      res.status(500).json({
        message: error.message || "Failed to fetch clients"
      });
    }
  }
);

router.post("/",
  apiLimiter,
  requirePermission('clients', 'manage'),
  async (req: Request, res: Response) => {
    try {
      const { company, industry, contactEmail, phone, address, status } = req.body;
      
      const [newClient] = await db.insert(clients).values({
        company,
        industry,
        contactEmail,
        phone,
        address,
        status: status || 'active',
        updatedAt: new Date()
      }).returning();

      res.status(201).json(newClient);
    } catch (error: any) {
      logger.error("Error creating client:", error);
      res.status(500).json({
        message: error.message || "Failed to create client"
      });
    }
  }
);

router.patch("/:id",
  apiLimiter,
  requirePermission('clients', 'manage'),
  async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.id);
      const updates = req.body;

      const [updatedClient] = await db
        .update(clients)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(clients.id, clientId))
        .returning();

      if (!updatedClient) {
        return res.status(404).json({ message: "Client not found" });
      }

      res.json(updatedClient);
    } catch (error: any) {
      logger.error("Error updating client:", error);
      res.status(500).json({
        message: error.message || "Failed to update client"
      });
    }
  }
);

router.delete("/:id",
  apiLimiter,
  requirePermission('clients', 'manage'),
  async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.id);

      const [deletedClient] = await db
        .delete(clients)
        .where(eq(clients.id, clientId))
        .returning();

      if (!deletedClient) {
        return res.status(404).json({ message: "Client not found" });
      }

      res.json({ message: "Client deleted successfully", client: deletedClient });
    } catch (error: any) {
      logger.error("Error deleting client:", error);
      res.status(500).json({
        message: error.message || "Failed to delete client"
      });
    }
  }
);

export default router;