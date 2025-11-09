import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { corsMiddleware, handleOptions } from "./middleware/cors";
import { errorHandler } from "./middleware/error-handler";
import { requestLogger } from "./utils/logger";
import { createSessionMiddleware } from "./middleware/session";
import { setupVite } from "./vite";
import helmet from "helmet";

async function startServer() {
  try {
    logger.info("Starting server initialization...");
    const app = express();
    const isDevelopment = app.get("env") === "development";

    // Trust proxy must be set before rate limiter
    logger.info("Configuring proxy settings...");
    app.set('trust proxy', 1);

    // Essential middleware order
    logger.info("Setting up CORS...");
    app.use(corsMiddleware);
    app.use(handleOptions);

    logger.info("Setting up body parsers...");
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Session configuration
    logger.info("Setting up session middleware...");
    const sessionMiddleware = createSessionMiddleware(isDevelopment);
    app.use(sessionMiddleware);

    // Security headers
    logger.info("Configuring security headers...");
    if (isDevelopment) {
      app.use(
        helmet({
          contentSecurityPolicy: false,
          crossOriginEmbedderPolicy: false,
          crossOriginResourcePolicy: false,
          crossOriginOpenerPolicy: false,
          xFrameOptions: false,
        })
      );
    } else {
      app.use(helmet());
    }

    // Basic request logging
    logger.info("Setting up request logging...");
    app.use(requestLogger);


    // Register routes
    logger.info("Registering routes...");
    const server = registerRoutes(app);

    // Setup Vite in development
    if (isDevelopment) {
      logger.info("Setting up Vite dev server...");
      await setupVite(app, server);
    }

    // Error handling must be last
    logger.info("Setting up error handling...");
    app.use(errorHandler);

    // Start server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      logger.info(`Server running in ${app.get("env")} mode on port ${PORT}`);
    });

  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();