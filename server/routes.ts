import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { clients, documents, projects, users } from "@db/schema";
import multer from "multer";
import { eq, and, sql } from "drizzle-orm";
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

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

  app.patch("/api/admin/users/:id/reset-password", async (req, res) => {
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

    try {
      const user = req.user as any;
      let query = db.select().from(documents);

      if (user.role === 'client') {
        // Get client's ID first
        const [clientRecord] = await db.select()
          .from(clients)
          .where(eq(clients.userId, user.id))
          .limit(1);

        if (!clientRecord) {
          return res.status(404).send("Client record not found");
        }

        // Filter documents by client ID
        query = query.where(eq(documents.clientId, clientRecord.id));
      }

      const docs = await query;
      res.json(docs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).send("Failed to fetch documents");
    }
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
      const user = req.user as any;

      // Get client record for the current user if they are a client
      let clientId: number | null = null;
      if (user.role === 'client') {
        const [clientRecord] = await db.select()
          .from(clients)
          .where(eq(clients.userId, user.id))
          .limit(1);

        if (!clientRecord) {
          // If client record doesn't exist, create one
          const [newClientRecord] = await db.insert(clients)
            .values({
              userId: user.id,
              company: user.username,
              status: 'active',
            })
            .returning();
          clientId = newClientRecord.id;
        } else {
          clientId = clientRecord.id;
        }
      }

      // Create the document record
      const [newDoc] = await db.insert(documents)
        .values({
          name: req.file.originalname,
          type: req.file.mimetype,
          size: req.file.size,
          uploadedBy: user.id,
          clientId: clientId,
          projectId: req.body.projectId ? parseInt(req.body.projectId) : null,
        })
        .returning();

      // Ensure uploads directory exists
      if (!fs.existsSync('uploads')) {
        fs.mkdirSync('uploads', { recursive: true });
      }

      // Move the file to a permanent location
      const permanentPath = path.join('uploads', newDoc.id.toString() + '_' + req.file.originalname);
      fs.renameSync(req.file.path, permanentPath);

      // Update the document with the final path
      await db.update(documents)
        .set({
          metadata: {
            path: permanentPath,
            originalName: req.file.originalname
          }
        })
        .where(eq(documents.id, newDoc.id));

      res.json(newDoc);
    } catch (error) {
      console.error("Upload error:", error);
      // Clean up the temporary file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).send("Upload failed: " + (error as Error).message);
    }
  });

  // Modify the documents GET endpoint to handle the new file path structure
  app.get("/api/documents/:id/view", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const docId = parseInt(req.params.id);
      const [doc] = await db.select()
        .from(documents)
        .where(eq(documents.id, docId));

      if (!doc) {
        return res.status(404).send("Document not found");
      }

      // Check if user has access to this document
      if ((req.user as any).role !== 'admin') {
        const [clientDoc] = await db.select()
          .from(clients)
          .where(eq(clients.userId, (req.user as any).id));

        if (!clientDoc || doc.clientId !== clientDoc.id) {
          return res.status(403).send("Access denied");
        }
      }

      // Get the file path from metadata
      const filePath = (doc.metadata as any)?.path || path.join('uploads', doc.id.toString() + '_' + doc.name);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).send("File not found");
      }

      // Set appropriate headers for viewing
      res.setHeader('Content-Type', doc.type);
      res.setHeader('Content-Disposition', `inline; filename="${doc.name}"`);

      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("View error:", error);
      res.status(500).send("Failed to view file");
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


  // Add document download route
  app.get("/api/documents/:id/download", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const docId = parseInt(req.params.id);
      const [doc] = await db.select()
        .from(documents)
        .where(eq(documents.id, docId));

      if (!doc) {
        return res.status(404).send("Document not found");
      }

      // Check if user has access to this document
      if ((req.user as any).role !== 'admin') {
        const [clientDoc] = await db.select()
          .from(clients)
          .where(eq(clients.userId, (req.user as any).id));

        if (!clientDoc || doc.clientId !== clientDoc.id) {
          return res.status(403).send("Access denied");
        }
      }

      // Find the file in uploads directory
      const filePath = path.join('uploads', doc.name);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).send("File not found");
      }

      // Set appropriate headers
      res.setHeader('Content-Type', doc.type);
      res.setHeader('Content-Disposition', `inline; filename="${doc.name}"`);

      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).send("Failed to download file");
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .send("Invalid input: " + result.error.issues.map(i => i.message).join(", "));
      }

      const { username, password, role } = result.data;

      // Prevent admin registration through public endpoint
      if (role === 'admin') {
        return res.status(403).send("Admin accounts can only be created by existing administrators");
      }

      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      // Create the new user
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password, // Note: In a real app, this should be hashed
          role: 'client', // Force client role for public registration
        })
        .returning();

      // Create client record for the new user
      if (role === 'client') {
        await db.insert(clients)
          .values({
            userId: newUser.id,
            company: username, // Using username as initial company name
            status: 'active',
          });
      }

      // Log the user in after registration
      req.login(newUser, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          message: "Registration successful",
          user: { id: newUser.id, username: newUser.username },
        });
      });
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}