import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { clients } from "@db/schema";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Client management routes
  app.get("/api/clients", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") {
      return res.status(403).send("Unauthorized");
    }

    const clientList = await db.select().from(clients);
    res.json(clientList);
  });

  const httpServer = createServer(app);
  return httpServer;
}
