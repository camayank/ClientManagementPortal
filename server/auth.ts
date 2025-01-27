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
import nodemailer from "nodemailer";
import type { User } from "@db/schema";
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

// Extend Express User type
declare global {
  namespace Express {
    interface User extends User {}
  }
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

  // Configure local strategy with proper error handling
  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  }, async (email, password, done) => {
    try {
      console.log("[Auth] Login attempt for:", email);

      const [user] = await db
        .select()
        .from(users)
        .where(ilike(users.email, email))
        .limit(1);

      if (!user) {
        console.log("[Auth] User not found:", email);
        return done(null, false, { message: "Invalid email or password" });
      }

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

  // Registration endpoint with validation
  app.post("/api/auth/register", async (req, res) => {
    try {
      console.log("[Auth] Registration attempt for:", req.body.email);

      // Validate input
      const validationResult = registerSchema.safeParse(req.body);
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(err => ({
          field: err.path[0],
          message: err.message
        }));
        return res.status(400).json({ errors });
      }

      const { email, password } = validationResult.data;

      // Check if user exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(ilike(users.email, email))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({
          errors: [{
            field: "email",
            message: "Email already registered"
          }]
        });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const [user] = await db.insert(users)
        .values({
          email,
          username: email,
          password: hashedPassword,
          role: 'client',
          isEmailVerified: false,
          verificationToken: generateToken(),
        })
        .returning();

      console.log("[Auth] User registered successfully:", user.id);

      // Login user after registration
      req.login(user, (err) => {
        if (err) {
          console.error("[Auth] Auto-login error after registration:", err);
          return res.status(500).json({ message: "Registration successful but login failed" });
        }
        res.json({
          message: "Registration successful",
          user: {
            id: user.id,
            email: user.email,
            role: user.role
          }
        });
      });
    } catch (error) {
      console.error("[Auth] Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
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

    passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
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

  // Secure forgot password implementation
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      console.log("[Auth] Password reset request for:", email);

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(ilike(users.email, email))
        .limit(1);

      if (!user) {
        // Don't reveal user existence
        console.log("[Auth] No user found for password reset:", email);
        return res.json({ 
          message: "If an account exists with that email, a password reset link has been sent." 
        });
      }

      const resetToken = generateToken();
      const expires = new Date();
      expires.setHours(expires.getHours() + 1); // Token expires in 1 hour

      await db.update(users)
        .set({
          resetPasswordToken: resetToken,
          resetPasswordExpires: expires
        })
        .where(eq(users.id, user.id));

      console.log("[Auth] Password reset token generated for:", email);

      // In development, return the token for testing
      if (process.env.NODE_ENV === 'development') {
        res.json({
          message: "Password reset token generated",
          token: resetToken
        });
      } else {
        // In production, only return a generic message
        res.json({
          message: "If an account exists with that email, a password reset link has been sent."
        });
      }
    } catch (error) {
      console.error("[Auth] Password reset error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Secure password reset implementation
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const validationResult = loginSchema.extend({
        token: z.string(),
        confirmPassword: z.string()
      }).refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
      }).safeParse(req.body);

      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(err => ({
          field: err.path[0],
          message: err.message
        }));
        return res.status(400).json({ errors });
      }

      const { token, password } = validationResult.data;
      console.log("[Auth] Password reset attempt with token");

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.resetPasswordToken, token))
        .limit(1);

      if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
        console.log("[Auth] Invalid or expired password reset token");
        return res.status(400).json({ message: "Password reset token is invalid or has expired" });
      }

      const hashedPassword = await hashPassword(password);

      await db.update(users)
        .set({
          password: hashedPassword,
          resetPasswordToken: null,
          resetPasswordExpires: null
        })
        .where(eq(users.id, user.id));

      console.log("[Auth] Password reset successful for user:", user.id);
      res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error("[Auth] Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Enhanced logout route with session cleanup
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
}