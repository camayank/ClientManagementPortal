import { Router } from "express";
import { db } from "../../db";
import {
  qualityCheckpoints,
  qualityChecklistTemplates,
  qualityIssues,
  projects,
  clients
} from "../../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

const router = Router();

// Default checklist templates for each layer
const defaultLayer1Checks = [
  { id: "unc_txn", name: "Uncategorized transactions = 0", type: "automated" as const },
  { id: "bank_rec", name: "All bank accounts reconciled (variance < $10)", type: "automated" as const },
  { id: "balance", name: "Balance sheet balanced (A = L + E)", type: "automated" as const },
  { id: "neg_bal", name: "No negative balances in invalid accounts", type: "automated" as const },
  { id: "duplicates", name: "No duplicate transactions detected", type: "automated" as const },
  { id: "vendors", name: "All transactions have vendor/customer names", type: "automated" as const },
  { id: "patterns", name: "Unusual patterns flagged for review", type: "ai" as const }
];

const defaultLayer2Checks = [
  { id: "l1_review", name: "Review all Layer 1 flagged items", type: "manual" as const },
  { id: "je_review", name: "Manual journal entry review", type: "manual" as const },
  { id: "variance", name: "Variance analysis (>10% or >$5K)", type: "manual" as const },
  { id: "bs_rec", name: "Balance sheet reconciliation check", type: "manual" as const },
  { id: "fs_reason", name: "Financial statement reasonableness", type: "manual" as const },
  { id: "client_comm", name: "Client communication review", type: "manual" as const }
];

const defaultLayer3Checks = [
  { id: "fs_approve", name: "Final financial statement approval", type: "manual" as const },
  { id: "tax_imp", name: "Tax implication review", type: "manual" as const },
  { id: "compliance", name: "Compliance verification", type: "manual" as const },
  { id: "deliverable", name: "Client deliverable authorization", type: "manual" as const },
  { id: "signature", name: "Digital signature/timestamp", type: "manual" as const }
];

// ===================
// QUALITY CHECKPOINTS
// ===================

// Get all checkpoints for a project
router.get("/checkpoints/:projectId", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);

    const checkpoints = await db
      .select()
      .from(qualityCheckpoints)
      .where(eq(qualityCheckpoints.projectId, projectId))
      .orderBy(qualityCheckpoints.layer);

    res.json(checkpoints);
  } catch (error) {
    console.error("Error fetching quality checkpoints:", error);
    res.status(500).json({ error: "Failed to fetch quality checkpoints" });
  }
});

// Create quality checkpoint
router.post("/checkpoints", async (req, res) => {
  try {
    const { projectId, clientId, layer } = req.body;

    if (!projectId || !clientId || !layer) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get default checklist for the layer
    let checklistItems;
    switch (layer) {
      case 1:
        checklistItems = defaultLayer1Checks.map(item => ({
          ...item,
          status: "pending" as const
        }));
        break;
      case 2:
        checklistItems = defaultLayer2Checks.map(item => ({
          ...item,
          status: "pending" as const
        }));
        break;
      case 3:
        checklistItems = defaultLayer3Checks.map(item => ({
          ...item,
          status: "pending" as const
        }));
        break;
      default:
        return res.status(400).json({ error: "Invalid layer" });
    }

    const [newCheckpoint] = await db
      .insert(qualityCheckpoints)
      .values({
        projectId,
        clientId,
        layer,
        checklistItems,
        status: "pending",
        issues: []
      })
      .returning();

    res.status(201).json(newCheckpoint);
  } catch (error) {
    console.error("Error creating quality checkpoint:", error);
    res.status(500).json({ error: "Failed to create quality checkpoint" });
  }
});

// Update quality checkpoint
router.put("/checkpoints/:id", async (req, res) => {
  try {
    const checkpointId = parseInt(req.params.id);
    const userId = (req.user as any)?.id;
    const { status, checklistItems, issues, requiresRework, reworkReason, timeSpent } = req.body;

    const updateData: any = { updatedAt: new Date() };

    if (status !== undefined) {
      updateData.status = status;
      if (status === "passed" || status === "failed") {
        updateData.reviewedBy = userId;
        updateData.reviewedAt = new Date();
      }
    }

    if (checklistItems !== undefined) updateData.checklistItems = checklistItems;
    if (issues !== undefined) updateData.issues = issues;
    if (requiresRework !== undefined) updateData.requiresRework = requiresRework;
    if (reworkReason !== undefined) updateData.reworkReason = reworkReason;
    if (timeSpent !== undefined) updateData.timeSpent = timeSpent;

    const [updatedCheckpoint] = await db
      .update(qualityCheckpoints)
      .set(updateData)
      .where(eq(qualityCheckpoints.id, checkpointId))
      .returning();

    if (!updatedCheckpoint) {
      return res.status(404).json({ error: "Quality checkpoint not found" });
    }

    res.json(updatedCheckpoint);
  } catch (error) {
    console.error("Error updating quality checkpoint:", error);
    res.status(500).json({ error: "Failed to update quality checkpoint" });
  }
});

// Send checkpoint back for rework
router.post("/checkpoints/:id/rework", async (req, res) => {
  try {
    const checkpointId = parseInt(req.params.id);
    const userId = (req.user as any)?.id;
    const { reworkReason, issues } = req.body;

    if (!reworkReason) {
      return res.status(400).json({ error: "Rework reason is required" });
    }

    const [updatedCheckpoint] = await db
      .update(qualityCheckpoints)
      .set({
        status: "failed",
        requiresRework: true,
        reworkReason,
        issues: issues || [],
        reviewedBy: userId,
        reviewedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(qualityCheckpoints.id, checkpointId))
      .returning();

    if (!updatedCheckpoint) {
      return res.status(404).json({ error: "Quality checkpoint not found" });
    }

    res.json(updatedCheckpoint);
  } catch (error) {
    console.error("Error sending checkpoint for rework:", error);
    res.status(500).json({ error: "Failed to send checkpoint for rework" });
  }
});

// Run automated Layer 1 checks
router.post("/run-layer1/:projectId", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);

    // Get or create Layer 1 checkpoint
    const existingCheckpoints = await db
      .select()
      .from(qualityCheckpoints)
      .where(
        and(
          eq(qualityCheckpoints.projectId, projectId),
          eq(qualityCheckpoints.layer, 1)
        )
      )
      .limit(1);

    let checkpoint;
    if (existingCheckpoints.length === 0) {
      // Get project to get clientId
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      [checkpoint] = await db
        .insert(qualityCheckpoints)
        .values({
          projectId,
          clientId: project.clientId!,
          layer: 1,
          checklistItems: defaultLayer1Checks.map(item => ({
            ...item,
            status: "pending" as const
          })),
          status: "in_progress",
          issues: []
        })
        .returning();
    } else {
      checkpoint = existingCheckpoints[0];
    }

    // Simulate automated checks (in production, these would connect to QuickBooks/Xero)
    const updatedChecklist = checkpoint.checklistItems.map((item: any) => {
      // Simulate random pass/fail for demonstration
      const passed = Math.random() > 0.2; // 80% pass rate
      return {
        ...item,
        status: passed ? "passed" : "failed",
        notes: passed ? undefined : "Review required"
      };
    });

    const allPassed = updatedChecklist.every((item: any) => item.status === "passed");
    const issues = updatedChecklist
      .filter((item: any) => item.status === "failed")
      .map((item: any) => ({
        issueType: item.id,
        severity: "medium" as const,
        description: `${item.name} check failed`,
        resolution: undefined
      }));

    const [updatedCheckpoint] = await db
      .update(qualityCheckpoints)
      .set({
        checklistItems: updatedChecklist,
        status: allPassed ? "passed" : "failed",
        issues,
        updatedAt: new Date()
      })
      .where(eq(qualityCheckpoints.id, checkpoint.id))
      .returning();

    res.json(updatedCheckpoint);
  } catch (error) {
    console.error("Error running Layer 1 checks:", error);
    res.status(500).json({ error: "Failed to run Layer 1 checks" });
  }
});

// ===================
// CHECKLIST TEMPLATES
// ===================

// Get all checklist templates
router.get("/templates", async (req, res) => {
  try {
    const templates = await db
      .select()
      .from(qualityChecklistTemplates)
      .where(eq(qualityChecklistTemplates.isActive, true))
      .orderBy(qualityChecklistTemplates.layer);

    res.json(templates);
  } catch (error) {
    console.error("Error fetching checklist templates:", error);
    res.status(500).json({ error: "Failed to fetch checklist templates" });
  }
});

// Create checklist template
router.post("/templates", async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const { name, layer, checklistItems, applicableTo } = req.body;

    if (!name || !layer || !checklistItems) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const [newTemplate] = await db
      .insert(qualityChecklistTemplates)
      .values({
        name,
        layer,
        checklistItems,
        applicableTo: applicableTo || [],
        isActive: true,
        createdBy: userId
      })
      .returning();

    res.status(201).json(newTemplate);
  } catch (error) {
    console.error("Error creating checklist template:", error);
    res.status(500).json({ error: "Failed to create checklist template" });
  }
});

// ===================
// QUALITY ISSUES
// ===================

// Get issues for a checkpoint
router.get("/issues/:checkpointId", async (req, res) => {
  try {
    const checkpointId = parseInt(req.params.checkpointId);

    const issues = await db
      .select()
      .from(qualityIssues)
      .where(eq(qualityIssues.checkpointId, checkpointId))
      .orderBy(desc(qualityIssues.createdAt));

    res.json(issues);
  } catch (error) {
    console.error("Error fetching quality issues:", error);
    res.status(500).json({ error: "Failed to fetch quality issues" });
  }
});

// Create quality issue
router.post("/issues", async (req, res) => {
  try {
    const { checkpointId, issueType, severity, description, assignedTo } = req.body;

    if (!checkpointId || !issueType || !severity || !description) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const [newIssue] = await db
      .insert(qualityIssues)
      .values({
        checkpointId,
        issueType,
        severity,
        description,
        assignedTo: assignedTo || null,
        status: "open"
      })
      .returning();

    res.status(201).json(newIssue);
  } catch (error) {
    console.error("Error creating quality issue:", error);
    res.status(500).json({ error: "Failed to create quality issue" });
  }
});

// Update/resolve quality issue
router.put("/issues/:id", async (req, res) => {
  try {
    const issueId = parseInt(req.params.id);
    const userId = (req.user as any)?.id;
    const { status, resolution, assignedTo } = req.body;

    const updateData: any = { updatedAt: new Date() };

    if (status !== undefined) {
      updateData.status = status;
      if (status === "resolved") {
        updateData.resolvedBy = userId;
        updateData.resolvedAt = new Date();
      }
    }

    if (resolution !== undefined) updateData.resolution = resolution;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;

    const [updatedIssue] = await db
      .update(qualityIssues)
      .set(updateData)
      .where(eq(qualityIssues.id, issueId))
      .returning();

    if (!updatedIssue) {
      return res.status(404).json({ error: "Quality issue not found" });
    }

    res.json(updatedIssue);
  } catch (error) {
    console.error("Error updating quality issue:", error);
    res.status(500).json({ error: "Failed to update quality issue" });
  }
});

// ===================
// DASHBOARD/METRICS
// ===================

// Get quality control dashboard metrics
router.get("/dashboard", async (req, res) => {
  try {
    // Get all checkpoints with aggregated data
    const allCheckpoints = await db
      .select()
      .from(qualityCheckpoints)
      .orderBy(desc(qualityCheckpoints.createdAt))
      .limit(100);

    const totalCheckpoints = allCheckpoints.length;
    const passedCheckpoints = allCheckpoints.filter(c => c.status === "passed").length;
    const failedCheckpoints = allCheckpoints.filter(c => c.status === "failed").length;
    const inProgressCheckpoints = allCheckpoints.filter(c => c.status === "in_progress").length;

    const qualityScore = totalCheckpoints > 0
      ? Math.round((passedCheckpoints / totalCheckpoints) * 100)
      : 0;

    // Get all issues
    const allIssues = await db
      .select()
      .from(qualityIssues)
      .orderBy(desc(qualityIssues.createdAt))
      .limit(100);

    const openIssues = allIssues.filter(i => i.status === "open").length;
    const criticalIssues = allIssues.filter(i => i.severity === "critical" && i.status === "open").length;

    // Calculate average review time
    const completedCheckpoints = allCheckpoints.filter(c => c.reviewedAt && c.createdAt);
    const avgReviewTime = completedCheckpoints.length > 0
      ? completedCheckpoints.reduce((sum, c) => {
          const diff = new Date(c.reviewedAt!).getTime() - new Date(c.createdAt!).getTime();
          return sum + diff;
        }, 0) / completedCheckpoints.length
      : 0;

    const avgReviewHours = Math.round(avgReviewTime / (1000 * 60 * 60));

    res.json({
      qualityScore,
      totalCheckpoints,
      passedCheckpoints,
      failedCheckpoints,
      inProgressCheckpoints,
      openIssues,
      criticalIssues,
      avgReviewHours,
      recentCheckpoints: allCheckpoints.slice(0, 10),
      recentIssues: allIssues.slice(0, 10)
    });
  } catch (error) {
    console.error("Error fetching QC dashboard:", error);
    res.status(500).json({ error: "Failed to fetch QC dashboard" });
  }
});

export default router;
