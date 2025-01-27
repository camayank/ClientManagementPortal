import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Base user table with all fields restored
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  fullName: text("full_name"),
  role: text("role", {
    enum: ["admin", "client", "team_member", "partner"]
  }).default("client").notNull(),
  isEmailVerified: boolean("is_email_verified").default(false),
  verificationToken: text("verification_token"),
  resetPasswordToken: text("reset_password_token"),
  resetPasswordExpires: timestamp("reset_password_expires"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Projects table with document fields included
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  clientId: integer("client_id").references(() => clients.id),
  status: text("status", {
    enum: ["active", "completed", "on_hold", "cancelled"]
  }).default("active"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  // Document specific fields
  type: text("type"),
  size: integer("size"),
  metadata: text("metadata"),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  projectId: integer("project_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Clients table
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  company: text("company").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  address: text("address"),
  status: text("status", {
    enum: ["active", "inactive", "pending"]
  }).default("pending"),
  industry: text("industry"),
  projects: integer("project_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client Onboarding
export const clientOnboarding = pgTable("client_onboarding", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  status: text("status", {
    enum: ["pending", "in_progress", "completed"]
  }).default("pending"),
  startDate: timestamp("start_date").defaultNow(),
  completedDate: timestamp("completed_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  projects: many(projects),
  onboarding: many(clientOnboarding),
  client: one(clients, {
    fields: [users.id],
    references: [clients.userId],
  }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, {
    fields: [clients.userId],
    references: [users.id],
  }),
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one }) => ({
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  uploadedByUser: one(users, {
    fields: [projects.uploadedBy],
    references: [users.id],
  }),
}));

export const clientOnboardingRelations = relations(clientOnboarding, ({ one }) => ({
  user: one(users, {
    fields: [clientOnboarding.userId],
    references: [users.id],
  }),
}));

// Form validation schemas
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = loginSchema.extend({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  role: z.enum(["admin", "client", "team_member", "partner"]).default("client"),
});

// Types for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type ClientOnboarding = typeof clientOnboarding.$inferSelect;
export type NewClientOnboarding = typeof clientOnboarding.$inferInsert;

// Export schemas for form validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertProjectSchema = createInsertSchema(projects);
export const selectProjectSchema = createSelectSchema(projects);
export const insertClientSchema = createInsertSchema(clients);
export const selectClientSchema = createSelectSchema(clients);
export const insertClientOnboardingSchema = createInsertSchema(clientOnboarding);
export const selectClientOnboardingSchema = createSelectSchema(clientOnboarding);

// Export schema for usage elsewhere
export const schema = {
  users,
  projects,
  clients,
  clientOnboarding,
};