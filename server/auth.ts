import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as LinkedInStrategy } from "passport-linkedin-oauth2";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { users, roles, userRoles, type User } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { z } from "zod";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import jwt from "jsonwebtoken";

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';
const JWT_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '7d';

// Validation schemas
const userInputSchema = z.object({
  username: z.string().email("Must be a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "client", "team_member", "partner"]).default("client"),
});

const mfaSetupSchema = z.object({
  userId: z.number(),
  token: z.string()
});

const mfaVerifySchema = z.object({
  token: z.string()
});

// Extended User type with MFA and roles
type AuthUser = Omit<User, 'password'> & {
  roles?: string[];
  mfaEnabled?: boolean;
  mfaSecret?: string;
};

declare global {
  namespace Express {
    interface User extends AuthUser {}
  }
}

// Helper functions
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

function generateTokens(user: AuthUser) {
  const accessToken = jwt.sign({ id: user.id, roles: user.roles }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  const refreshToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
  return { accessToken, refreshToken };
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "client-portal-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      secure: app.get("env") === "production",
    },
    store: new MemoryStore({
      checkPeriod: 86400000,
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

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

      const userForSession: AuthUser = {
        id: user.id,
        username: user.username,
        role: user.role,
        roles: userRolesData.map(r => r.roleName),
        mfaEnabled: user.mfaEnabled,
      };

      // Update last login timestamp
      await db.update(users)
        .set({ lastLogin: new Date() })
        .where(eq(users.id, user.id));

      return done(null, userForSession);
    } catch (err) {
      return done(err);
    }
  }));

  // Social login strategies
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        let [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, profile.emails![0].value))
          .limit(1);

        if (!user) {
          const [newUser] = await db.insert(users)
            .values({
              username: profile.emails![0].value,
              password: await hashPassword(Math.random().toString(36)),
              role: 'client',
              fullName: profile.displayName,
              email: profile.emails![0].value,
              provider: 'google',
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
      scope: ['r_emailaddress', 'r_liteprofile'],
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        let [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, profile.emails![0].value))
          .limit(1);

        if (!user) {
          const [newUser] = await db.insert(users)
            .values({
              username: profile.emails![0].value,
              password: await hashPassword(Math.random().toString(36)),
              role: 'client',
              fullName: profile.displayName,
              email: profile.emails![0].value,
              provider: 'linkedin',
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

      const userRolesData = await db
        .select({
          roleName: roles.name,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, user.id));

      const userForSession: AuthUser = {
        id: user.id,
        username: user.username,
        role: user.role,
        roles: userRolesData.map(r => r.roleName),
        mfaEnabled: user.mfaEnabled,
      };

      done(null, userForSession);
    } catch (err) {
      done(err);
    }
  });

  // MFA Setup endpoint
  app.post("/api/auth/mfa/setup", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    const secret = speakeasy.generateSecret();
    const otpAuthUrl = speakeasy.otpauthURL({
      secret: secret.base32,
      label: req.user.username,
      issuer: 'YourApp'
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

  // Auth routes
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", async (err: any, user: Express.User | false, info: any) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(400).send(info.message ?? "Login failed");
      }

      if (user.mfaEnabled) {
        // Return a temporary token for MFA verification
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
      const payload = jwt.verify(refreshToken, JWT_SECRET) as { id: number };
      const tokens = generateTokens({ id: payload.id } as AuthUser);
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

  // Social login routes
  app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
      const tokens = generateTokens(req.user as AuthUser);
      res.redirect(`/auth/success?tokens=${encodeURIComponent(JSON.stringify(tokens))}`);
    }
  );

  app.get('/auth/linkedin',
    passport.authenticate('linkedin')
  );

  app.get('/auth/linkedin/callback',
    passport.authenticate('linkedin', { failureRedirect: '/login' }),
    (req, res) => {
      const tokens = generateTokens(req.user as AuthUser);
      res.redirect(`/auth/success?tokens=${encodeURIComponent(JSON.stringify(tokens))}`);
    }
  );

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
}