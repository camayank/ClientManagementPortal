import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { corsMiddleware, handleOptions } from "./middleware/cors";
import { errorHandler } from "./middleware/error-handler";
import { requestLogger } from "./utils/logger";
import { createSessionMiddleware } from "./middleware/session";
import helmet from "helmet";

async function startServer() {
  try {
    console.log("Starting server initialization...");
    const app = express();
    const isDevelopment = app.get("env") === "development";

    // Trust proxy must be set before rate limiter
    console.log("Configuring proxy settings...");
    app.set('trust proxy', 1);

    // Essential middleware order
    console.log("Setting up CORS...");
    app.use(corsMiddleware);
    app.use(handleOptions);

    console.log("Setting up body parsers...");
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Session configuration
    console.log("Setting up session middleware...");
    const sessionMiddleware = createSessionMiddleware(isDevelopment);
    app.use(sessionMiddleware);

    // Security headers
    console.log("Configuring security headers...");
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
    console.log("Setting up request logging...");
    app.use(requestLogger);


    // Register routes
    console.log("Registering routes...");
    const server = registerRoutes(app);

    // Error handling must be last
    console.log("Setting up error handling...");
    app.use(errorHandler);

    // Start server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Server running in ${app.get("env")} mode on port ${PORT}`);
    });

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();