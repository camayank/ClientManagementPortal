import { Router } from "express";
import { requirePermission } from "../middleware/check-permission";
import { apiLimiter } from "../middleware/rate-limit";
import type { Request, Response } from "express";
import { db } from "@db";
import { tasks, clients, projects, documents } from "@db/schema";
import { sql, count } from "drizzle-orm";

const router = Router();

router.get("/dashboard", 
  apiLimiter,
  requirePermission('reports', 'read'), 
  async (req: Request, res: Response) => {
    try {
      const [taskStats] = await db
        .select({
          total: count(),
          todo: sql<number>`count(*) filter (where status = 'todo')`,
          inProgress: sql<number>`count(*) filter (where status = 'in_progress')`,
          review: sql<number>`count(*) filter (where status = 'review')`,
          completed: sql<number>`count(*) filter (where status = 'completed')`,
        })
        .from(tasks);

      const [clientStats] = await db
        .select({
          total: count(),
          active: sql<number>`count(*) filter (where status = 'active')`,
          inactive: sql<number>`count(*) filter (where status = 'inactive')`,
        })
        .from(clients);

      const [projectStats] = await db
        .select({
          total: count(),
          draft: sql<number>`count(*) filter (where status = 'draft')`,
          active: sql<number>`count(*) filter (where status = 'active')`,
          onHold: sql<number>`count(*) filter (where status = 'on_hold')`,
          completed: sql<number>`count(*) filter (where status = 'completed')`,
          cancelled: sql<number>`count(*) filter (where status = 'cancelled')`,
        })
        .from(projects);

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
      console.error("Error fetching dashboard stats:", error);
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
      console.error("Error in reporting:", error);
      res.status(500).json({
        message: error.message || "Report operation failed"
      });
    }
  }
);

export default router;