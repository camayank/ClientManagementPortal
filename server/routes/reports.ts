import { Router } from "express";
import { logger } from "../utils/logger";
import { requirePermission } from "../middleware/check-permission";
import { apiLimiter } from "../middleware/rate-limit";
import type { Request, Response } from "express";
import { db } from "@db";
import { tasks, clients, projects, documents } from "@db/schema";
import { sql, count, eq } from "drizzle-orm";

const router = Router();

router.get("/dashboard", 
  apiLimiter,
  requirePermission('reports', 'read'), 
  async (req: Request, res: Response) => {
    try {
      const allTasks = await db.select().from(tasks);
      const taskStats = {
        total: allTasks.length,
        todo: allTasks.filter(t => t.status === 'todo').length,
        inProgress: allTasks.filter(t => t.status === 'in_progress').length,
        review: allTasks.filter(t => t.status === 'review').length,
        completed: allTasks.filter(t => t.status === 'completed').length,
      };

      const allClients = await db.select().from(clients);
      const clientStats = {
        total: allClients.length,
        active: allClients.filter(c => c.status === 'active').length,
        inactive: allClients.filter(c => c.status === 'inactive').length,
      };

      const allProjects = await db.select().from(projects);
      const projectStats = {
        total: allProjects.length,
        draft: allProjects.filter(p => p.status === 'draft').length,
        active: allProjects.filter(p => p.status === 'active').length,
        onHold: allProjects.filter(p => p.status === 'on_hold').length,
        completed: allProjects.filter(p => p.status === 'completed').length,
        cancelled: allProjects.filter(p => p.status === 'cancelled').length,
      };

      const [documentStats] = await db
        .select({
          total: count(),
        })
        .from(documents);

      res.json({
        tasks: taskStats,
        clients: clientStats,
        projects: projectStats,
        documents: documentStats,
      });
    } catch (error: any) {
      logger.error("Error fetching dashboard stats:", error);
      res.status(500).json({
        message: error.message || "Failed to fetch dashboard stats"
      });
    }
  }
);

router.get("/", 
  apiLimiter,
  requirePermission('reports', 'read'), 
  async (req: Request, res: Response) => {
    try {
      res.json({
        availableReports: [
          {
            id: "dashboard",
            name: "Dashboard Summary",
            description: "Overview of tasks, clients, projects, and documents",
            endpoint: "/api/reports/dashboard"
          },
          {
            id: "tasks",
            name: "Task Report",
            description: "Detailed task analytics and status breakdown",
            endpoint: "/api/reports/tasks"
          },
          {
            id: "clients",
            name: "Client Report",
            description: "Client statistics and engagement metrics",
            endpoint: "/api/reports/clients"
          }
        ]
      });
    } catch (error: any) {
      logger.error("Error in reporting:", error);
      res.status(500).json({
        message: error.message || "Report operation failed"
      });
    }
  }
);

export default router;