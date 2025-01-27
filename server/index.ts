import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";
import { apiLimiter, authLimiter, uploadLimiter } from "./middleware/rate-limit";
import { corsMiddleware } from "./middleware/cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

// Trust proxy must be set before rate limiter
app.set('trust proxy', 1);

// Apply CORS middleware first
app.use(corsMiddleware);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Apply rate limiting middleware
app.use("/api/login", authLimiter);
app.use("/api/register", authLimiter);
app.use("/api/documents/upload", uploadLimiter);
app.use("/api", apiLimiter);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = registerRoutes(app);

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log the error for debugging
    console.error(`[Error] ${status}: ${message}`);
    if (err.stack) {
      console.error(err.stack);
    }

    // Send error response
    res.status(status).json({ 
      message,
      // Only include error details in development
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  });

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
  server.listen(PORT, () => {
    log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
    log(`Server listening on port ${PORT}`);
  });
})();