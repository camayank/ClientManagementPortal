import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { users, roles, userRoles } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { z } from "zod";
import { logger } from "./utils/logger";
import crypto from "crypto";

const SALT_ROUNDS = 10;
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

// User input validation schemas
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Define the AuthUser type properly
interface AuthUser {
  id: number;
  username: string;
  role: string;
  email?: string;
  roles?: string[];
  fullName?: string;
}

declare global {
  namespace Express {
    interface User extends AuthUser {}
  }
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function comparePassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    logger.error('Error comparing passwords:', error);
    return false;
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const isDevelopment = app.get("env") === "development";

  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "client-portal-secret",
    resave: false,
    saveUninitialized: false,
    name: 'client-portal.sid',
    cookie: {
      secure: !isDevelopment,
      httpOnly: true,
      maxAge: SESSION_MAX_AGE,
      sameSite: isDevelopment ? 'lax' : 'strict'
    },
    store: new MemoryStore({
      checkPeriod: SESSION_MAX_AGE
    })
  };

  if (!isDevelopment) {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const [user] = await db.select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          logger.info(`Login attempt failed: user not found - ${username}`);
          return done(null, false, { message: "Invalid credentials" });
        }

        const isValidPassword = await comparePassword(password, user.password);
        if (!isValidPassword) {
          logger.info(`Login attempt failed: invalid password - ${username}`);
          return done(null, false, { message: "Invalid credentials" });
        }

        // Get user roles
        const userRolesData = await db
          .select({
            roleName: roles.name,
          })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(eq(userRoles.userId, user.id));

        const authUser: AuthUser = {
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email || undefined,
          roles: userRolesData.map(r => r.roleName),
          fullName: user.fullName || undefined
        };

        logger.info(`User logged in successfully: ${username}`);
        return done(null, authUser);
      } catch (err) {
        logger.error('Login error:', err);
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
        logger.warn(`Session invalid: user not found - ID: ${id}`);
        return done(null, false);
      }

      const userRolesData = await db
        .select({
          roleName: roles.name,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, user.id));

      const authUser: AuthUser = {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email || undefined,
        roles: userRolesData.map(r => r.roleName),
        fullName: user.fullName || undefined
      };

      done(null, authUser);
    } catch (err) {
      logger.error('Session deserialize error:', err);
      done(err);
    }
  });

  // Authentication endpoints
  app.post("/api/auth/login", async (req, res, next) => {
    try {
      const validatedInput = loginSchema.safeParse(req.body);
      if (!validatedInput.success) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation error',
          errors: validatedInput.error.errors
        });
      }

      passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
        if (err) {
          logger.error("Authentication error:", err);
          return res.status(500).json({ 
            status: 'error',
            message: "Internal server error" 
          });
        }

        if (!user) {
          return res.status(401).json({ 
            status: 'error',
            message: info?.message || "Authentication failed" 
          });
        }

        req.logIn(user, (loginErr) => {
          if (loginErr) {
            logger.error("Login error:", loginErr);
            return res.status(500).json({ 
              status: 'error',
              message: "Login failed" 
            });
          }

          logger.info(`User ${user.username} logged in successfully`);
          return res.json({
            status: 'success',
            data: {
              user: {
                id: user.id,
                username: user.username,
                role: user.role,
                roles: user.roles,
                email: user.email,
              }
            }
          });
        });
      })(req, res, next);
    } catch (error) {
      logger.error("Unexpected error during login:", error);
      res.status(500).json({ 
        status: 'error',
        message: "An unexpected error occurred" 
      });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    const username = req.user?.username;
    req.logout((err) => {
      if (err) {
        logger.error("Logout error:", err);
        return res.status(500).json({ 
          status: 'error',
          message: "Logout failed" 
        });
      }
      logger.info(`User ${username} logged out successfully`);
      res.json({ 
        status: 'success',
        message: "Logged out successfully" 
      });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ 
        status: 'error',
        message: "Not authenticated" 
      });
    }

    const user = req.user;
    res.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          roles: user.roles,
          email: user.email,
        }
      }
    });
  });
  //Password reset endpoints remain unchanged.
  app.post("/api/auth/request-password-reset", async (req, res) => {
    try {
      const result = passwordResetRequestSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid email address" });
      }

      const { username } = result.data;
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!user) {
        return res.json({ message: "If an account exists with this email, you will receive a password reset link." });
      }

      const token = generateResetToken();
      const expires = Date.now() + RESET_TOKEN_EXPIRES;

      passwordResetTokens.set(token, {
        username: user.username,
        expires,
      });

      // In production, send email with reset link
      console.log(`Password reset token for ${username}: ${token}`);

      res.json({ message: "If an account exists with this email, you will receive a password reset link." });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const result = passwordResetSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid input" });
      }

      const { token, newPassword } = result.data;
      const resetData = passwordResetTokens.get(token);

      if (!resetData || resetData.expires < Date.now()) {
        passwordResetTokens.delete(token);
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      const hashedPassword = await hashPassword(newPassword);

      await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.username, resetData.username));

      passwordResetTokens.delete(token);

      res.json({ message: "Password successfully reset" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}

const passwordResetRequestSchema = z.object({
  username: z.string().email()
});

const passwordResetSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(6)
});

function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

const RESET_TOKEN_EXPIRES = 60 * 60 * 1000; // 1 hour in milliseconds
const passwordResetTokens = new Map<string, { username: string, expires: number }>();