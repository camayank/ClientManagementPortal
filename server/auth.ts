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
import { type User } from "@db/schema";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

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

  passport.use(new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password'
  }, async (username, password, done) => {
    try {
      console.log("[Auth] Login attempt for:", username);

      const [user] = await db
        .select()
        .from(users)
        .where(ilike(users.email, username))
        .limit(1);

      if (!user) {
        console.log("[Auth] User not found:", username);
        return done(null, false, { message: "Invalid email or password" });
      }

      console.log("[Auth] Found user:", username, "Role:", user.role);

      const isValid = await bcrypt.compare(password, user.password);
      console.log("[Auth] Password validation result:", isValid);

      if (!isValid) {
        console.log("[Auth] Invalid password for user:", username);
        return done(null, false, { message: "Invalid email or password" });
      }

      return done(null, user);
    } catch (err) {
      console.error("[Auth] Login error:", err);
      return done(err);
    }
  }));

  passport.serializeUser((user: Express.User, done) => {
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

      console.log("[Auth] Successfully deserialized user:", id);
      done(null, user);
    } catch (err) {
      console.error("[Auth] Deserialization error:", err);
      done(err);
    }
  });

  // Enhanced login route with better error handling
  app.post("/api/auth/login", (req, res, next) => {
    console.log("[Auth] Login request received:", req.body.username);

    if (!req.body.username || !req.body.password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    passport.authenticate("local", async (err: any, user: Express.User | false, info: any) => {
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
              username: user.username,
              role: user.role,
              email: user.email,
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
      const { token, password } = req.body;
      console.log("[Auth] Password reset attempt with token");

      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }

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
}