import { Router } from "express";
import { db } from "@db";
import { 
  analyticsMetrics, 
  analyticsDataPoints, 
  dashboardConfigs,
  dashboardWidgets,
  reportTemplates,
  users,
  tasks,
  projects,
  insertAnalyticsMetricSchema,
  insertAnalyticsDataPointSchema,
  insertDashboardConfigSchema,
  insertDashboardWidgetSchema,
  insertReportTemplateSchema
} from "@db/schema";
import { and, eq, sql } from "drizzle-orm";
import { requirePermission } from "../middleware/check-permission";
import { AppError } from "../middleware/error-handler";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// Middleware to check if user is authenticated
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
};

// Update workload metrics endpoint to match frontend requirements
router.get("/workload-metrics", 
  requireAuth,
  requirePermission('analytics', 'read'),
  async (_req: Request, res: Response) => {
    try {
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const [activeAssignments] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(tasks)
        .where(eq(tasks.status, "in_progress"));

      const [dueThisWeek] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(tasks)
        .where(and(
          sql`${tasks.dueDate} >= ${now}`,
          sql`${tasks.dueDate} <= ${nextWeek}`
        ));

      const [availableTeamMembers] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(sql`${users.workflowPosition} != 'none'`);

      const [scheduledTasks] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(tasks)
        .where(eq(tasks.status, "todo"));

      const [urgentTasks] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(tasks)
        .where(and(
          eq(tasks.priority, "urgent"),
          sql`${tasks.status} != 'completed'`
        ));

      res.json({
        activeAssignments: activeAssignments.count,
        dueThisWeek: dueThisWeek.count,
        availableTeamMembers: availableTeamMembers.count,
        scheduledTasks: scheduledTasks.count,
        urgentTasks: urgentTasks.count
      });
    } catch (error) {
      console.error("Error fetching workload metrics:", error);
      throw new AppError("Failed to fetch workload metrics", 500);
    }
});

// Update team members endpoint to include workload calculation
router.get("/team-members",
  requireAuth,
  requirePermission('analytics', 'read'),
  async (req: Request, res: Response) => {
    try {
      const { role, location } = req.query;

      let query = db.select({
        id: users.id,
        name: users.fullName,
        role: users.role,
        workflowPosition: users.workflowPosition,
        experienceLevel: users.experienceLevel,
        location: users.location,
      }).from(users);

      // Base condition
      const conditions = [sql`${users.workflowPosition} != 'none'`];

      // Add role filter if specified
      if (role && role !== 'all') {
        conditions.push(sql`${users.role} = ${role}`);
      }

      // Add location filter if specified
      if (location && location !== 'all') {
        conditions.push(sql`${users.location} = ${location}`);
      }

      // Apply all conditions
      query = query.where(and(...conditions));

      const teamMembers = await query;

      // Calculate current workload for each team member
      const teamMembersWithLoad = await Promise.all(
        teamMembers.map(async (member) => {
          const [assignedTasks] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(tasks)
            .where(and(
              eq(tasks.assignedTo, member.id),
              sql`${tasks.status} != 'completed'`
            ));

          // Calculate workload percentage (assuming max capacity is 10 tasks)
          const currentLoad = Math.min((assignedTasks.count / 10) * 100, 100);
          const availableHours = 40 - (assignedTasks.count * 4); // Assuming 4 hours per task

          return {
            ...member,
            currentLoad,
            availableHours: Math.max(availableHours, 0)
          };
        })
      );

      res.json(teamMembersWithLoad);
    } catch (error) {
      console.error("Error fetching team members:", error);
      throw new AppError("Failed to fetch team members", 500);
    }
});

// Analytics Metrics Routes
router.get("/metrics", requireAuth, async (req, res) => {
  try {
    const metrics = await db.select().from(analyticsMetrics);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

router.post("/metrics", requireAuth, async (req, res) => {
  try {
    const result = insertAnalyticsMetricSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.message });
    }

    const metric = await db.insert(analyticsMetrics)
      .values(result.data)
      .returning();

    res.json(metric[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to create metric" });
  }
});

// Analytics Data Points Routes
router.post("/data-points", requireAuth, async (req, res) => {
  try {
    const result = insertAnalyticsDataPointSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.message });
    }

    const dataPoint = await db.insert(analyticsDataPoints)
      .values(result.data)
      .returning();

    res.json(dataPoint[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to create data point" });
  }
});

router.get("/data-points/:metricId", requireAuth, async (req, res) => {
  try {
    const { metricId } = req.params;
    const { start, end } = req.query;

    let query = db.select()
      .from(analyticsDataPoints)
      .where(eq(analyticsDataPoints.metricId, parseInt(metricId)))
      .orderBy(sql`${analyticsDataPoints.timestamp} DESC`);

    if (start && end) {
        query = query.where(
            and(
                sql`${analyticsDataPoints.timestamp} >= ${start}`,
                sql`${analyticsDataPoints.timestamp} <= ${end}`
            )
        );
    }

    const dataPoints = await query;
    res.json(dataPoints);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch data points" });
  }
});

// Dashboard Configuration Routes
router.get("/dashboards", requireAuth, async (req, res) => {
  try {
    const dashboards = await db.select()
      .from(dashboardConfigs)
      .where(eq(dashboardConfigs.userId, req.user!.id));
    res.json(dashboards);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch dashboards" });
  }
});

router.post("/dashboards", requireAuth, async (req, res) => {
  try {
    const result = insertDashboardConfigSchema.safeParse({
      ...req.body,
      userId: req.user!.id
    });
    if (!result.success) {
      return res.status(400).json({ error: result.error.message });
    }

    const dashboard = await db.insert(dashboardConfigs)
      .values(result.data)
      .returning();

    res.json(dashboard[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to create dashboard" });
  }
});

// Dashboard Widgets Routes
router.post("/widgets", requireAuth, async (req, res) => {
  try {
    const result = insertDashboardWidgetSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.message });
    }

    const widget = await db.insert(dashboardWidgets)
      .values(result.data)
      .returning();

    res.json(widget[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to create widget" });
  }
});

// Report Templates Routes
router.get("/report-templates", requireAuth, async (req, res) => {
  try {
    const templates = await db.select()
      .from(reportTemplates)
      .where(eq(reportTemplates.createdBy, req.user!.id));
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch report templates" });
  }
});

router.post("/report-templates", requireAuth, async (req, res) => {
  try {
    const result = insertReportTemplateSchema.safeParse({
      ...req.body,
      createdBy: req.user!.id
    });
    if (!result.success) {
      return res.status(400).json({ error: result.error.message });
    }

    const template = await db.insert(reportTemplates)
      .values(result.data)
      .returning();

    res.json(template[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to create report template" });
  }
});

export default router;