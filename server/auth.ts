import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as LinkedInStrategy } from "passport-linkedin-oauth2";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { users, type SelectUser } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { z } from "zod";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import jwt from "jsonwebtoken";

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required for authentication");
}

const JWT_CONFIG = {
  access: {
    secret: JWT_SECRET,
    expiresIn: '15m',
  },
  refresh: {
    secret: JWT_SECRET,
    expiresIn: '7d',
  }
};

declare global {
  namespace Express {
    interface User extends SelectUser {
      roles?: string[];
    }
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function comparePassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: app.get("env") === "production",
      maxAge: 24 * 60 * 60 * 1000,
    },
    store: new MemoryStore({
      checkPeriod: 86400000,
    }),
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Local Strategy Setup
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      console.log(`[Auth] Login attempt for username: ${username}`);

      // Find user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!user) {
        console.log(`[Auth] User not found: ${username}`);
        return done(null, false, { message: "Invalid credentials" });
      }

      // Compare password
      const isValidPassword = await comparePassword(password, user.password);
      console.log(`[Auth] Password validation result for ${username}:`, isValidPassword);

      if (!isValidPassword) {
        console.log(`[Auth] Invalid password for user: ${username}`);
        return done(null, false, { message: "Invalid credentials" });
      }

      console.log(`[Auth] Successful login for user: ${username} (${user.role})`);
      return done(null, user);
    } catch (err) {
      console.error('[Auth] Login error:', err);
      return done(err);
    }
  }));

  passport.serializeUser((user: any, done) => {
    console.log(`[Auth] Serializing user: ${user.id}`);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`[Auth] Deserializing user: ${id}`);
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        console.log(`[Auth] User not found during deserialization: ${id}`);
        return done(null, false);
      }

      console.log(`[Auth] Successfully deserialized user: ${id} (${user.role})`);
      done(null, user);
    } catch (err) {
      console.error('[Auth] Deserialization error:', err);
      done(err);
    }
  });

  // Authentication Routes
  app.post("/api/auth/login", (req, res, next) => {
    console.log('[Auth] Login request received:', req.body.username);

    passport.authenticate("local", async (err: any, user: Express.User | false, info: any) => {
      if (err) {
        console.error('[Auth] Authentication error:', err);
        return res.status(500).json({ message: "Internal server error" });
      }

      if (!user) {
        console.log('[Auth] Login failed:', info?.message);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.logIn(user, async (err) => {
        if (err) {
          console.error('[Auth] Login error:', err);
          return res.status(500).json({ message: "Login failed" });
        }

        try {
          // Update last login timestamp
          await db.update(users)
            .set({ lastLogin: new Date() })
            .where(eq(users.id, user.id));

          console.log(`[Auth] User logged in successfully: ${user.id} (${user.role})`);

          // Send user info and role
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
          console.error('[Auth] Post-login error:', error);
          return res.status(500).json({ message: "Login successful but failed to update last login" });
        }
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    console.log('[Auth] Logout request received');
    req.logout((err) => {
      if (err) {
        console.error('[Auth] Logout error:', err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as Express.User;
    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
      fullName: user.fullName
    });
  });

  // JWT Strategy
  passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: JWT_SECRET,
  }, async (payload, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.id))
        .limit(1);

      if (!user) {
        return done(null, false);
      }

      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  }));


  function generateTokens(user: Express.User) {
    const accessToken = jwt.sign(
      {
        id: user.id,
        role: user.role,
        type: 'access'
      },
      JWT_CONFIG.access.secret,
      { expiresIn: JWT_CONFIG.access.expiresIn }
    );

    const refreshToken = jwt.sign(
      {
        id: user.id,
        type: 'refresh'
      },
      JWT_CONFIG.refresh.secret,
      { expiresIn: JWT_CONFIG.refresh.expiresIn }
    );

    return { accessToken, refreshToken };
  }

  app.post("/api/auth/refresh", (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).send("Refresh token required");
    }

    try {
      const payload = jwt.verify(refreshToken, JWT_CONFIG.refresh.secret) as { id: number; type: string };
      if (payload.type !== 'refresh') {
        return res.status(401).send("Invalid refresh token");
      }
      const tokens = generateTokens({ id: payload.id } as Express.User);
      res.json(tokens);
    } catch (error) {
      res.status(401).send("Invalid refresh token");
    }
  });


  // Configure OAuth providers if credentials exist
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
      scope: ['profile', 'email']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        let [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, profile.emails![0].value))
          .limit(1);

        if (!user) {
          const [newUser] = await db.insert(users)
            .values({
              username: profile.emails![0].value,
              email: profile.emails![0].value,
              password: await hashPassword(Math.random().toString(36)),
              role: "client",
              fullName: profile.displayName,
              createdAt: new Date()
            })
            .returning();
          user = newUser;
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }));
  }

  if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
    passport.use(new LinkedInStrategy({
      clientID: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      callbackURL: "/api/auth/linkedin/callback",
      scope: ['r_emailaddress', 'r_liteprofile']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        let [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, profile.emails![0].value))
          .limit(1);

        if (!user) {
          const [newUser] = await db.insert(users)
            .values({
              username: profile.emails![0].value,
              email: profile.emails![0].value,
              password: await hashPassword(Math.random().toString(36)),
              role: "client",
              fullName: profile.displayName,
              createdAt: new Date()
            })
            .returning();
          user = newUser;
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }));
  }

  // OAuth routes
  app.get('/api/auth/google', passport.authenticate('google'));
  app.get('/api/auth/linkedin', passport.authenticate('linkedin'));

  app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
      const tokens = generateTokens(req.user!);
      res.redirect(`/auth/success?tokens=${encodeURIComponent(JSON.stringify(tokens))}`);
    }
  );

  app.get('/api/auth/linkedin/callback',
    passport.authenticate('linkedin', { failureRedirect: '/login' }),
    (req, res) => {
      const tokens = generateTokens(req.user!);
      res.redirect(`/auth/success?tokens=${encodeURIComponent(JSON.stringify(tokens))}`);
    }
  );

  app.post("/api/auth/register", async (req, res) => {
    try {
      const result = userInputSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: result.error.issues
        });
      }

      const { username, password, role } = result.data;

      // Check if user exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({
          message: "Username already exists"
        });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const [newUser] = await db.insert(users)
        .values({
          username,
          password: hashedPassword,
          role,
          email: username, // Since username is email
          createdAt: new Date(),
        })
        .returning();

      res.status(201).json({
        message: "Registration successful",
        user: {
          id: newUser.id,
          username: newUser.username,
          role: newUser.role,
          email: newUser.email
        }
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        message: "Registration failed",
        error: (error as Error).message
      });
    }
  });
}

const userInputSchema = z.object({
  username: z.string().email("Must be a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "client", "team_member", "partner"]).default("client"),
});