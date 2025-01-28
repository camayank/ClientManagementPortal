import cors from "cors";
import { type CorsOptions } from "cors";

const whitelist = [
  // Allow our own domain and development URLs
  process.env.APP_URL || "http://localhost:5000",
  // Allow Replit development URLs
  /^https:\/\/.*\.repl\.co$/,
  /^https:\/\/.*\.replit\.dev$/,
  // Allow local development
  "http://localhost:3000",
  "http://127.0.0.1:5000"
];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin || process.env.NODE_ENV === "development") {
      return callback(null, true);
    }

    // Check if origin matches any whitelist pattern
    const isAllowed = whitelist.some(pattern => {
      if (typeof pattern === 'string') {
        return origin === pattern;
      }
      return pattern.test(origin);
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204,
  exposedHeaders: ['Content-Length', 'Content-Type']
};

export const corsMiddleware = cors(corsOptions);

// Additional middleware to ensure OPTIONS requests are handled properly
export const handleOptions = (req: any, res: any, next: any) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Max-Age', '86400');
    res.status(204).end();
    return;
  }
  next();
};