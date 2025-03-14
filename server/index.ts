import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { apiLimiter, authLimiter, uploadLimiter } from "./middleware/rate-limit";
import { corsMiddleware, handleOptions } from "./middleware/cors";
import { errorHandler } from "./middleware/error-handler";
import { requestLogger, errorLogger } from "./utils/logger";
import session from "express-session";
import helmet from "helmet";
import createMemoryStore from "memorystore";

const app = express();
const MemoryStore = createMemoryStore(session);

// Trust proxy must be set before rate limiter
app.set('trust proxy', 1);

// Request tracking middleware
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
      log(logLine);
    }
  });

  next();
});

// Essential middleware order
app.use(corsMiddleware);
app.use(handleOptions);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration for both HTTP and WebSocket
const isDevelopment = app.get("env") === "development";
export const sessionMiddleware = session({
  secret: process.env.REPL_ID || "client-portal-secret",
  resave: false,
  saveUninitialized: false,
  name: 'client-portal.sid',
  cookie: {
    secure: !isDevelopment,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: isDevelopment ? 'lax' : 'strict'
  },
  store: new MemoryStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  })
});

app.use(sessionMiddleware);

// Middleware to ensure JSON responses for API routes
app.use('/api', (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err) {
    return res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error'
    });
  }
  next();
});

// Security headers configuration - Development friendly
if (isDevelopment) {
  app.use(
    helmet({
      contentSecurityPolicy: false, // Disable CSP in development
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
      crossOriginOpenerPolicy: false,
      xFrameOptions: false, // Allow iframes in development
    })
  );
} else {
  // Production security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          connectSrc: ["'self'", "https:", "http:", "ws:", "wss:"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          fontSrc: ["'self'", "https:", "data:"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: true,
      crossOriginResourcePolicy: { policy: "same-origin" },
      crossOriginOpenerPolicy: { policy: "same-origin" },
    })
  );
}

// Logging
app.use(requestLogger);

// Rate limiting
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/documents/upload", uploadLimiter);
app.use("/api", apiLimiter);

(async () => {
  const server = registerRoutes(app);

  // Error handling
  app.use(errorLogger);
  app.use(errorHandler);

  // Static file serving based on environment
  if (isDevelopment) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Start server
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    log(`Server running in ${app.get("env")} mode on port ${PORT}`);
  });
})();