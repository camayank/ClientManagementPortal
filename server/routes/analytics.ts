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
import { eq, and, desc, sql, count } from "drizzle-orm";
import { requirePermission } from "../middleware/check-permission";

const router = Router();

// Middleware to check if user is authenticated
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
};

// Update workload metrics endpoint to match frontend requirements
router.get("/workload-metrics", 
  requireAuth,
  requirePermission('analytics', 'read'),
  async (req, res) => {
    try {
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Get active assignments count
      const activeAssignments = await db
        .select({ count: sql<number>`count(*)` })
        .from(tasks)
        .where(eq(tasks.status, "in_progress"))
        .then(result => result[0].count);

      // Get tasks due this week
      const dueThisWeek = await db
        .select({ count: sql<number>`count(*)` })
        .from(tasks)
        .where(and(
          sql`${tasks.dueDate} >= ${now}`,
          sql`${tasks.dueDate} <= ${nextWeek}`
        ))
        .then(result => result[0].count);

      // Get available team members
      const availableTeamMembers = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(sql`${users.workflowPosition} != 'none'`)
        .then(result => result[0].count);

      // Get scheduled tasks
      const scheduledTasks = await db
        .select({ count: sql<number>`count(*)` })
        .from(tasks)
        .where(eq(tasks.status, "todo"))
        .then(result => result[0].count);

      // Get urgent tasks
      const urgentTasks = await db
        .select({ count: sql<number>`count(*)` })
        .from(tasks)
        .where(and(
          eq(tasks.priority, "urgent"),
          sql`${tasks.status} != 'completed'`
        ))
        .then(result => result[0].count);

      res.json({
        activeAssignments,
        dueThisWeek,
        availableTeamMembers,
        scheduledTasks,
        urgentTasks
      });
    } catch (error) {
      console.error("Error fetching workload metrics:", error);
      res.status(500).json({ error: "Failed to fetch workload metrics" });
    }
});

// Update team members endpoint to include workload calculation
router.get("/team-members",
  requireAuth,
  requirePermission('analytics', 'read'),
  async (req, res) => {
    try {
      const { role, location } = req.query;

      let query = db
        .select({
          id: users.id,
          name: users.fullName,
          role: users.role,
          workflowPosition: users.workflowPosition,
          experienceLevel: users.experienceLevel,
          location: users.location,
        })
        .from(users)
        .where(sql`${users.workflowPosition} != 'none'`);

      if (role && role !== 'all') {
        query = query.where(eq(users.role, role as string));
      }

      if (location && location !== 'all') {
        query = query.where(eq(users.location, location as string));
      }

      const teamMembers = await query;

      // Calculate current workload for each team member
      const teamMembersWithLoad = await Promise.all(
        teamMembers.map(async (member) => {
          const assignedTasks = await db
            .select({ count: sql<number>`count(*)` })
            .from(tasks)
            .where(and(
              eq(tasks.assignedTo, member.id),
              sql`${tasks.status} != 'completed'`
            ))
            .then(result => result[0].count);

          // Calculate workload percentage (assuming max capacity is 10 tasks)
          const currentLoad = Math.min((assignedTasks / 10) * 100, 100);
          const availableHours = 40 - (assignedTasks * 4); // Assuming 4 hours per task

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
      res.status(500).json({ error: "Failed to fetch team members" });
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
      .orderBy(desc(analyticsDataPoints.timestamp));

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