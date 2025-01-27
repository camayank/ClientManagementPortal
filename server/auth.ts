import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { users } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

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
    secret: process.env.JWT_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: app.get("env") === "production",
      maxAge: 24 * 60 * 60 * 1000
    },
    store: new MemoryStore({
      checkPeriod: 86400000
    }),
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      console.log(`[Auth] Login attempt for username: ${username}`);

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!user) {
        console.log(`[Auth] User not found: ${username}`);
        return done(null, false, { message: "Invalid credentials" });
      }

      console.log(`[Auth] Found user: ${username}, comparing passwords`);
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
          await db.update(users)
            .set({ lastLogin: new Date() })
            .where(eq(users.id, user.id));

          console.log(`[Auth] User logged in successfully: ${user.id} (${user.role})`);

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
    req.logout((err) => {
      if (err) {
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
}