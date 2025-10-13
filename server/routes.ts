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

  return httpServer;
}