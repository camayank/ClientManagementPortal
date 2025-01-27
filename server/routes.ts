import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { WebSocketService } from "./websocket/server";
import clientRouter from "./routes/client";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

export let wsService: WebSocketService;

export function registerRoutes(app: Express): Server {
  // Initialize authentication first
  setupAuth(app);

  const httpServer = createServer(app);
  wsService = new WebSocketService(httpServer);

  // Test endpoint to verify API is working
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Auth endpoints
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      // Find user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Update last login
      await db
        .update(users)
        .set({ lastLogin: new Date() })
        .where(eq(users.id, user.id));

      // Return user info with role
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
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Logout failed" });
        }
        res.json({ message: "Logout successful" });
      });
    } else {
      res.json({ message: "Logout successful" });
    }
  });

  app.get("/api/auth/user", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, (req.user as any).id))
      .limit(1);

    if (!user) {
      return res.status(401).send("User not found");
    }

    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
      fullName: user.fullName
    });
  });

  // Register client routes
  app.use("/api/client", clientRouter);
  app.post("/api/documents/upload", requirePermission('documents', 'create'), upload.single('file'), async (req, res) => {
    try {
      const user = req.user as any;
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
      if (!fs.existsSync('uploads')) {
        fs.mkdirSync('uploads', { recursive: true });
      }
      const permanentPath = path.join('uploads', newDoc.id.toString() + '_' + req.file.originalname);
      fs.renameSync(req.file.path, permanentPath);
      await db.update(documents)
        .set({
          metadata: {
            path: permanentPath,
            originalName: req.file.originalname
          }
        })
        .where(eq(documents.id, newDoc.id));
      if (user.role === 'client') {
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
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).send("Upload failed: " + (error as Error).message);
    }
  });

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
      // Check if user already exists
      const [existingUser] = await db.select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({
          message: "Username already exists"
        });
      }

      // Hash the password
      const hashedPassword = await hashPassword(password);

      // Start a transaction to ensure all operations succeed or fail together
      const [newUser] = await db.transaction(async (tx) => {
        // Create the user
        const [user] = await tx.insert(users)
          .values({
            username,
            password: hashedPassword,
            role,
            fullName,
            email,
            createdAt: new Date(),
            lastLogin: null
          })
          .returning();

        // Get the role ID
        const [roleRecord] = await tx.select()
          .from(roles)
          .where(eq(roles.name, role))
          .limit(1);

        if (roleRecord) {
          // Assign role to user
          await tx.insert(userRoles)
            .values({
              userId: user.id,
              roleId: roleRecord.id
            });

          // If it's a client, create a client record
          if (role === 'client') {
            await tx.insert(clients)
              .values({
                userId: user.id,
                company: fullName || username,
                status: 'active',
                createdAt: new Date()
              });
          }
        }

        return [user];
      });

      // Return the created user without sensitive information
      const userResponse = {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        fullName: newUser.fullName,
        email: newUser.email,
        createdAt: newUser.createdAt
      };

      res.status(201).json(userResponse);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({
        message: "Failed to create user",
        error: (error as Error).message
      });
    }
  });

  app.patch("/api/admin/users/:id/reset-password", requirePermission('users', 'update'), async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;

    try {
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);

      // Update the user's password
      const [updatedUser] = await db.update(users)
        .set({
          password: hashedPassword,
          updatedAt: new Date()
        })
        .where(eq(users.id, parseInt(id)))
        .returning();

      if (!updatedUser) {
        return res.status(404).json({
          message: "User not found"
        });
      }

      // Return success response without sensitive data
      res.json({
        message: "Password updated successfully",
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          updatedAt: updatedUser.updatedAt
        }
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({
        message: "Failed to reset password",
        error: (error as Error).message
      });
    }
  });

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
      const [user] = await db.insert(users)
        .values({
          username: email,
          password,
          role: 'client',
        })
        .returning();

      const [client] = await db.insert(clients)
        .values({
          userId: user.id,
          company,
          status: 'pending', // Changed from 'active' to 'pending' during onboarding
        })
        .returning();

      // Create onboarding record
      const [onboarding] = await db.insert(clientOnboarding)
        .values({
          clientId: client.id,
          currentStep: "initial_contact",
          assignedTo: (req.user as any).id,
        })
        .returning();

      res.json({
        ...client,
        onboarding,
      });
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({
        message: "Failed to create client",
        error: (error as Error).message
      });
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
    const {
      name,
      description,
      lastDate,
      initialMilestone,
      businessType,
      clientType,
      priority,
      estimatedHours,
      budget,
      clientId
    } = req.body;
    const user = req.user as any;

    try {
      let projectClientId = clientId;

      // If it's a client creating the project
      if (user.role === "client") {
        const [clientRecord] = await db.select()
          .from(clients)
          .where(eq(clients.userId, user.id))
          .limit(1);

        if (!clientRecord) {
          return res.status(404).send("Client record not found");
        }
        projectClientId = clientRecord.id;
      } else if (!projectClientId) {
        // Admin must provide a clientId
        return res.status(400).send("Client ID is required for admin project creation");
      }

      const [newProject] = await db.insert(projects)
        .values({
          name,
          description,
          clientId: projectClientId,
          lastDate: new Date(lastDate),
          businessType,
          clientType,
          priority,
          estimatedHours,
          budget,
          status: 'active',
          assignedTo: user.role === 'admin' ? user.id : null // Assign admin as project owner if admin creates it
        })
        .returning();

      // Create initial milestone if provided
      if (initialMilestone) {
        const [milestone] = await db.insert(milestones)
          .values({
            projectId: newProject.id,
            title: initialMilestone.title,
            description: initialMilestone.description,
            dueDate: new Date(initialMilestone.dueDate),
            priority: initialMilestone.priority,
            status: "pending",
            progress: 0
          })
          .returning();

        await db.insert(milestoneUpdates)
          .values({
            milestoneId: milestone.id,
            updatedBy: user.id,
            previousStatus: null,
            newStatus: "pending",
            comment: "Initial milestone created"
          });

        // Only broadcast if WebSocket service is available
        if (wsService && wsService.broadcastToProjectMembers) {
          wsService.broadcastToProjectMembers(newProject.id, {
            type: 'milestone_created',
            payload: {
              milestone,
              project: {
                id: newProject.id,
                name: newProject.name
              }
            }
          });
        }
      }

      // Update client's project count
      await db.update(clients)
        .set({
          projects: sql`projects + 1`
        })
        .where(eq(clients.id, projectClientId));

      res.json(newProject);
    } catch (error: any) {
      console.error("Project creation error:", error);
      res.status(500).send("Failed to create project");
    }
  });

  app.patch("/api/admin/projects/:id/assign", requirePermission('projects', 'update'), async (req, res) => {
    const { id } = req.params;
    const { assignedTo } = req.body;
    const user = req.user as any;

    if (user.role !== 'admin') {
      return res.status(403).send("Only admins can reassign projects");
    }

    try {
      const [updatedProject] = await db.update(projects)
        .set({ assignedTo })
        .where(eq(projects.id, parseInt(id)))
        .returning();

      if (wsService && wsService.broadcastToProjectMembers) {
        wsService.broadcastToProjectMembers(updatedProject.id, {
          type: 'notification',
          payload: {
            type: 'project_assigned',
            message: `Project has been reassigned`,
            project: {
              id: updatedProject.id,
              name: updatedProject.name
            }
          }
        });
      }

      res.json(updatedProject);
    } catch (error) {
      console.error("Project assignment error:", error);
      res.status(500).send("Failed to assign project");
    }
  });

  app.patch("/api/admin/projects/:id/status", requirePermission('projects', 'update'), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const user = req.user as any;

    if (user.role !== 'admin') {
      return res.status(403).send("Only admins can update project status");
    }

    try {
      const [updatedProject] = await db.update(projects)
        .set({ status })
        .where(eq(projects.id, parseInt(id)))
        .returning();

      if (wsService && wsService.broadcastToProjectMembers) {
        wsService.broadcastToProjectMembers(updatedProject.id, {
          type: 'notification',
          payload: {
            type: 'project_status_updated',
            message: `Project status has been updated to ${status}`,
            project: {
              id: updatedProject.id,
              name: updatedProject.name,
              status
            }
          }
        });
      }

      res.json(updatedProject);
    } catch (error) {
      console.error("Project status update error:", error);
      res.status(500).send("Failed to update project status");
    }
  });

  app.get("/api/documents", requirePermission('documents', 'read'), async (req, res) => {
    try {
      const user = req.user as any;
      let query = db.select({
        id: documents.id,
        name: documents.name,
        type: documents.type,
        size: documents.size,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
        metadata: documents.metadata,
        uploadedBy: documents.uploadedBy,
        clientId: documents.clientId,
        projectId: documents.projectId,
      }).from(documents);
      if (user.role === 'client') {
        const [clientRecord] = await db.select()
          .from(clients)
          .where(eq(clients.userId, user.id))
          .limit(1);
        if (!clientRecord) {
          return res.status(404).send("Client record not found");
        }
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

  app.get("/api/documents/:id/view", requirePermission('documents', 'read'), async (req, res) => {
    try {
      const docId = parseInt(req.params.id);
      const [doc] = await db.select()
        .from(documents)
        .where(eq(documents.id, docId));
      if (!doc) {
        return res.status(404).send("Document not found");
      }
      if ((req.user as any).role !== 'admin') {
        const [clientDoc] = await db.select()
          .from(clients)
          .where(eq(clients.userId, (req.user as any).id));
        if (!clientDoc || doc.clientId !== clientDoc.id) {
          return res.status(403).send("Access denied");
        }
      }
      const filePath = (doc.metadata as any)?.path || path.join('uploads', doc.id.toString() + '_' + doc.name);
      if (!fs.existsSync(filePath)) {
        console.error(`File not found at path: ${filePath}`);
        return res.status(404).send("File not found");
      }
      res.setHeader('Content-Type', doc.type);
      res.setHeader('Content-Disposition', `inline; filename="${doc.name}"`);
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("View error:", error);
      res.status(500).send("Failed to view file");
    }
  });

  app.get("/api/documents/:id/download", requirePermission('documents', 'read'), async (req, res) => {
    try {
      const docId = parseInt(req.params.id);
      const [doc] = await db.select()
        .from(documents)
        .where(eq(documents.id, docId));
      if (!doc) {
        return res.status(404).send("Document not found");
      }
      if ((req.user as any).role !== 'admin') {
        const [clientDoc] = await db.select()
          .from(clients)
          .where(eq(clients.userId, (req.user as any).id));
        if (!clientDoc || doc.clientId !== clientDoc.id) {
          return res.status(403).send("Access denied");
        }
      }
      const filePath = (doc.metadata as any)?.path || path.join('uploads', doc.id.toString() + '_' + doc.name);
      if (!fs.existsSync(filePath)) {
        console.error(`File not found at path: ${filePath}`);
        return res.status(404).send("File not found");
      }
      res.setHeader('Content-Type', doc.type);
      res.setHeader('Content-Disposition', `attachment; filename="${doc.name}"`);
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).send("Failed to download file");
    }
  });

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
        pendingReviews: 0,
        clientsWithPending: 0,
        pendingActions: 0,
      };
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).send("Failed to fetch admin statistics");
    }
  });


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

  app.get("/api/admin/service-feature-tiers", requirePermission('packages', 'read'), async (req, res) => {
    try {
      const tiers = await db.select().from(serviceFeatureTiers);
      res.json(tiers);
    } catch (error) {
      console.error("Error fetching feature tiers:", error);
      res.status(500).json({
        message: "Failed to fetch feature tiers",
        error: (error as Error).message
      });
    }
  });

  app.post("/api/admin/service-feature-tiers", requirePermission('packages', 'create'), async (req, res) => {
    try {
      const { name, description, level } = req.body;

      if (!name || typeof level !== 'number') {
        return res.status(400).json({
          message: "Name and level are required"
        });
      }

      const [newTier] = await db.insert(serviceFeatureTiers)
        .values({
          name,
          description,
          level,
        })
        .returning();

      res.json(newTier);
    } catch (error) {
      console.error("Error creating feature tier:", error);
      res.status(500).json({
        message: "Failed to create feature tier",
        error: (error as Error).message
      });
    }
  });

  app.patch("/api/admin/service-feature-tiers/:id", requirePermission('packages', 'update'), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, level } = req.body;

      if (!name || typeof level !== 'number') {
        return res.status(400).json({
          message: "Name and level are required"
        });
      }

      const [updatedTier] = await db.update(serviceFeatureTiers)
        .set({          name,
          description,
          level,
          updatedAt: new Date()
        })
        .where(eq(serviceFeatureTiers.id, parseInt(id)))
        .returning();

      if (!updatedTier) {
        return res.status(404).json({
          message: "Feature tier notfound"
        });
      }

      res.json(updatedTier);
    } catch (error) {
      console.error("Error updating feature tier:", error);
      res.status(500).json({
        message: "Failed to update feature tier",
        error: (error as Error).message
      });
    }
  });

  app.delete("/api/admin/service-feature-tiers/:id", requirePermission('packages', 'delete'), async (req, res) => {
    try {
      const { id } = req.params;
      const [deletedTier] = await db.delete(serviceFeatureTiers)
        .where(eq(serviceFeatureTiers.id, parseInt(id)))
        .returning();

      if (!deletedTier) {
        return res.status(404).json({
          message: "Feature tier not found"
        });
      }

      res.json({ message: "Feature tier deleted successfully" });
    } catch (error) {
      console.error("Error deleting feature tier:", error);
      res.status(500).json({
        message: "Failed to delete feature tier",
        error: (error as Error).message
      });
    }
  });

  app.delete("/api/admin/pricing-rules/:id", requirePermission('packages', 'delete'), async (req, res) => {
    try {
      const { id } = req.params;
      const [deletedRule] = await db.delete(customPricingRules)
        .where(eq(customPricingRules.id, parseInt(id)))
        .returning();

      if (!deletedRule) {
        return res.status(404).json({
          message: "Pricing rule not found"
        });
      }

      res.json({ message: "Pricing rule deleted successfully" });
    } catch (error) {
      console.error("Error deleting pricing rule:", error);
      res.status(500).json({
        message: "Failed to delete pricing rule",
        error: (error as Error).message
      });
    }
  });

  app.get("/api/admin/service-features", requirePermission('packages', 'read'), async (req, res) => {    try {
      const features = await db.select().from(serviceFeatures);
      res.json(features);
    } catch (error) {
      console.error("Error fetching features:", error);
      res.status(500).json({
        message: "Failed to fetch features",
        error: (error as Error).message
      });
    }
  });

  app.post("/api/admin/service-features", requirePermission('packages', 'create'), async (req, res) => {
    try {
      const { name, description, type, unit } = req.body;

      if (!name || !type) {
        return res.status(400).json({
          message: "Name and type are required"
        });
      }

      const [newFeature] = await db.insert(serviceFeatures)
        .values({
          name,
          description,
          type,
          unit,
        })
        .returning();

      res.json(newFeature);
    } catch (error) {
      console.error("Error creating feature:", error);
      res.status(500).json({
        message: "Failed to create feature",
        error: (error as Error).message
      });
    }
  });
  app.get("/api/admin/service-features/:id", requirePermission('packages', 'read'), async (req, res) => {
    try {
      const { id } = req.params;
      const [feature] = await db.select()
        .from(serviceFeatures)
        .where(eq(serviceFeatures.id, parseInt(id)))
        .limit(1);

      if (!feature) {
        return res.status(404).json({
          message: "Service feature not found"
        });
      }

      res.json(feature);
    } catch (error) {
      console.error("Error fetching feature:", error);
      res.status(500).json({
        message: "Failed to fetch feature",
        error: (error as Error).message
      });
    }
  });

  app.patch("/api/admin/service-features/:id", requirePermission('packages', 'update'), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, type, unit } = req.body;

      if (!name || !type) {
        return res.status(400).json({
          message: "Name and type are required"
        });
      }

      const [updatedFeature] = await db.update(serviceFeatures)
        .set({
          name,
          description,
          type,
          unit,
        })
        .where(eq(serviceFeatures.id, parseInt(id)))
        .returning();

      if (!updatedFeature) {
        return res.status(404).json({
          message: "Service feature not found"
        });
      }

      res.json(updatedFeature);
    } catch (error) {
      console.error("Error updating feature:", error);
      res.status(500).json({
        message: "Failed to update feature",
        error: (error as Error).message
      });
    }
  });

  app.delete("/api/admin/service-features/:id", requirePermission('packages', 'delete'), async (req, res) => {
    try {
      const { id } = req.params;
      const [deletedFeature] = await db.delete(serviceFeatures)
        .where(eq(serviceFeatures.id, parseInt(id)))
        .returning();

      if (!deletedFeature) {
        return res.status(404).json({
          message: "Service feature not found"
        });
      }

      res.json({ message: "Service feature deleted successfully" });
    } catch (error) {
      console.error("Error deleting feature:", error);
      res.status(500).json({
        message: "Failed to delete feature",
        error: (error as Error).message
      });
    }
  });

  app.get("/api/admin/pricing-rules", requirePermission('packages', 'read'), async (req, res) => {
    try {
      const rules = await db.select().from(customPricingRules);
      res.json(rules);
    } catch (error) {
      console.error("Error fetching pricing rules:", error);
      res.status(500).json({
        message: "Failed to fetch pricing rules",
        error: (error as Error).message
      });
    }
  });

  app.post("/api/admin/pricing-rules", requirePermission('packages', 'create'), async (req, res) => {
    try {
      const { packageId, name, description, condition, adjustment, priority } = req.body;

      if (!packageId || !name || !condition || !adjustment) {
        return res.status(400).json({
          message: "Package ID, name, condition, and adjustment are required"
        });
      }

      const [newRule] = await db.insert(customPricingRules)
        .values({
          packageId: parseInt(packageId),
          name,
          description,
          condition,
          adjustment,
          priority: priority || 0,
          isActive: true,
        })
        .returning();

      res.json(newRule);
    } catch (error) {
      console.error("Error creating pricing rule:", error);
      res.status(500).json({
        message: "Failed to create pricing rule",
        error: (error as Error).message
      });
    }
  });

  app.patch("/api/admin/pricing-rules/:id", requirePermission('packages', 'update'), async (req, res) => {
    try {
      const { id } = req.params;
      const { packageId, name, description, condition, adjustment, priority, isActive } = req.body;

      const [updatedRule] = await db.update(customPricingRules)
        .set({
          packageId: parseInt(packageId),
          name,
          description,
          condition,
          adjustment,
          priority: priority || 0,
          isActive: isActive ?? true,
        })
        .where(eq(customPricingRules.id, parseInt(id)))
        .returning();

      res.json(updatedRule);
    } catch (error) {
      console.error("Error updating pricing rule:", error);
      res.status(500).json({
        message: "Failed to update pricing rule",
        error: (error as Error).message
      });
    }
  });

  // Task Categories
  app.get("/api/task-categories", requirePermission('tasks', 'read'), async (req, res) => {
    try {
      const categories = await db.select().from(taskCategories);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching task categories:", error);
      res.status(500).json({
        message: "Failed to fetch task categories",
        error: (error as Error).message
      });
    }
  });

  app.post("/api/task-categories", requirePermission('tasks', 'create'), async (req, res) => {
    try {
      const result = insertTaskCategorySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid input",
          errors: result.error.issues
        });
      }

      const [category] = await db.insert(taskCategories)
        .values(result.data)
        .returning();

      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating task category:", error);
      res.status(500).json({
        message: "Failed to create task category",
        error: (error as Error).message
      });
    }
  });

  // Tasks
  app.get("/api/tasks", requirePermission('tasks', 'read'), async (req, res) => {
    try {
      const user = req.user as any;
      let query = db.select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        priority: tasks.priority,
        status: tasks.status,
        dueDate: tasks.dueDate,
        estimatedHours: tasks.estimatedHours,
        actualHours: tasks.actualHours,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        completedAt: tasks.completedAt,
        category: taskCategories,
        assignedUser: users,
        creator: {
          id: users.id,
          username: users.username,
          fullName: users.fullName,
        },
      })
        .from(tasks)
        .leftJoin(taskCategories, eq(tasks.categoryId, taskCategories.id))
        .leftJoin(users, eq(tasks.assignedTo, users.id))
        .leftJoin(users, eq(tasks.createdBy, users.id));

      // Filter based on user role
      if (user.role !== 'admin') {
        query = query.where(or(
          eq(tasks.assignedTo, user.id),
          eq(tasks.createdBy, user.id)
        ));
      }

      const taskList = await query;
      res.json(taskList);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({
        message: "Failed to fetch tasks",
        error: (error as Error).message
      });
    }
  });

  app.post("/api/tasks", requirePermission('tasks', 'create'), async (req, res) => {
    try {
      const result = insertTaskSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid input",
          errors: result.error.issues
        });
      }

      const user = req.user as any;
      const [task] = await db.insert(tasks)
        .values({
          ...result.data,
          createdBy: user.id,
          status: 'todo',
        })
        .returning();

      // Create initial status history
      await db.insert(taskStatusHistory)
        .values({
          taskId: task.id,
          previousStatus: null,
          newStatus: 'todo',
          changedBy: user.id,
          comment: 'Task created'
        });

      // Add dependencies if provided
      if (req.body.dependencies && Array.isArray(req.body.dependencies)) {
        await Promise.all(req.body.dependencies.map(depId =>
          db.insert(taskDependencies)
            .values({
              taskId: task.id,
              dependsOnTaskId: depId,
            })
        ));
      }

      if (task.assignedTo) {
        wsService.sendToUser(task.assignedTo, {
          type: 'notification',
          payload: {
            type: 'task_assigned',
            message: `New task assigned to you: ${task.title}`,
            task: {
              id: task.id,
              title: task.title,
              priority: task.priority,
              dueDate: task.dueDate,
            }
          }
        });
      }

      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({
        message: "Failed to create task",
        error: (error as Error).message
      });
    }
  });

  app.patch("/api/tasks/:id/status", requirePermission('tasks', 'update'), async (req, res) => {
    try {
      const { id } = req.params;
      const { status, comment } = req.body;
      const user = req.user as any;

      const [task] = await db.select()
        .from(tasks)
        .where(eq(tasks.id, parseInt(id)))
        .limit(1);

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Update task status
      const [updatedTask] = await db.update(tasks)
        .set({
          status,
          updatedAt: new Date(),
          completedAt: status === 'completed' ? new Date() : null,
        })
        .where(eq(tasks.id, parseInt(id)))
        .returning();

      // Record status change
      await db.insert(taskStatusHistory)
        .values({
          taskId: parseInt(id),
          previousStatus: task.status,
          newStatus: status,
          changedBy: user.id,
          comment
        });

      // Notify assigned user if status changes
      if (task.assignedTo) {
        wsService.sendToUser(task.assignedTo, {
          type: 'notification',
          payload: {
            type: 'task_status_updated',
            message: `Task status updated to ${status}: ${task.title}`,
            task: {
              id: task.id,
              title: task.title,
              status,
            }
          }
        });
      }

      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating task status:", error);
      res.status(500).json({
        message: "Failed to update task status",
        error: (error as Error).message
      });
    }
  });

  app.patch("/api/tasks/:id/assign", requirePermission('tasks', 'update'), async (req, res) => {
    try {
      const { id } = req.params;
      const { assignedTo } = req.body;
      const user = req.user as any;

      const [task] = await db.select()
        .from(tasks)
        .where(eq(tasks.id, parseInt(id)))
        .limit(1);

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Update task assignment
      const [updatedTask] = await db.update(tasks)
        .set({
          assignedTo,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, parseInt(id)))
        .returning();

      // Notify the newly assigned user
      if (assignedTo) {
        wsService.sendToUser(assignedTo, {
          type: 'notification',
          payload: {
            type: 'task_assigned',
            message: `Task assigned to you: ${task.title}`,
            task: {
              id: task.id,
              title: task.title,
              priority: task.priority,
              dueDate: task.dueDate,
            }
          }
        });
      }

      res.json(updatedTask);
    } catch (error) {
      console.error("Error assigning task:", error);
      res.status(500).json({
        message: "Failed to assign task",
        error: (error as Error).message
      });
    }
  });

  app.get("/api/tasks/:id/history", requirePermission('tasks', 'read'), async (req, res) => {
    try {
      const { id } = req.params;
      const history = await db.select({
        id: taskStatusHistory.id,
        previousStatus: taskStatusHistory.previousStatus,
        newStatus: taskStatusHistory.newStatus,
        comment: taskStatusHistory.comment,
        createdAt: taskStatusHistory.createdAt,
        user: {
          id: users.id,
          username: users.username,
          fullName: users.fullName,
        },
      })
        .from(taskStatusHistory)
        .leftJoin(users, eq(taskStatusHistory.changedBy, users.id))
        .where(eq(taskStatusHistory.taskId, parseInt(id)))
        .orderBy(desc(taskStatusHistory.createdAt));

      res.json(history);
    } catch (error) {
      console.error("Error fetching task history:", error);
      res.status(500).json({
        message: "Failed to fetch task history",
        error: (error as Error).message
      });
    }
  });

  return httpServer;
}