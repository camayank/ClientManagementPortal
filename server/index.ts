import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";
import { apiLimiter, authLimiter, uploadLimiter } from "./middleware/rate-limit";
import { corsMiddleware } from "./middleware/cors";
import { errorHandler } from "./middleware/error-handler";
import { requestLogger, errorLogger } from "./utils/logger";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

// Trust proxy must be set before rate limiter
app.set('trust proxy', 1);

// Apply security headers with development-friendly config
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "wss:", "https:", "http:"],
      fontSrc: ["'self'", "data:", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin" }
}));

// Apply CORS middleware first
app.use(corsMiddleware);

// Add request logging with tracing
app.use(requestLogger);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Apply rate limiting middleware
app.use("/api/login", authLimiter);
app.use("/api/register", authLimiter);
app.use("/api/documents/upload", uploadLimiter);
app.use("/api", apiLimiter);

(async () => {
  const server = registerRoutes(app);

  // Add error logging
  app.use(errorLogger);

  // Global error handler
  app.use(errorHandler);

  if (process.env.NODE_ENV === "production") {
    console.log("Running in production mode");
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const publicDir = path.resolve(__dirname, "public");
    console.log("Serving static files from:", publicDir);

    // Serve static files
    app.use(express.static(publicDir));

    // Serve index.html for all non-API routes
    app.get("*", (req, res, next) => {
      if (!req.path.startsWith("/api")) {
        res.sendFile(path.resolve(publicDir, "index.html"));
      } else {
        next();
      }
    });
  } else {
    console.log("Running in development mode");
    await setupVite(app, server);
  }

  // ALWAYS serve the app on port 5000
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
    log(`Server listening on port ${PORT}`);
  });
})();