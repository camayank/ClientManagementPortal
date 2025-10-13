import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketService } from "./websocket/server";
import { setupAuth } from "./auth";
import routes from "./routes/index";
import { createSessionMiddleware } from "./middleware/session";

export let wsService: WebSocketService;

export function registerRoutes(app: Express): Server {
  const isDevelopment = app.get("env") === "development";
  const sessionMiddleware = createSessionMiddleware(isDevelopment);

  setupAuth(app);
  const httpServer = createServer(app);
  wsService = new WebSocketService(httpServer, sessionMiddleware);

  // Mount all routes under /api
  app.use("/api", routes);

  // Add a simple health check endpoint
  app.get("/api/ping", (_, res) => res.json({ status: "ok" }));

  // Add alias route for /api/user (for frontend compatibility)
  app.get("/api/user", (req, res) => {
    try {
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json(null);
      }
      const user = req.user;
      return res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        roles: user.roles,
        email: user.email,
        fullName: user.fullName,
      });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return httpServer;
}