import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketService } from "./websocket/server";
import { setupAuth, hashPassword } from "./auth";
import { db } from "@db";
import { clients, documents, projects, users, milestones, milestoneUpdates, projectTemplates, roles, permissions, rolePermissions, userRoles, clientOnboarding, servicePackages, clientServices } from "@db/schema";
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

export let wsService: WebSocketService;

export function registerRoutes(app: Express): Server {
  setupAuth(app);
  const httpServer = createServer(app);
  wsService = new WebSocketService(httpServer);

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
      const filePath = path.join('uploads', doc.name);
      if (!fs.existsSync(filePath)) {
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

  app.post("/api/register", async (req, res, next) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .send("Invalid input: " + result.error.issues.map(i => i.message).join(", "));
      }
      const { username, password } = result.data;
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      // Create the user
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password,
          role: 'client',
        })
        .returning();

      // If it's a client, create a client record
      if (newUser.role === 'client') {
        await db.insert(clients)
          .values({
            userId: newUser.id,
            company: username,
            status: 'active',
          });
      }

      // Log the user in
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

  // Service Package Management Routes
  app.get("/api/admin/service-packages", requirePermission('packages', 'read'), async (req, res) => {
    try {
      const packages = await db.select().from(servicePackages);
      res.json(packages);
    } catch (error) {
      console.error("Error fetching service packages:", error);
      res.status(500).json({
        message: "Failed to fetch service packages",
        error: (error as Error).message
      });
    }
  });

  app.post("/api/admin/service-packages", requirePermission('packages', 'create'), async (req, res) => {
    try {
      const { name, description, basePrice, billingCycle, features } = req.body;

      if (!name || !billingCycle) {
        return res.status(400).json({
          message: "Name and billing cycle are required"
        });
      }

      const [newPackage] = await db.insert(servicePackages)
        .values({
          name,
          description,
          basePrice: basePrice ? parseFloat(basePrice) : null,
          billingCycle,
          features: features || [],
          isActive: true,
        })
        .returning();

      res.status(201).json(newPackage);
    } catch (error) {
      console.error("Error creating service package:", error);
      res.status(500).json({
        message: "Failed to create service package",
        error: (error as Error).message
      });
    }
  });

  app.patch("/api/admin/service-packages/:id", requirePermission('packages', 'update'), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, basePrice, billingCycle, features, isActive } = req.body;

      const [existingPackage] = await db.select()
        .from(servicePackages)
        .where(eq(servicePackages.id, parseInt(id)))
        .limit(1);

      if (!existingPackage) {
        return res.status(404).json({ message: "Service package not found" });
      }

      const [updatedPackage] = await db.update(servicePackages)
        .set({
          name: name || existingPackage.name,
          description: description ?? existingPackage.description,
          basePrice: basePrice ? parseFloat(basePrice) : existingPackage.basePrice,
          billingCycle: billingCycle || existingPackage.billingCycle,
          features: features || existingPackage.features,
          isActive: isActive ?? existingPackage.isActive,
        })
        .where(eq(servicePackages.id, parseInt(id)))
        .returning();

      res.json(updatedPackage);
    } catch (error) {
      console.error("Error updating service package:", error);
      res.status(500).json({
        message: "Failed to update service package",
        error: (error as Error).message
      });
    }
  });

  app.get("/api/admin/service-packages/:id/clients", requirePermission('packages', 'read'), async (req, res) => {
    try {
      const { id } = req.params;
      const clients = await db.select({
        id: clientServices.id,
        clientId: clientServices.clientId,
        startDate: clientServices.startDate,
        endDate: clientServices.endDate,
        status: clientServices.status,
        client: {
          id: clients.id,
          company: clients.company,
          status: clients.status,
        }
      })
        .from(clientServices)
        .where(eq(clientServices.packageId, parseInt(id)))
        .leftJoin(clients, eq(clientServices.clientId, clients.id));

      res.json(clients);
    } catch (error) {
      console.error("Error fetching package clients:", error);
      res.status(500).json({
        message: "Failed to fetch package clients",
        error: (error as Error).message
      });
    }
  });

  // Milestone Management Routes
  app.post("/api/projects/:projectId/milestones", requirePermission('projects', 'update'), async (req, res) => {
    try {
      const { projectId } = req.params;
      const { title, description, dueDate, priority } = req.body;

      const [project] = await db.select()
        .from(projects)
        .where(eq(projects.id, parseInt(projectId)))
        .limit(1);

      if (!project) {
        return res.status(404).send("Project not found");
      }

      const [milestone] = await db.insert(milestones)
        .values({
          projectId: parseInt(projectId),
          title,
          description,
          dueDate: new Date(dueDate),
          priority,
          status: "pending",
          progress: 0
        })
        .returning();

      await db.insert(milestoneUpdates)
        .values({
          milestoneId: milestone.id,
          updatedBy: (req.user as any).id,
          previousStatus: null,
          newStatus: "pending",
          comment: "Milestone created"
        });

      wsService.broadcastToProjectMembers(parseInt(projectId), {
        type: 'milestone_created',
        payload: {
          milestone,
          project: {
            id: project.id,
            name: project.name
          }
        }
      });

      res.json(milestone);
    } catch (error) {
      console.error("Error creating milestone:", error);
      res.status(500).send("Failed to create milestone");
    }
  });

  app.patch("/api/projects/:projectId/milestones/:id", requirePermission('projects', 'update'), async (req, res) => {
    try {
      const { projectId, id } = req.params;
      const { status, progress, comment } = req.body;

      const [currentMilestone] = await db.select()
        .from(milestones)
        .where(and(
          eq(milestones.id, parseInt(id)),
          eq(milestones.projectId, parseInt(projectId))
        ))
        .limit(1);

      if (!currentMilestone) {
        return res.status(404).send("Milestone not found");
      }

      const [updatedMilestone] = await db.update(milestones)
        .set({
          status,
          progress,
          completedAt: status === 'completed' ? new Date() : null,
          updatedAt: new Date()
        })
        .where(eq(milestones.id, parseInt(id)))
        .returning();

      await db.insert(milestoneUpdates)
        .values({
          milestoneId: parseInt(id),
          updatedBy: (req.user as any).id,
          previousStatus: currentMilestone.status,
          newStatus: status,
          comment
        });

      wsService.broadcastToProjectMembers(parseInt(projectId), {
        type: 'milestone_updated',
        payload: {
          milestone: updatedMilestone,
          update: {
            previousStatus: currentMilestone.status,
            newStatus: status,
            comment
          }
        }
      });

      res.json(updatedMilestone);
    } catch (error) {
      console.error("Error updating milestone:", error);
      res.status(500).send("Failed to update milestone");
    }
  });

  app.get("/api/projects/:projectId/milestones", requirePermission('projects', 'read'), async (req, res) => {
    try {
      const { projectId } = req.params;
      const projectMilestones = await db.select({
        id: milestones.id,
        title: milestones.title,
        description: milestones.description,
        status: milestones.status,
        dueDate: milestones.dueDate,
        completedAt: milestones.completedAt,
        progress: milestones.progress,
        priority: milestones.priority,
        createdAt: milestones.createdAt,
        updates: milestoneUpdates,
      })
        .from(milestones)
        .leftJoin(milestoneUpdates, eq(milestones.id, milestoneUpdates.milestoneId))
        .where(eq(milestones.projectId, parseInt(projectId)))
        .orderBy(milestones.dueDate);

      res.json(projectMilestones);
    } catch (error) {
      console.error("Error fetching milestones:", error);
      res.status(500).send("Failed to fetch milestones");
    }
  });

  app.get("/api/projects/:projectId/milestones/:id", requirePermission('projects', 'read'), async (req, res) => {
    try {
      const { projectId, id } = req.params;
      const [milestone] = await db.select({
        id: milestones.id,
        title: milestones.title,
        description: milestones.description,
        status: milestones.status,
        dueDate: milestones.dueDate,
        completedAt: milestones.completedAt,
        progress: milestones.progress,
        priority: milestones.priority,
        createdAt: milestones.createdAt,
        updates: milestoneUpdates,
      })
        .from(milestones)
        .leftJoin(milestoneUpdates, eq(milestones.id, milestoneUpdates.milestoneId))
        .where(and(
          eq(milestones.id, parseInt(id)),
          eq(milestones.projectId, parseInt(projectId))
        ))
        .limit(1);

      if (!milestone) {
        return res.status(404).send("Milestone not found");
      }

      res.json(milestone);
    } catch (error) {
      console.error("Error fetching milestone:", error);
      res.status(500).send("Failed to fetch milestone");
    }
  });

  // Get all project templates
  app.get("/api/project-templates", requirePermission('projects', 'read'), async (req, res) => {
    try {
      const templates = await db.select().from(projectTemplates);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching project templates:", error);
      res.status(500).send("Failed to fetch project templates");
    }
  });

  // Create default templates if none exist
  async function createDefaultTemplates() {
    const existingTemplates = await db.select().from(projectTemplates);
    if (existingTemplates.length === 0) {
      await db.insert(projectTemplates).values([
        {
          name: "Individual Tax Return",
          description: "Annual tax return preparation for individual clients",
          businessType: "tax_return_preparation",
          clientType: "individual",
          priority: "medium",
          estimatedHours: 8,
          budget: 800,
          defaultMilestones: [
            {
              title: "Document Collection",
              description: "Gather all necessary tax documents",
              dueDate: "relative:+7", // 7 days from project start
              priority: "high"
            },
            {
              title: "Initial Review",
              description: "Review received documents and identify missing items",
              dueDate: "relative:+14",
              priority: "medium"
            },
            {
              title: "Tax Return Preparation",
              description: "Prepare tax return based on provided documents",
              dueDate: "relative:+21",
              priority: "high"
            },
            {
              title: "Quality Review",
              description: "Internal review of prepared tax return",
              dueDate: "relative:+28",
              priority: "high"
            },
            {
              title: "Client Review",
              description: "Review tax return with client",
              dueDate: "relative:+35",
              priority: "medium"
            }
          ]
        },
        {
          name: "Small Business Bookkeeping",
          description: "Monthly bookkeeping services for small businesses",
          businessType: "bookkeeping",
          clientType: "small_business",
          priority: "medium",
          estimatedHours: 10,
          budget: 1000,
          defaultMilestones: [
            {
              title: "Initial Setup",
              description: "Set up accounting software and chart of accounts",
              dueDate: "relative:+3",
              priority: "high"
            },
            {
              title: "Bank Reconciliation",
              description: "Reconcile bank and credit card statements",
              dueDate: "relative:+7",
              priority: "high"
            },
            {
              title: "Financial Statements",
              description: "Prepare monthly financial statements",
              dueDate: "relative:+14",
              priority: "medium"
            },
            {
              title: "Review Meeting",
              description: "Review financial statements with client",
              dueDate: "relative:+21",
              priority: "medium"
            }
          ]
        },
        {
          name: "Corporate Tax Preparation",
          description: "Annual corporate tax return preparation",
          businessType: "tax_return_preparation",
          clientType: "corporation",
          priority: "high",
          estimatedHours: 40,
          budget: 5000,
          defaultMilestones: [
            {
              title: "Planning Meeting",
              description: "Initial tax planning meeting",
              dueDate: "relative:+7",
              priority: "high"
            },
            {
              title: "Document Collection",
              description: "Gather all required corporate documents",
              dueDate: "relative:+21",
              priority: "high"
            },
            {
              title: "Financial Statement Review",
              description: "Review year-end financial statements",
              dueDate: "relative:+35",
              priority: "high"
            },
            {
              title: "Tax Return Preparation",
              description: "Prepare corporate tax return",
              dueDate: "relative:+49",
              priority: "high"
            },
            {
              title: "Partner Review",
              description: "Partner review of tax return",
              dueDate: "relative:+56",
              priority: "high"
            }
          ]
        }
      ]);
    }
  }

  // Call this after database is ready
  createDefaultTemplates().catch(console.error);

  // Add these routes to the existing routes.ts file, inside the registerRoutes function

  // Role Management Routes
  app.get("/api/admin/roles", requirePermission('roles:read'), async (req, res) => {
    try {
      const rolesList = await db
        .select({
          id: roles.id,
          name: roles.name,
          description: roles.description,
          createdAt: roles.createdAt,
          permissions: permissions,
        })
        .from(roles)
        .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
        .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id));

      // Group permissions by role
      const groupedRoles = rolesList.reduce((acc, curr) => {
        const role = acc.find(r => r.id === curr.id);
        if (role) {
          if (curr.permissions) {
            role.permissions.push(curr.permissions);
          }
        } else {
          acc.push({
            id: curr.id,
            name: curr.name,
            description: curr.description,
            createdAt: curr.createdAt,
            permissions: curr.permissions ? [curr.permissions] : [],
          });
        }
        return acc;
      }, [] as any[]);

      res.json(groupedRoles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).send("Failed to fetch roles");
    }
  });

  app.post("/api/admin/roles", requirePermission('roles:create'), async (req, res) => {
    try {
      const { name, description, permissions: permissionIds } = req.body;

      const [existingRole] = await db
        .select()
        .from(roles)
        .where(eq(roles.name, name))
        .limit(1);

      if (existingRole) {
        return res.status(400).send("Role already exists");
      }

      const [newRole] = await db
        .insert(roles)
        .values({
          name,
          description,
        })
        .returning();

      // Assign permissions
      if (permissionIds?.length) {
        await db.insert(rolePermissions)
          .values(
            permissionIds.map((permId: number) => ({
              roleId: newRole.id,
              permissionId: permId,
            }))
          );
      }

      res.json(newRole);
    } catch (error) {
      console.error("Error creating role:", error);
      res.status(500).send("Failed to create role");
    }
  });

  app.patch("/api/admin/roles/:id", requirePermission('roles:update'), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, permissions: permissionIds } = req.body;

      // Update role
      const [updatedRole] = await db
        .update(roles)
        .set({
          name,
          description,
        })
        .where(eq(roles.id, parseInt(id)))
        .returning();

      // Update permissions
      if (permissionIds) {
        // Remove existing permissions
        await db
          .delete(rolePermissions)
          .where(eq(rolePermissions.roleId, parseInt(id)));

        // Add new permissions
        if (permissionIds.length) {
          await db
            .insert(rolePermissions)
            .values(
              permissionIds.map((permId: number) => ({
                roleId: parseInt(id),
                permissionId: permId,
              }))
            );
        }
      }

      res.json(updatedRole);
    } catch (error) {
      console.error("Error updating role:", error);
      res.status(500).send("Failed to update role");
    }
  });

  app.delete("/api/admin/roles/:id", requirePermission('roles:delete'), async (req, res) => {
    try {
      const { id } = req.params;

      // Check if role is assigned to any users
      const [assignedRole] = await db
        .select()
        .from(userRoles)
        .where(eq(userRoles.roleId, parseInt(id)))
        .limit(1);

      if (assignedRole) {
        return res.status(400).send("Cannot delete role that is assigned to users");
      }

      // Delete role permissions first
      await db
        .delete(rolePermissions)
        .where(eq(rolePermissions.roleId, parseInt(id)));

      // Delete role
      await db
        .delete(roles)
        .where(eq(roles.id, parseInt(id)));

      res.json({ message: "Role deleted successfully" });
    } catch (error) {
      console.error("Error deleting role:", error);
      res.status(500).send("Failed to delete role");
    }
  });

  // User Role Management Routes
  app.get("/api/admin/users/roles", requirePermission('users:read'), async (req, res) => {
    try {
      const usersList = await db
        .select({
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          email: users.email,
          lastLogin: users.lastLogin,
          createdAt: users.createdAt,
          roles: roles,
        })
        .from(users)
        .leftJoin(userRoles, eq(users.id, userRoles.userId))
        .leftJoin(roles, eq(userRoles.roleId, roles.id));

      // Group roles by user
      const groupedUsers = usersList.reduce((acc, curr) => {
        const user = acc.find(u => u.id === curr.id);
        if (user) {
          if (curr.roles) {
            user.roles.push(curr.roles);
          }
        } else {
          acc.push({
            id: curr.id,
            username: curr.username,
            fullName: curr.fullName,
            email: curr.email,
            lastLogin: curr.lastLogin,
            createdAt: curr.createdAt,
            roles: curr.roles ? [curr.roles] : [],
          });
        }
        return acc;
      }, [] as any[]);

      res.json(groupedUsers);
    } catch (error) {
      console.error("Error fetching users with roles:", error);
      res.status(500).send("Failed to fetch users with roles");
    }
  });

  app.patch("/api/admin/users/:id/roles", requirePermission('users:update'), async (req, res) => {
    try {
      const { id } = req.params;
      const { roleIds } = req.body;

      // Remove existing roles
      await db
        .delete(userRoles)
        .where(eq(userRoles.userId, parseInt(id)));

      // Add new roles
      if (roleIds?.length) {
        await db
          .insert(userRoles)
          .values(
            roleIds.map((roleId: number) => ({
              userId: parseInt(id),
              roleId: roleId,
            }))
          );
      }

      res.json({ message: "User roles updated successfully" });
    } catch (error) {
      console.error("Error updating user roles:", error);
      res.status(500).send("Failed to update user roles");
    }
  });

  app.get("/api/admin/client-onboarding", requirePermission('clients', 'read'), async (req, res) => {
    try {
      const onboardingClients = await db.select({
        id: clientOnboarding.id,
        clientId: clientOnboarding.clientId,
        currentStep: clientOnboarding.currentStep,
        startedAt: clientOnboarding.startedAt,
        completedAt: clientOnboarding.completedAt,
        notes: clientOnboarding.notes,
        client: clients,
        assignedUser: users,
      })
        .from(clientOnboarding)
        .leftJoin(clients, eq(clientOnboarding.clientId, clients.id))
        .leftJoin(users, eq(clientOnboarding.assignedTo, users.id))
        .orderBy(clientOnboarding.startedAt);

      res.json(onboardingClients);
    } catch (error) {
      console.error("Error fetching onboarding clients:", error);
      res.status(500).json({
        message: "Failed to fetch onboarding clients",
        error: (error as Error).message
      });
    }
  });

  app.patch("/api/admin/client-onboarding/:id/step", requirePermission('clients', 'update'), async (req, res) => {
    const { id } = req.params;
    const { step, notes } = req.body;

    try {
      const [updatedOnboarding] = await db.update(clientOnboarding)
        .set({
          currentStep: step,
          notes: notes || clientOnboarding.notes,
          completedAt: step === "completed" ? new Date() : null,
        })
        .where(eq(clientOnboarding.id, parseInt(id)))
        .returning();

      if (!updatedOnboarding) {
        return res.status(404).json({ message: "Onboarding record not found" });
      }

      // If this is a new client completing onboarding, update their status
      if (step === "completed") {
        await db.update(clients)
          .set({ status: "active" })
          .where(eq(clients.id, updatedOnboarding.clientId));

        // Send notification through WebSocket
        wsService.broadcastToAdmin({
          type: 'notification',
          payload: {
            type: 'client_onboarding_completed',
            message: `Client onboarding completed for ID: ${updatedOnboarding.clientId}`,
          }
        });
      }

      res.json(updatedOnboarding);
    } catch (error) {
      console.error("Error updating onboarding status:", error);
      res.status(500).json({
        message: "Failed to update onboarding status",
        error: (error as Error).message
      });
    }
  });

  // When creating a new client, automatically create an onboarding record
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

  app.get("/api/admin/service-packages", requirePermission('packages', 'read'), async (req, res) => {
    try {
      const packages = await db.select().from(servicePackages);
      res.json(packages);
    } catch (error) {
      console.error("Error fetching service packages:", error);
      res.status(500).json({
        message: "Failed to fetch service packages",
        error: (error as Error).message
      });
    }
  });

  app.post("/api/admin/service-packages", requirePermission('packages', 'create'), async (req, res) => {
    try {
      const { name, description, basePrice, billingCycle, features } = req.body;

      if (!name || !billingCycle) {
        return res.status(400).json({
          message: "Name and billing cycle are required"
        });
      }

      const [newPackage] = await db.insert(servicePackages)
        .values({
          name,
          description,
          basePrice: basePrice ? parseFloat(basePrice) : null,
          billingCycle,
          features: features || [],
          isActive: true,
        })
        .returning();

      res.status(201).json(newPackage);
    } catch (error) {
      console.error("Error creating service package:", error);
      res.status(500).json({
        message: "Failed to create service package",
        error: (error as Error).message
      });
    }
  });

  app.patch("/api/admin/service-packages/:id", requirePermission('packages', 'update'), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, basePrice, billingCycle, features, isActive } = req.body;

      const [existingPackage] = await db.select()
        .from(servicePackages)
        .where(eq(servicePackages.id, parseInt(id)))
        .limit(1);

      if (!existingPackage) {
        return res.status(404).json({ message: "Service package not found" });
      }

      const [updatedPackage] = await db.update(servicePackages)
        .set({
          name: name || existingPackage.name,
          description: description ?? existingPackage.description,
          basePrice: basePrice ? parseFloat(basePrice) : existingPackage.basePrice,
          billingCycle: billingCycle || existingPackage.billingCycle,
          features: features || existingPackage.features,
          isActive: isActive ?? existingPackage.isActive,
        })
        .where(eq(servicePackages.id, parseInt(id)))
        .returning();

      res.json(updatedPackage);
    } catch (error) {
      console.error("Error updating service package:", error);
      res.status(500).json({
        message: "Failed to update service package",
        error: (error as Error).message
      });
    }
  });

  app.get("/api/admin/service-packages/:id/clients", requirePermission('packages', 'read'), async (req, res) => {
    try {
      const { id } = req.params;
      const clients = await db.select({
        id: clientServices.id,
        clientId: clientServices.clientId,
        startDate: clientServices.startDate,
        endDate: clientServices.endDate,
        status: clientServices.status,
        client: {
          id: clients.id,
          company: clients.company,
          status: clients.status,
        }
      })
        .from(clientServices)
        .where(eq(clientServices.packageId, parseInt(id)))
        .leftJoin(clients, eq(clientServices.clientId, clients.id));

      res.json(clients);
    } catch (error) {
      console.error("Error fetching package clients:", error);
      res.status(500).json({
        message: "Failed to fetch package clients",
        error: (error as Error).message
      });
    }
  });

  return httpServer;
}