import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketService } from "./websocket/server";
import { setupAuth } from "./auth";
import routes from "./routes/index";
import { sessionMiddleware } from "./index";

export let wsService: WebSocketService;

export function registerRoutes(app: Express): Server {
  setupAuth(app);
  const httpServer = createServer(app);
  wsService = new WebSocketService(httpServer, sessionMiddleware);

  // Mount all routes under /api
  app.use("/api", routes);

  return httpServer;
}