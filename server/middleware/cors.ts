import cors from "cors";
import { type CorsOptions } from "cors";

// Allow all origins in development, restricted in production
const whitelist = [
  process.env.APP_URL,
  "http://localhost:5000",
  "http://127.0.0.1:5000",
  /^https:\/\/.*\.repl\.co$/,
  /^https:\/\/.*\.replit\.dev$/
];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin matches any whitelist pattern
    const isAllowed = whitelist.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(origin);
      }
      return pattern === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400
};

export const corsMiddleware = cors(corsOptions);

// Handle preflight requests
export const handleOptions = (req: any, res: any, next: any) => {
  if (req.method === 'OPTIONS') {
    // Set CORS headers for preflight requests
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.header('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }
  next();
};