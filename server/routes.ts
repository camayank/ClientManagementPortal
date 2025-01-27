import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as LinkedInStrategy } from "passport-linkedin-oauth2";
import { db } from "@db";
import { 
  users,
  clients, 
  clientOnboarding,
  projects 
} from "@db/schema";
import { eq, ilike, sql, desc, and } from "drizzle-orm";
import multer from "multer";
import { hashPassword } from "./auth";
import { WebSocketService } from "./websocket/server";
import path from "path";
import fs from "fs";

export let wsService: WebSocketService;

export function registerRoutes(app: Express): Server {
  // Initialize authentication first
  setupAuth(app);

  // Configure Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        let [user] = await db
          .select()
          .from(users)
          .where(ilike(users.email, profile.emails?.[0]?.value || ''))
          .limit(1);

        if (!user) {
          // Create new user
          const [newUser] = await db.insert(users)
            .values({
              email: profile.emails?.[0]?.value || '',
              password: await hashPassword(Math.random().toString(36)),
              fullName: profile.displayName,
              role: 'client',
              isEmailVerified: true,
            })
            .returning();
          user = newUser;
        }

        return done(null, user);
      } catch (error) {
        console.error("[OAuth] Google authentication error:", error);
        return done(error as Error);
      }
    }));
  }

  // OAuth Routes
  app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
  app.get("/api/auth/google/callback", passport.authenticate("google", {
    successRedirect: "/client",
    failureRedirect: "/",
  }));

  // Test endpoint to verify API is working
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  const httpServer = createServer(app);
  return httpServer;
}