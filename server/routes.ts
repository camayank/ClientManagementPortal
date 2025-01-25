import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { clients, documents, projects, users } from "@db/schema";
import multer from "multer";
import { eq, and } from "drizzle-orm";

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Client management routes
  app.get("/api/clients", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") {
      return res.status(403).send("Unauthorized");
    }

    const clientList = await db.select().from(clients);
    res.json(clientList);
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

  const httpServer = createServer(app);
  return httpServer;
}