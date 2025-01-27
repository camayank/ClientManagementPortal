import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as LinkedInStrategy } from "passport-linkedin-oauth2";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { users, roles, userRoles } from "@db/schema";
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

// JWT Configuration
const JWT_CONFIG = {
  access: {
    secret: JWT_SECRET,
    expiresIn: '15m',  // Access tokens expire in 15 minutes
  },
  refresh: {
    secret: JWT_SECRET,
    expiresIn: '7d',   // Refresh tokens expire in 7 days
  }
};

const REFRESH_TOKEN_EXPIRY = '7d';

// Validation schemas
const userInputSchema = z.object({
  username: z.string().email("Must be a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "client", "team_member", "partner"]).default("client"),
});

// Helper functions
async function hashPassword(password: string): Promise<string> {
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

function generateTokens(user: any) {
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

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "your-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: app.get("env") === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
    store: new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    }),
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

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

  // Local Strategy
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!user) {
        return done(null, false, { message: "Incorrect username." });
      }

      const isValidPassword = await comparePassword(password, user.password);
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

      const userWithRoles = {
        ...user,
        roles: userRolesData.map(r => r.roleName),
      };

      return done(null, userWithRoles);
    } catch (err) {
      return done(err);
    }
  }));

  passport.serializeUser((user: any, done) => {
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

      const userRolesData = await db
        .select({
          roleName: roles.name,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, user.id));

      const userWithRoles = {
        ...user,
        roles: userRolesData.map(r => r.roleName),
      };

      done(null, userWithRoles);
    } catch (err) {
      done(err);
    }
  });

  // Auth Routes
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
          createdAt: new Date(),
        })
        .returning();

      // Get role ID and assign role
      const [roleRecord] = await db
        .select()
        .from(roles)
        .where(eq(roles.name, role))
        .limit(1);

      if (roleRecord) {
        await db.insert(userRoles)
          .values({
            userId: newUser.id,
            roleId: roleRecord.id
          });
      }

      res.status(201).json({
        message: "Registration successful",
        user: {
          id: newUser.id,
          username: newUser.username,
          role
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

  app.post("/api/auth/login", async (req, res, next) => {
    passport.authenticate("local", async (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(400).send(info.message ?? "Login failed");
      }

      // Check if MFA is required for admin role
      if (user.role === 'admin' && user.mfaEnabled) {
        const tempToken = jwt.sign(
          { id: user.id, temp: true },
          JWT_SECRET,
          { expiresIn: '5m' }
        );
        return res.json({
          requiresMfa: true,
          tempToken
        });
      }

      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }

        const tokens = generateTokens(user);
        return res.json({
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            roles: user.roles,
          },
          ...tokens
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/refresh", (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).send("Refresh token required");
    }

    try {
      const payload = jwt.verify(refreshToken, JWT_CONFIG.refresh.secret) as { id: number; type: string };
      if(payload.type !== 'refresh'){
        return res.status(401).send("Invalid refresh token");
      }
      const tokens = generateTokens({ id: payload.id });
      res.json(tokens);
    } catch (error) {
      res.status(401).send("Invalid refresh token");
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).send("Logout failed");
      }
      res.json({ message: "Logout successful" });
    });
  });

  // Protected route example
  app.get("/api/auth/user", (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user;
      return res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        roles: user.roles,
        mfaEnabled: user.mfaEnabled
      });
    }
    res.status(401).send("Not authenticated");
  });

  // Configure social login if credentials are available
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback"
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
              provider: "google",
              providerId: profile.id,
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
      callbackURL: "/auth/linkedin/callback",
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
              provider: "linkedin",
              providerId: profile.id,
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

  // Social login routes
  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  app.get('/auth/linkedin', passport.authenticate('linkedin'));

  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
      const tokens = generateTokens(req.user);
      res.redirect(`/auth/success?tokens=${encodeURIComponent(JSON.stringify(tokens))}`);
    }
  );

  app.get('/auth/linkedin/callback',
    passport.authenticate('linkedin', { failureRedirect: '/login' }),
    (req, res) => {
      const tokens = generateTokens(req.user);
      res.redirect(`/auth/success?tokens=${encodeURIComponent(JSON.stringify(tokens))}`);
    }
  );
  //MFA routes -  Retained from original code.
  app.post("/api/auth/mfa/setup", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    const secret = speakeasy.generateSecret();
    const otpAuthUrl = speakeasy.otpauthURL({
      secret: secret.base32,
      label: req.user.username,
      issuer: 'ClientPortal'
    });

    try {
      const qrCode = await QRCode.toDataURL(otpAuthUrl);

      // Store the secret temporarily
      await db.update(users)
        .set({
          mfaSecret: secret.base32,
          mfaEnabled: false
        })
        .where(eq(users.id, req.user.id));

      res.json({
        qrCode,
        secret: secret.base32
      });
    } catch (error) {
      console.error('MFA setup error:', error);
      res.status(500).send("Failed to setup MFA");
    }
  });

  // MFA Verify endpoint
  app.post("/api/auth/mfa/verify", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    const result = mfaVerifySchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).send(result.error.message);
    }

    const { token } = result.data;

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1);

      if (!user.mfaSecret) {
        return res.status(400).send("MFA not set up");
      }

      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token
      });

      if (verified) {
        await db.update(users)
          .set({ mfaEnabled: true })
          .where(eq(users.id, req.user.id));

        res.json({ message: "MFA verified and enabled" });
      } else {
        res.status(400).send("Invalid token");
      }
    } catch (error) {
      console.error('MFA verification error:', error);
      res.status(500).send("Failed to verify MFA");
    }
  });
}