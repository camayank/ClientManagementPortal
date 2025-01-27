import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { users } from "@db/schema";
import { db } from "@db";
import { eq, ilike } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { z } from "zod";

const SALT_ROUNDS = 10;

// Validation schemas
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: app.get("env") === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      sameSite: 'lax'
    },
    store: new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie!.secure = true;
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure LocalStrategy to use email instead of username
  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  }, async (email, password, done) => {
    try {
      console.log("[Auth] Login attempt for:", email);

      // Find user by email (case insensitive)
      const [user] = await db
        .select()
        .from(users)
        .where(ilike(users.email, email))
        .limit(1);

      if (!user) {
        console.log("[Auth] User not found:", email);
        return done(null, false, { message: "Invalid email or password" });
      }

      // Compare password using bcrypt
      const isValid = await bcrypt.compare(password, user.password);
      console.log("[Auth] Password validation result:", isValid);

      if (!isValid) {
        console.log("[Auth] Invalid password for user:", email);
        return done(null, false, { message: "Invalid email or password" });
      }

      return done(null, user);
    } catch (err) {
      console.error("[Auth] Login error:", err);
      return done(err);
    }
  }));

  passport.serializeUser((user: any, done) => {
    console.log("[Auth] Serializing user:", user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log("[Auth] Deserializing user:", id);
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        console.log("[Auth] User not found during deserialization:", id);
        return done(null, false);
      }

      done(null, user);
    } catch (err) {
      console.error("[Auth] Deserialization error:", err);
      done(err);
    }
  });

  // Enhanced login route with validation
  app.post("/api/auth/login", (req, res, next) => {
    console.log("[Auth] Login request received for:", req.body.email);

    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => ({
        field: err.path[0],
        message: err.message
      }));
      return res.status(400).json({ errors });
    }

    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("[Auth] Authentication error:", err);
        return res.status(500).json({ message: "Internal server error" });
      }

      if (!user) {
        console.log("[Auth] Login failed:", info?.message);
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }

      req.logIn(user, async (err) => {
        if (err) {
          console.error("[Auth] Login error:", err);
          return res.status(500).json({ message: "Login failed" });
        }

        try {
          // Update last login timestamp
          await db.update(users)
            .set({ lastLogin: new Date() })
            .where(eq(users.id, user.id));

          console.log("[Auth] User logged in successfully:", user.id);
          res.json({
            user: {
              id: user.id,
              email: user.email,
              role: user.role,
              fullName: user.fullName
            }
          });
        } catch (error) {
          console.error("[Auth] Error updating last login:", error);
          next(error);
        }
      });
    })(req, res, next);
  });

  // User logout
  app.post("/api/auth/logout", (req, res) => {
    console.log("[Auth] Logout request received");

    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error("[Auth] Logout error:", err);
          return res.status(500).json({ message: "Logout failed" });
        }
        res.clearCookie('connect.sid');
        console.log("[Auth] Logout successful");
        res.json({ message: "Logout successful" });
      });
    } else {
      res.json({ message: "Already logged out" });
    }
  });

  // Get current user
  app.get("/api/auth/user", (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    const user = req.user as any;
    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName
    });
  });
}