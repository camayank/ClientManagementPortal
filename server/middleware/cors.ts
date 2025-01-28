import cors from "cors";
import { type CorsOptions } from "cors";

const whitelist = [
  // Allow our own domain and development URLs
  process.env.APP_URL || "http://localhost:5000",
  // Allow Replit development URLs
  /^https:\/\/.*\.repl\.co$/,
  /^https:\/\/.*\.replit\.dev$/
];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin matches any whitelist pattern
    const isAllowed = whitelist.some(pattern => {
      if (typeof pattern === 'string') {
        return origin === pattern;
      }
      return pattern.test(origin);
    });

    if (isAllowed || process.env.NODE_ENV === "development") {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  maxAge: 86400, // 24 hours
  exposedHeaders: ['Content-Length', 'Content-Type']
};

export const corsMiddleware = cors(corsOptions);