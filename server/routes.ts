import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketService } from "./websocket/server";
import { setupAuth } from "./auth";
import { db } from "@db";
import { clients, documents, projects, users } from "@db/schema";
import multer from "multer";
import { eq, and, sql } from "drizzle-orm";
import { requirePermission } from "./middleware/check-permission";
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { format, subDays, parseISO } from 'date-fns';

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Export the WebSocket service instance
export let wsService: WebSocketService;

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Create HTTP server
  const httpServer = createServer(app);

  // Initialize WebSocket service
  wsService = new WebSocketService(httpServer);

  // Document management routes with permission checks
  app.post("/api/documents/upload", requirePermission('documents', 'create'), upload.single('file'), async (req, res) => {
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

      // Send real-time notification
      if (user.role === 'client') {
        // Notify admins about new document upload
        wsService.broadcastToAdmin({
          type: 'notification',
          payload: {
            type: 'document_upload',
            message: `New document uploaded by client: ${user.username}`,
            document: {
              id: newDoc.id,
              name: newDoc.name,
              type: newDoc.type,
            }
          }
        });
      } else {
        // Notify specific client about document upload
        if (clientId) {
          wsService.sendToUser(clientId, {
            type: 'notification',
            payload: {
              type: 'document_upload',
              message: `New document uploaded to your account: ${newDoc.name}`,
              document: {
                id: newDoc.id,
                name: newDoc.name,
                type: newDoc.type,
              }
            }
          });
        }
      }

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

  // Add user management routes with permission checks
  app.get("/api/admin/users", requirePermission('users', 'read'), async (req, res) => {
    try {
      const userList = await db.select().from(users);
      res.json(userList);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).send("Failed to fetch users");
    }
  });

  app.post("/api/admin/users", requirePermission('users', 'create'), async (req, res) => {
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

  app.patch("/api/admin/users/:id/reset-password", requirePermission('users', 'update'), async (req, res) => {
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

  // Client management routes with permission checks
  app.get("/api/clients", requirePermission('clients', 'read'), async (req, res) => {
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

  app.post("/api/clients", requirePermission('clients', 'create'), async (req, res) => {
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

  app.patch("/api/clients/:id", requirePermission('clients', 'update'), async (req, res) => {
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

  // Project management routes with permission checks
  app.get("/api/projects", requirePermission('projects', 'read'), async (req, res) => {
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

  app.post("/api/projects", requirePermission('projects', 'create'), async (req, res) => {
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

  // Document management routes with permission checks
  app.get("/api/documents", requirePermission('documents', 'read'), async (req, res) => {
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

  app.get("/api/documents/all", requirePermission('documents', 'read'), async (req, res) => {
    const docs = await db.select().from(documents);
    res.json(docs);
  });


  // Modify the documents GET endpoint to handle the new file path structure
  app.get("/api/documents/:id/view", requirePermission('documents', 'read'), async (req, res) => {
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

      // Get the file path from metadata or construct it
      const filePath = (doc.metadata as any)?.path || path.join('uploads', doc.id.toString() + '_' + doc.name);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.error(`File not found at path: ${filePath}`);
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

  // Add document download route with consistent path handling
  app.get("/api/documents/:id/download", requirePermission('documents', 'read'), async (req, res) => {
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

      // Get the file path from metadata or construct it
      const filePath = (doc.metadata as any)?.path || path.join('uploads', doc.id.toString() + '_' + doc.name);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.error(`File not found at path: ${filePath}`);
        return res.status(404).send("File not found");
      }

      // Set appropriate headers for download
      res.setHeader('Content-Type', doc.type);
      res.setHeader('Content-Disposition', `attachment; filename="${doc.name}"`);

      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).send("Failed to download file");
    }
  });

  // Admin statistics with permission checks
  app.get("/api/admin/stats", requirePermission('stats', 'read'), async (req, res) => {
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


  // Add report generation endpoints with permission checks
  app.get("/api/admin/reports", requirePermission('reports', 'read'), async (req, res) => {
    const { type, startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).send("Start and end dates are required");
    }

    try {
      const start = parseISO(startDate as string);
      const end = parseISO(endDate as string);

      switch (type) {
        case 'documents': {
          const [documentStats] = await db
            .select({
              totalDocuments: sql<number>`count(*)`,
              totalSize: sql<number>`sum(size)`,
            })
            .from(documents)
            .where(sql`created_at between ${start} and ${end}`);

          const documentTypes = await db
            .select({
              type: documents.type,
              count: sql<number>`count(*)`,
            })
            .from(documents)
            .where(sql`created_at between ${start} and ${end}`)
            .groupBy(documents.type);

          res.json({
            totalDocuments: documentStats.totalDocuments,
            totalSize: documentStats.totalSize,
            documentTypes: documentTypes.map(dt => ({
              name: dt.type,
              count: dt.count,
            })),
          });
          break;
        }

        case 'users': {
          const [userStats] = await db
            .select({
              activeUsers: sql<number>`count(distinct id)`,
              newUsers: sql<number>`count(case when created_at between ${start} and ${end} then 1 end)`,
            })
            .from(users)
            .where(sql`last_login >= ${subDays(new Date(), 30)}`);

          const loginActivity = await db
            .select({
              date: sql<string>`date_trunc('day', last_login)`,
              count: sql<number>`count(*)`,
            })
            .from(users)
            .where(sql`last_login between ${start} and ${end}`)
            .groupBy(sql`date_trunc('day', last_login)`)
            .orderBy(sql`date_trunc('day', last_login)`);

          res.json({
            activeUsers: userStats.activeUsers,
            newUsers: userStats.newUsers,
            loginActivity: loginActivity.map(la => ({
              date: format(new Date(la.date), 'MMM d, yyyy'),
              count: la.count,
            })),
          });
          break;
        }
        case 'projects': {
          const [projectStats] = await db
            .select({
              totalProjects: sql<number>`count(*)`,
              activeProjects: sql<number>`count(case when status = 'active' then 1 end)`,
              completedProjects: sql<number>`count(case when status = 'completed' then 1 end)`,
            })
            .from(projects)
            .where(sql`created_at between ${start} and ${end}`);

          const projectsByStatus = await db
            .select({
              status: projects.status,
              count: sql<number>`count(*)`,
            })
            .from(projects)
            .where(sql`created_at between ${start} and ${end}`)
            .groupBy(projects.status);

          res.json({
            totalProjects: projectStats.totalProjects,
            activeProjects: projectStats.activeProjects,
            completedProjects: projectStats.completedProjects,
            projectsByStatus: projectsByStatus.map(ps => ({
              name: ps.status,
              count: ps.count,
            })),
          });
          break;
        }

        case 'clients': {
          const [clientStats] = await db
            .select({
              totalClients: sql<number>`count(*)`,
              activeClients: sql<number>`count(case when status = 'active' then 1 end)`,
              newClients: sql<number>`count(case when created_at between ${start} and ${end} then 1 end)`,
            })
            .from(clients);

          const clientActivity = await db
            .select({
              date: sql<string>`date_trunc('day', documents.created_at)`,
              uploads: sql<number>`count(*)`,
            })
            .from(documents)
            .innerJoin(clients, eq(documents.clientId, clients.id))
            .where(sql`documents.created_at between ${start} and ${end}`)
            .groupBy(sql`date_trunc('day', documents.created_at)`)
            .orderBy(sql`date_trunc('day', documents.created_at)`);

          res.json({
            totalClients: clientStats.totalClients,
            activeClients: clientStats.activeClients,
            newClients: clientStats.newClients,
            activityTimeline: clientActivity.map(ca => ({
              date: format(new Date(ca.date), 'MMM d, yyyy'),
              uploads: ca.uploads,
            })),
          });
          break;
        }

        default:
          res.status(400).send("Invalid report type");
      }
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).send("Failed to generate report");
    }
  });

  app.post("/api/admin/reports/:type/download", requirePermission('reports', 'download'), async (req, res) => {
    const { type } = req.params;
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).send("Start and end dates are required");
    }

    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);

      let data: any[] = [];
      let headers: string[] = [];

      switch (type) {
        case 'documents': {
          data = await db
            .select({
              id: documents.id,
              name: documents.name,
              type: documents.type,
              size: documents.size,
              createdAt: documents.createdAt,
              uploadedBy: users.username,
            })
            .from(documents)
            .leftJoin(users, eq(documents.uploadedBy, users.id))
            .where(sql`documents.created_at between ${start} and ${end}`);

          headers = ['ID', 'Name', 'Type', 'Size', 'Created At', 'Uploaded By'];
          break;
        }

        case 'users': {
          data = await db
            .select({
              id: users.id,
              username: users.username,
              role: users.role,
              createdAt: users.createdAt,
              lastLogin: users.lastLogin,
            })
            .from(users)
            .where(sql`created_at between ${start} and ${end}`);

          headers = ['ID', 'Username', 'Role', 'Created At', 'Last Login'];
          break;
        }
        default:
          return res.status(400).send("Invalid report type");
      }

      // Generate CSV
      const csv = [
        headers.join(','),
        ...data.map(row => Object.values(row).join(',')),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${type}-report.csv`);
      res.send(csv);
    } catch (error) {
      console.error("Error generating report download:", error);
      res.status(500).send("Failed to generate report download");
    }
  });

  // Add document download route
  app.get("/api/documents/:id/download", requirePermission('documents', 'read'), async (req, res) => {
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
      res.setHeader('Content-Disposition', `attachment; filename="${doc.name}"`);

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

  app.post("/api/admin/create-first-admin", async (req, res) => {
    try {
      // Check if any admin exists
      const [existingAdmin] = await db
        .select()
        .from(users)
        .where(eq(users.role, 'admin'))
        .limit(1);

      if (existingAdmin) {
        return res.status(400).send("Admin user already exists");
      }

      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).send("Username and password are required");
      }

      // Create the first admin user
      const [adminUser] = await db
        .insert(users)
        .values({
          username,
          password, // Note: This should be hashed in production
          role: 'admin',
        })
        .returning();

      res.json({
        message: "Admin user created successfully",
        user: { id: adminUser.id, username: adminUser.username }
      });
    } catch (error) {
      console.error("Error creating admin:", error);
      res.status(500).send("Failed to create admin user");
    }
  });

  return httpServer;
}