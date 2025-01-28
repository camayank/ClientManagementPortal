import { Router } from "express";
import { db } from "@db";
import { 
  analyticsMetrics, 
  analyticsDataPoints, 
  dashboardConfigs,
  dashboardWidgets,
  reportTemplates,
  insertAnalyticsMetricSchema,
  insertAnalyticsDataPointSchema,
  insertDashboardConfigSchema,
  insertDashboardWidgetSchema,
  insertReportTemplateSchema
} from "@db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

const router = Router();

// Middleware to check if user is authenticated
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
};

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
