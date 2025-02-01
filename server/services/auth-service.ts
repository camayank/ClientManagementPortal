import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import nodemailer from "nodemailer";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { AppError } from "../middleware/error-handler";

// Email configuration
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// OAuth Configuration
export const configureOAuth = () => {
  // Google OAuth
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: "/auth/google/callback",
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await db.query.users.findFirst({
        where: eq(users.email, profile.emails![0].value)
      });

      if (!user) {
        const [newUser] = await db.insert(users).values({
          email: profile.emails![0].value,
          fullName: profile.displayName,
          provider: "google",
          providerId: profile.id,
        }).returning();
        user = newUser;
      }

      return done(null, user);
    } catch (error) {
      return done(error as Error);
    }
  }));

  // GitHub OAuth
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    callbackURL: "/auth/github/callback",
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await db.query.users.findFirst({
        where: eq(users.email, profile.emails![0].value)
      });

      if (!user) {
        const [newUser] = await db.insert(users).values({
          email: profile.emails![0].value,
          fullName: profile.displayName,
          provider: "github",
          providerId: profile.id,
        }).returning();
        user = newUser;
      }

      return done(null, user);
    } catch (error) {
      return done(error as Error);
    }
  }));
};

// MFA Services
export const mfaService = {
  async generateSecret(userId: number) {
    const secret = speakeasy.generateSecret({
      name: "ClientPortal",
    });

    await db
      .update(users)
      .set({ mfaSecret: secret.base32 })
      .where(eq(users.id, userId));

    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);
    return { secret: secret.base32, qrCode };
  },

  verifyToken(token: string, secret: string) {
    return speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
    });
  },
};

// Password Reset Service
export const passwordResetService = {
  async generateResetToken(email: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const resetToken = crypto.randomUUID();
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await db
      .update(users)
      .set({
        resetToken,
        resetTokenExpires: resetExpires,
      })
      .where(eq(users.id, user.id));

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
    
    await transporter.sendMail({
      to: email,
      subject: "Password Reset Request",
      html: `
        <p>You requested a password reset</p>
        <p>Click this <a href="${resetUrl}">link</a> to reset your password</p>
        <p>This link will expire in 1 hour</p>
      `,
    });

    return true;
  },

  async resetPassword(token: string, newPassword: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.resetToken, token)
    });

    if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
      throw new AppError("Invalid or expired reset token", 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db
      .update(users)
      .set({
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      })
      .where(eq(users.id, user.id));

    return true;
  },
};

export const sessionService = {
  async trackActivity(userId: number) {
    await db
      .update(users)
      .set({ lastActivity: new Date() })
      .where(eq(users.id, userId));
  },

  async checkSessionTimeout(userId: number, maxAge: number) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user?.lastActivity) return false;

    const inactiveTime = Date.now() - user.lastActivity.getTime();
    return inactiveTime <= maxAge;
  },
};
