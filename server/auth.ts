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
import { AppError } from "./middleware/error-handler";

const SALT_ROUNDS = 10;
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

// User input validation schemas
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.string().optional(),
  email: z.string().email("Invalid email address").optional(),
  fullName: z.string().optional(),
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
    throw new AppError('Authentication failed', 401);
  }
}

export function setupAuth(app: Express) {
  // Verify required environment variables
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is required');
  }

  const MemoryStore = createMemoryStore(session);
  const isDevelopment = app.get("env") === "development";

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: 'client-portal.sid',
    cookie: {
      secure: !isDevelopment, // Only allow HTTPS in production
      httpOnly: true,
      maxAge: SESSION_MAX_AGE,
      sameSite: isDevelopment ? 'lax' : 'strict'
    },
    store: new MemoryStore({
      checkPeriod: SESSION_MAX_AGE // Cleanup expired sessions
    })
  };

  if (!isDevelopment) {
    app.set("trust proxy", 1); // Trust first proxy in production
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

  app.post("/api/auth/login", async (req, res, next) => {
    try {
      const validatedInput = loginSchema.safeParse(req.body);
      if (!validatedInput.success) {
        throw new AppError('Validation error', 400);
      }

      passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
        if (err) {
          logger.error("Authentication error:", err);
          return next(new AppError('Internal server error', 500));
        }

        if (!user) {
          return next(new AppError(info?.message || "Authentication failed", 401));
        }

        req.logIn(user, (loginErr) => {
          if (loginErr) {
            logger.error("Login error:", loginErr);
            return next(new AppError('Login failed', 500));
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
      next(error);
    }
  });

  app.post("/api/auth/logout", (req, res, next) => {
    try {
      const username = req.user?.username;
      req.logout((err) => {
        if (err) {
          logger.error("Logout error:", err);
          return next(new AppError('Logout failed', 500));
        }
        logger.info(`User ${username} logged out successfully`);
        res.json({ 
          status: 'success',
          message: "Logged out successfully" 
        });
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/auth/me", (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        throw new AppError('Not authenticated', 401);
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
    } catch (error) {
      next(error);
    }
  });

  // Registration endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      const validatedInput = registerSchema.safeParse(req.body);
      if (!validatedInput.success) {
        return res.status(400).json({ 
          ok: false, 
          message: validatedInput.error.errors[0].message 
        });
      }

      const { username, password, role, email, fullName } = validatedInput.data;

      // Validate role against allowed values
      const allowedRoles = ['admin', 'manager', 'staff', 'client'] as const;
      const userRole = (role && allowedRoles.includes(role as any)) ? role as typeof allowedRoles[number] : 'client';

      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser.length > 0) {
        return res.status(400).json({ 
          ok: false, 
          message: "Username already exists" 
        });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          role: userRole,
          email: email || null,
          fullName: fullName || null,
        })
        .returning();

      logger.info(`New user registered: ${username}`);

      // Auto-login the user after registration
      const authUser: AuthUser = {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        email: newUser.email || undefined,
        roles: [],
        fullName: newUser.fullName || undefined
      };

      req.logIn(authUser, (loginErr) => {
        if (loginErr) {
          logger.error("Auto-login error after registration:", loginErr);
          return res.status(500).json({ 
            ok: false, 
            message: "Registration successful but login failed" 
          });
        }

        return res.json({ 
          ok: true, 
          user: {
            id: newUser.id,
            username: newUser.username,
            role: newUser.role,
            email: newUser.email,
          }
        });
      });
    } catch (error) {
      logger.error("Registration error:", error);
      next(error);
    }
  });

  // Alias routes for frontend compatibility
  app.post("/api/login", async (req, res, next) => {
    try {
      const validatedInput = loginSchema.safeParse(req.body);
      if (!validatedInput.success) {
        throw new AppError('Validation error', 400);
      }

      passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
        if (err) {
          logger.error("Authentication error:", err);
          return res.status(500).json({ ok: false, message: 'Internal server error' });
        }

        if (!user) {
          return res.status(401).json({ ok: false, message: info?.message || "Authentication failed" });
        }

        req.logIn(user, (loginErr) => {
          if (loginErr) {
            logger.error("Login error:", loginErr);
            return res.status(500).json({ ok: false, message: 'Login failed' });
          }

          logger.info(`User ${user.username} logged in successfully`);
          return res.json({
            ok: true,
            user: {
              id: user.id,
              username: user.username,
              role: user.role,
              roles: user.roles,
              email: user.email,
            }
          });
        });
      })(req, res, next);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/logout", (req, res, next) => {
    try {
      const username = req.user?.username;
      req.logout((err) => {
        if (err) {
          logger.error("Logout error:", err);
          return res.status(500).json({ ok: false, message: 'Logout failed' });
        }
        logger.info(`User ${username} logged out successfully`);
        res.json({ 
          ok: true,
          message: "Logged out successfully" 
        });
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/user", (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json(null);
      }

      const user = req.user;
      return res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        roles: user.roles,
        email: user.email,
        fullName: user.fullName,
      });
    } catch (error) {
      next(error);
    }
  });
}