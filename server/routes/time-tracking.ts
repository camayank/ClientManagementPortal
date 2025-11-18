import { Router } from "express";
import { db } from "../../db";
import {
  timeEntries,
  timesheets,
  hourlyRates,
  clientProfitability,
  users,
  clients
} from "../../db/schema";
import { eq, and, gte, lte, isNull, desc, sql } from "drizzle-orm";

const router = Router();

// ===================
// TIME ENTRIES
// ===================

// Get current running timer for user
router.get("/current", async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const [currentEntry] = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.userId, userId),
          isNull(timeEntries.endTime)
        )
      )
      .limit(1);

    res.json(currentEntry || null);
  } catch (error) {
    console.error("Error fetching current timer:", error);
    res.status(500).json({ error: "Failed to fetch current timer" });
  }
});

// Start timer
router.post("/start", async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { clientId, projectId, taskId, description, billable } = req.body;

    // Check if user already has a running timer
    const existingTimer = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.userId, userId),
          isNull(timeEntries.endTime)
        )
      )
      .limit(1);

    if (existingTimer.length > 0) {
      return res.status(400).json({ error: "Timer already running. Stop current timer first." });
    }

    // Get hourly rate for user
    const rate = await db
      .select()
      .from(hourlyRates)
      .where(
        and(
          eq(hourlyRates.userId, userId),
          lte(hourlyRates.effectiveFrom, new Date())
        )
      )
      .orderBy(desc(hourlyRates.effectiveFrom))
      .limit(1);

    const [newEntry] = await db
      .insert(timeEntries)
      .values({
        userId,
        clientId: clientId || null,
        projectId: projectId || null,
        taskId: taskId || null,
        description: description || "",
        billable: billable !== false,
        hourlyRate: rate.length > 0 ? rate[0].standardRate : null,
        startTime: new Date(),
        status: "draft"
      })
      .returning();

    res.status(201).json(newEntry);
  } catch (error) {
    console.error("Error starting timer:", error);
    res.status(500).json({ error: "Failed to start timer" });
  }
});

// Stop timer
router.post("/stop", async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const [runningEntry] = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.userId, userId),
          isNull(timeEntries.endTime)
        )
      )
      .limit(1);

    if (!runningEntry) {
      return res.status(400).json({ error: "No running timer found" });
    }

    const endTime = new Date();
    const duration = Math.round((endTime.getTime() - new Date(runningEntry.startTime).getTime()) / (1000 * 60));

    const [stoppedEntry] = await db
      .update(timeEntries)
      .set({
        endTime,
        duration,
        updatedAt: new Date()
      })
      .where(eq(timeEntries.id, runningEntry.id))
      .returning();

    res.json(stoppedEntry);
  } catch (error) {
    console.error("Error stopping timer:", error);
    res.status(500).json({ error: "Failed to stop timer" });
  }
});

// Get time entries (with filters)
router.get("/entries", async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { startDate, endDate, clientId, projectId, status } = req.query;

    let query = db.select().from(timeEntries).where(eq(timeEntries.userId, userId));

    // Apply filters
    const conditions = [eq(timeEntries.userId, userId)];

    if (startDate) {
      conditions.push(gte(timeEntries.startTime, new Date(startDate as string)));
    }

    if (endDate) {
      conditions.push(lte(timeEntries.startTime, new Date(endDate as string)));
    }

    if (clientId) {
      conditions.push(eq(timeEntries.clientId, parseInt(clientId as string)));
    }

    if (projectId) {
      conditions.push(eq(timeEntries.projectId, parseInt(projectId as string)));
    }

    if (status) {
      conditions.push(eq(timeEntries.status, status as any));
    }

    const entries = await db
      .select()
      .from(timeEntries)
      .where(and(...conditions))
      .orderBy(desc(timeEntries.startTime));

    res.json(entries);
  } catch (error) {
    console.error("Error fetching time entries:", error);
    res.status(500).json({ error: "Failed to fetch time entries" });
  }
});

// Create manual time entry
router.post("/entries", async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { clientId, projectId, taskId, startTime, endTime, description, billable, notes } = req.body;

    if (!startTime || !endTime) {
      return res.status(400).json({ error: "Start time and end time are required" });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

    if (duration <= 0) {
      return res.status(400).json({ error: "End time must be after start time" });
    }

    // Get hourly rate
    const rate = await db
      .select()
      .from(hourlyRates)
      .where(
        and(
          eq(hourlyRates.userId, userId),
          lte(hourlyRates.effectiveFrom, start)
        )
      )
      .orderBy(desc(hourlyRates.effectiveFrom))
      .limit(1);

    const [newEntry] = await db
      .insert(timeEntries)
      .values({
        userId,
        clientId: clientId || null,
        projectId: projectId || null,
        taskId: taskId || null,
        description: description || "",
        notes: notes || "",
        billable: billable !== false,
        hourlyRate: rate.length > 0 ? rate[0].standardRate : null,
        startTime: start,
        endTime: end,
        duration,
        status: "draft"
      })
      .returning();

    res.status(201).json(newEntry);
  } catch (error) {
    console.error("Error creating time entry:", error);
    res.status(500).json({ error: "Failed to create time entry" });
  }
});

// Update time entry
router.put("/entries/:id", async (req, res) => {
  try {
    const entryId = parseInt(req.params.id);
    const userId = (req.user as any)?.id;
    const { description, billable, notes, startTime, endTime } = req.body;

    const updateData: any = { updatedAt: new Date() };

    if (description !== undefined) updateData.description = description;
    if (billable !== undefined) updateData.billable = billable;
    if (notes !== undefined) updateData.notes = notes;

    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

      updateData.startTime = start;
      updateData.endTime = end;
      updateData.duration = duration;
    }

    const [updatedEntry] = await db
      .update(timeEntries)
      .set(updateData)
      .where(
        and(
          eq(timeEntries.id, entryId),
          eq(timeEntries.userId, userId)
        )
      )
      .returning();

    if (!updatedEntry) {
      return res.status(404).json({ error: "Time entry not found" });
    }

    res.json(updatedEntry);
  } catch (error) {
    console.error("Error updating time entry:", error);
    res.status(500).json({ error: "Failed to update time entry" });
  }
});

// Delete time entry
router.delete("/entries/:id", async (req, res) => {
  try {
    const entryId = parseInt(req.params.id);
    const userId = (req.user as any)?.id;

    const deletedEntry = await db
      .delete(timeEntries)
      .where(
        and(
          eq(timeEntries.id, entryId),
          eq(timeEntries.userId, userId),
          eq(timeEntries.status, "draft")
        )
      )
      .returning();

    if (!deletedEntry.length) {
      return res.status(404).json({ error: "Time entry not found or cannot be deleted" });
    }

    res.json({ message: "Time entry deleted successfully" });
  } catch (error) {
    console.error("Error deleting time entry:", error);
    res.status(500).json({ error: "Failed to delete time entry" });
  }
});

// ===================
// TIMESHEETS
// ===================

// Submit weekly timesheet
router.post("/timesheets/submit", async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { weekStarting, weekEnding, notes } = req.body;

    if (!weekStarting || !weekEnding) {
      return res.status(400).json({ error: "Week starting and ending dates are required" });
    }

    const start = new Date(weekStarting);
    const end = new Date(weekEnding);

    // Get all time entries for the week
    const entries = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.userId, userId),
          gte(timeEntries.startTime, start),
          lte(timeEntries.startTime, end),
          eq(timeEntries.status, "draft")
        )
      );

    const totalHours = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    const billableHours = entries
      .filter(e => e.billable)
      .reduce((sum, entry) => sum + (entry.duration || 0), 0);

    // Create timesheet
    const [newTimesheet] = await db
      .insert(timesheets)
      .values({
        userId,
        weekStarting: start,
        weekEnding: end,
        totalHours,
        billableHours,
        status: "submitted",
        submittedAt: new Date(),
        notes: notes || ""
      })
      .returning();

    // Update all time entries to submitted status
    await db
      .update(timeEntries)
      .set({ status: "submitted", updatedAt: new Date() })
      .where(
        and(
          eq(timeEntries.userId, userId),
          gte(timeEntries.startTime, start),
          lte(timeEntries.startTime, end),
          eq(timeEntries.status, "draft")
        )
      );

    res.status(201).json(newTimesheet);
  } catch (error) {
    console.error("Error submitting timesheet:", error);
    res.status(500).json({ error: "Failed to submit timesheet" });
  }
});

// Get timesheets for user
router.get("/timesheets/user/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    const userTimesheets = await db
      .select()
      .from(timesheets)
      .where(eq(timesheets.userId, userId))
      .orderBy(desc(timesheets.weekStarting));

    res.json(userTimesheets);
  } catch (error) {
    console.error("Error fetching timesheets:", error);
    res.status(500).json({ error: "Failed to fetch timesheets" });
  }
});

// Get pending approval timesheets
router.get("/timesheets/pending-approval", async (req, res) => {
  try {
    const pendingTimesheets = await db
      .select()
      .from(timesheets)
      .where(eq(timesheets.status, "submitted"))
      .orderBy(desc(timesheets.submittedAt));

    res.json(pendingTimesheets);
  } catch (error) {
    console.error("Error fetching pending timesheets:", error);
    res.status(500).json({ error: "Failed to fetch pending timesheets" });
  }
});

// Approve timesheet
router.put("/timesheets/:id/approve", async (req, res) => {
  try {
    const timesheetId = parseInt(req.params.id);
    const userId = (req.user as any)?.id;

    const [approvedTimesheet] = await db
      .update(timesheets)
      .set({
        status: "approved",
        approvedBy: userId,
        approvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(timesheets.id, timesheetId))
      .returning();

    if (!approvedTimesheet) {
      return res.status(404).json({ error: "Timesheet not found" });
    }

    // Update related time entries
    await db
      .update(timeEntries)
      .set({ status: "approved", approvedBy: userId, approvedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(timeEntries.userId, approvedTimesheet.userId),
          gte(timeEntries.startTime, approvedTimesheet.weekStarting),
          lte(timeEntries.startTime, approvedTimesheet.weekEnding)
        )
      );

    res.json(approvedTimesheet);
  } catch (error) {
    console.error("Error approving timesheet:", error);
    res.status(500).json({ error: "Failed to approve timesheet" });
  }
});

// Reject timesheet
router.put("/timesheets/:id/reject", async (req, res) => {
  try {
    const timesheetId = parseInt(req.params.id);
    const { notes } = req.body;

    const [rejectedTimesheet] = await db
      .update(timesheets)
      .set({
        status: "rejected",
        notes,
        updatedAt: new Date()
      })
      .where(eq(timesheets.id, timesheetId))
      .returning();

    if (!rejectedTimesheet) {
      return res.status(404).json({ error: "Timesheet not found" });
    }

    // Update related time entries back to draft
    await db
      .update(timeEntries)
      .set({ status: "draft", updatedAt: new Date() })
      .where(
        and(
          eq(timeEntries.userId, rejectedTimesheet.userId),
          gte(timeEntries.startTime, rejectedTimesheet.weekStarting),
          lte(timeEntries.startTime, rejectedTimesheet.weekEnding)
        )
      );

    res.json(rejectedTimesheet);
  } catch (error) {
    console.error("Error rejecting timesheet:", error);
    res.status(500).json({ error: "Failed to reject timesheet" });
  }
});

// ===================
// UTILIZATION
// ===================

// Get team utilization dashboard
router.get("/utilization/team", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Start date and end date are required" });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    // Get all users
    const allUsers = await db.select().from(users);

    // Get time entries for all users
    const allEntries = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          gte(timeEntries.startTime, start),
          lte(timeEntries.startTime, end)
        )
      );

    // Calculate utilization per user
    const utilizationData = allUsers.map(user => {
      const userEntries = allEntries.filter(e => e.userId === user.id);
      const totalMinutes = userEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
      const billableMinutes = userEntries.filter(e => e.billable).reduce((sum, e) => sum + (e.duration || 0), 0);

      const workDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) / 7) * 5;
      const expectedMinutes = workDays * 8 * 60; // 8 hours per day

      return {
        userId: user.id,
        userName: user.fullName || user.username,
        totalHours: Math.round(totalMinutes / 60 * 10) / 10,
        billableHours: Math.round(billableMinutes / 60 * 10) / 10,
        utilization: expectedMinutes > 0 ? Math.round((totalMinutes / expectedMinutes) * 100) : 0,
        billableRate: totalMinutes > 0 ? Math.round((billableMinutes / totalMinutes) * 100) : 0
      };
    });

    res.json(utilizationData);
  } catch (error) {
    console.error("Error fetching team utilization:", error);
    res.status(500).json({ error: "Failed to fetch team utilization" });
  }
});

// Get individual user utilization
router.get("/utilization/user/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Start date and end date are required" });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    const entries = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.userId, userId),
          gte(timeEntries.startTime, start),
          lte(timeEntries.startTime, end)
        )
      );

    const totalMinutes = entries.reduce((sum, e) => sum + (e.duration || 0), 0);
    const billableMinutes = entries.filter(e => e.billable).reduce((sum, e) => sum + (e.duration || 0), 0);

    // Group by client
    const byClient: Record<number, { clientId: number; totalMinutes: number; billableMinutes: number }> = {};
    entries.forEach(entry => {
      if (entry.clientId) {
        if (!byClient[entry.clientId]) {
          byClient[entry.clientId] = { clientId: entry.clientId, totalMinutes: 0, billableMinutes: 0 };
        }
        byClient[entry.clientId].totalMinutes += entry.duration || 0;
        if (entry.billable) {
          byClient[entry.clientId].billableMinutes += entry.duration || 0;
        }
      }
    });

    res.json({
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      billableHours: Math.round(billableMinutes / 60 * 10) / 10,
      byClient: Object.values(byClient).map(c => ({
        clientId: c.clientId,
        totalHours: Math.round(c.totalMinutes / 60 * 10) / 10,
        billableHours: Math.round(c.billableMinutes / 60 * 10) / 10
      }))
    });
  } catch (error) {
    console.error("Error fetching user utilization:", error);
    res.status(500).json({ error: "Failed to fetch user utilization" });
  }
});

export default router;
