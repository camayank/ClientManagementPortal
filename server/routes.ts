import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { clients, documents, projects, users } from "@db/schema";
import multer from "multer";
import { eq, and, sql } from "drizzle-orm";

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Add user management routes
  app.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") {
      return res.status(403).send("Unauthorized");
    }

    try {
      const userList = await db.select().from(users);
      res.json(userList);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).send("Failed to fetch users");
    }
  });

  app.post("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") {
      return res.status(403).send("Unauthorized");
    }

    const { username, password, role, fullName, email } = req.body;

    try {
      // Check if username already exists
      const [existingUser] = await db.select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      // Create new user
      const [newUser] = await db.insert(users)
        .values({
          username,
          password, // Note: This should be hashed in production
          role,
          fullName,
          email,
        })
        .returning();

      // If it's a client user, create a client profile
      if (role === 'client') {
        await db.insert(clients)
          .values({
            userId: newUser.id,
            company: fullName, // Using fullName as company name initially
            status: 'active',
          });
      }

      res.json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).send("Failed to create user");
    }
  });

  app.post("/api/admin/users/:id/reset-password", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") {
      return res.status(403).send("Unauthorized");
    }

    const { id } = req.params;
    const { newPassword } = req.body;

    try {
      const [updatedUser] = await db.update(users)
        .set({ password: newPassword }) // Note: This should be hashed in production
        .where(eq(users.id, parseInt(id)))
        .returning();

      res.json(updatedUser);
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).send("Failed to reset password");
    }
  });

  // Client management routes
  app.get("/api/clients", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") {
      return res.status(403).send("Unauthorized");
    }

    try {
      const clientList = await db.select({
        id: clients.id,
        company: clients.company,
        status: clients.status,
        projects: clients.projects,
        createdAt: clients.createdAt,
        user: users,
      })
        .from(clients)
        .leftJoin(users, eq(clients.userId, users.id));

      res.json(clientList);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).send("Failed to fetch clients");
    }
  });

  app.post("/api/clients", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") {
      return res.status(403).send("Unauthorized");
    }

    const { company, email, password } = req.body;

    try {
      // Create user account for client
      const [user] = await db.insert(users)
        .values({
          username: email,
          password, // Note: This should be hashed in production
          role: 'client',
        })
        .returning();

      // Create client profile
      const [client] = await db.insert(clients)
        .values({
          userId: user.id,
          company,
          status: 'active',
        })
        .returning();

      res.json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).send("Failed to create client");
    }
  });

  app.patch("/api/clients/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") {
      return res.status(403).send("Unauthorized");
    }

    const { id } = req.params;
    const { status } = req.body;

    try {
      const [updatedClient] = await db.update(clients)
        .set({ status })
        .where(eq(clients.id, parseInt(id)))
        .returning();

      res.json(updatedClient);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).send("Failed to update client");
    }
  });

  // Project management routes
  app.get("/api/projects", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }

    const user = req.user as any;
    let query = db.select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      createdAt: projects.createdAt,
      lastDate: projects.lastDate,
      assignedTo: projects.assignedTo,
      assignedUser: users,
    })
      .from(projects)
      .leftJoin(users, eq(projects.assignedTo, users.id));

    if (user.role === "client") {
      // Clients can only see their own projects
      const [clientRecord] = await db.select()
        .from(clients)
        .where(eq(clients.userId, user.id))
        .limit(1);

      if (!clientRecord) {
        return res.status(404).send("Client record not found");
      }

      query = query.where(eq(projects.clientId, clientRecord.id));
    }

    const projectList = await query;
    res.json(projectList);
  });

  app.post("/api/projects", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }

    const { name, lastDate } = req.body;
    const user = req.user as any;

    try {
      if (user.role === "client") {
        const [clientRecord] = await db.select()
          .from(clients)
          .where(eq(clients.userId, user.id))
          .limit(1);

        if (!clientRecord) {
          return res.status(404).send("Client record not found");
        }

        const [newProject] = await db.insert(projects)
          .values({
            name,
            clientId: clientRecord.id,
            lastDate: new Date(lastDate),
          })
          .returning();

        res.json(newProject);
      } else {
        // Admin can create projects for any client
        const { clientId } = req.body;
        const [newProject] = await db.insert(projects)
          .values({
            name,
            clientId,
            lastDate: new Date(lastDate),
          })
          .returning();

        res.json(newProject);
      }
    } catch (error: any) {
      console.error("Project creation error:", error);
      res.status(500).send("Failed to create project");
    }
  });

  // Document management routes
  app.get("/api/documents", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }

    const docs = await db.select().from(documents)
      .where(
        (req.user as any).role === "admin"
          ? undefined
          : eq(documents.clientId, (req.user as any).clientId)
      );

    res.json(docs);
  });

  app.get("/api/documents/all", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") {
      return res.status(403).send("Unauthorized");
    }

    const docs = await db.select().from(documents);
    res.json(docs);
  });

  app.post("/api/documents/upload", upload.single('file'), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }

    if (!req.file) {
      return res.status(400).send("No file uploaded");
    }

    try {
      const [newDoc] = await db.insert(documents).values({
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size,
        uploadedBy: (req.user as any).id,
        clientId: (req.user as any).role === "client" ? (req.user as any).clientId : null,
        projectId: req.body.projectId || null,
      }).returning();

      res.json(newDoc);
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).send("Upload failed");
    }
  });

  // Admin statistics
  app.get("/api/admin/stats", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") {
      return res.status(403).send("Unauthorized");
    }

    try {
      const [totalClients] = await db.select({ count: sql<number>`count(*)` }).from(clients);
      const [activeProjects] = await db.select({ count: sql<number>`count(*)` })
        .from(projects)
        .where(eq(projects.status, 'active'));

      const [newClientsThisMonth] = await db.select({ count: sql<number>`count(*)` })
        .from(clients)
        .where(sql`created_at >= date_trunc('month', current_date)`);

      const [completedProjectsThisMonth] = await db.select({ count: sql<number>`count(*)` })
        .from(projects)
        .where(and(
          eq(projects.status, 'completed'),
          sql`created_at >= date_trunc('month', current_date)`
        ));

      const [activeUsers] = await db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(sql`last_login >= now() - interval '24 hours'`);

      const stats = {
        totalClients: totalClients.count,
        activeProjects: activeProjects.count,
        newClients: newClientsThisMonth.count,
        completedProjects: completedProjectsThisMonth.count,
        activeUsers: activeUsers.count,
        pendingReviews: 0, // To be implemented with review system
        clientsWithPending: 0,
        pendingActions: 0,
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).send("Failed to fetch admin statistics");
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}