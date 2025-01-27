import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { users, roles, userRoles, type User } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { z } from "zod";
import crypto from "crypto";

const SALT_ROUNDS = 10;
const RESET_TOKEN_EXPIRES = 60 * 60 * 1000; // 1 hour in milliseconds

// Create schema for user input validation
const userInputSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  role: z.enum(["admin", "client"]).default("client"),
});

const passwordResetRequestSchema = z.object({
  username: z.string().email()
});

const passwordResetSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(6)
});

// Define a type that extends the base User type from schema
type AuthUser = Omit<User, 'password'> & {
  roles?: string[];
};

declare global {
  namespace Express {
    interface User extends AuthUser {}
  }
}

// Store reset tokens in memory (in production, use Redis or similar)
const passwordResetTokens = new Map<string, { username: string, expires: number }>();

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
}

function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "client-portal-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: app.get("env") === "production",
    },
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log("Attempting login for username:", username);
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          console.log("User not found");
          return done(null, false, { message: "Incorrect username." });
        }

        console.log("Found user:", { ...user, password: '[REDACTED]' });

        const isValidPassword = await comparePassword(password, user.password);
        console.log("Password validation result:", isValidPassword);

        if (!isValidPassword) {
          return done(null, false, { message: "Incorrect password." });
        }

        // Get user roles
        const userRolesData = await db
          .select({
            roleName: roles.name,
          })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(eq(userRoles.userId, user.id));

        console.log("User roles:", userRolesData);

        const userWithRoles: AuthUser = {
          ...user,
          password: undefined,
          roles: userRolesData.map(r => r.roleName),
        };

        // Update last login timestamp
        await db.update(users)
          .set({ lastLogin: new Date() })
          .where(eq(users.id, user.id));

        return done(null, userWithRoles);
      } catch (err) {
        console.error("Login error:", err);
        return done(err);
      }
    })
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        return done(null, false);
      }

      // Get user roles
      const userRolesData = await db
        .select({
          roleName: roles.name,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, user.id));

      const userWithRoles: AuthUser = {
        ...user,
        password: undefined,
        roles: userRolesData.map(r => r.roleName),
      };

      done(null, userWithRoles);
    } catch (err) {
      console.error("Deserialize error:", err);
      done(err);
    }
  });

  app.post("/api/request-password-reset", async (req, res) => {
    try {
      const result = passwordResetRequestSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).send("Invalid email address");
      }

      const { username } = result.data;
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!user) {
        // Don't reveal if user exists
        return res.json({ message: "If an account exists with this email, you will receive a password reset link." });
      }

      const token = generateResetToken();
      const expires = Date.now() + RESET_TOKEN_EXPIRES;

      // Store token
      passwordResetTokens.set(token, {
        username: user.username,
        expires,
      });

      // In production, send email with reset link
      console.log(`Password reset token for ${username}: ${token}`);

      res.json({ message: "If an account exists with this email, you will receive a password reset link." });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).send("Internal server error");
    }
  });

  app.post("/api/reset-password", async (req, res) => {
    try {
      const result = passwordResetSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).send("Invalid input");
      }

      const { token, newPassword } = result.data;
      const resetData = passwordResetTokens.get(token);

      if (!resetData || resetData.expires < Date.now()) {
        passwordResetTokens.delete(token);
        return res.status(400).send("Invalid or expired reset token");
      }

      const hashedPassword = await hashPassword(newPassword);

      // Update password in database
      await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.username, resetData.username));

      // Remove used token
      passwordResetTokens.delete(token);

      res.json({ message: "Password successfully reset" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).send("Internal server error");
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log("Login attempt:", req.body.username);
    console.log("Request body:", { ...req.body, password: '[REDACTED]' });

    passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
      if (err) {
        console.error("Authentication error:", err);
        return next(err);
      }

      if (!user) {
        console.log("Authentication failed:", info.message);
        return res.status(400).send(info.message ?? "Login failed");
      }

      req.logIn(user, (err) => {
        if (err) {
          console.error("Login error:", err);
          return next(err);
        }

        return res.json({
          id: user.id,
          username: user.username,
          role: user.role,
          roles: user.roles,
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).send("Logout failed");
      }
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user;
      return res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        roles: user.roles,
      });
    }
    res.status(401).send("Not logged in");
  });
}