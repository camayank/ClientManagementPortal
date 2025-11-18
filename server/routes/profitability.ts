import { Router } from "express";
import { db } from "../../db";
import {
  clientProfitability,
  timeEntries,
  clients,
  hourlyRates
} from "../../db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

const router = Router();

// ===================
// CLIENT PROFITABILITY
// ===================

// Get all clients profitability ranking
router.get("/clients", async (req, res) => {
  try {
    const { period } = req.query;

    let query;
    if (period) {
      query = db
        .select()
        .from(clientProfitability)
        .where(eq(clientProfitability.period, period as string))
        .orderBy(desc(clientProfitability.contributionMarginPercent));
    } else {
      // Get latest period for each client
      query = db
        .select()
        .from(clientProfitability)
        .orderBy(
          clientProfitability.clientId,
          desc(clientProfitability.period)
        );
    }

    const profitabilityData = await query;

    // Get unique clients (latest period only if no period specified)
    const clientMap = new Map();
    profitabilityData.forEach(p => {
      if (!period && clientMap.has(p.clientId)) {
        return; // Skip if we already have this client (we want latest only)
      }
      clientMap.set(p.clientId, p);
    });

    // Get client details
    const clientIds = Array.from(clientMap.keys());
    const clientDetails = await db
      .select()
      .from(clients)
      .where(sql`${clients.id} = ANY(${clientIds})`);

    const enrichedData = Array.from(clientMap.values()).map(p => {
      const client = clientDetails.find(c => c.id === p.clientId);
      return {
        ...p,
        clientName: client?.company || "Unknown",
        revenueFormatted: `$${(p.revenue / 100).toFixed(2)}`,
        marginFormatted: `$${(p.margin / 100).toFixed(2)}`,
        hoursSpentFormatted: `${Math.round(p.hoursSpent / 60 * 10) / 10}h`,
        rating: p.contributionMarginPercent > 50 ? "A" :
                p.contributionMarginPercent > 30 ? "B" :
                p.contributionMarginPercent > 10 ? "C" : "D"
      };
    });

    res.json(enrichedData);
  } catch (error) {
    console.error("Error fetching client profitability:", error);
    res.status(500).json({ error: "Failed to fetch client profitability" });
  }
});

// Get detailed profitability for specific client
router.get("/client/:id", async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);

    // Get all profitability records for this client
    const profitabilityHistory = await db
      .select()
      .from(clientProfitability)
      .where(eq(clientProfitability.clientId, clientId))
      .orderBy(desc(clientProfitability.period));

    // Get client details
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Calculate trends
    const trends = profitabilityHistory.map((p, index) => {
      const previous = profitabilityHistory[index + 1];
      return {
        ...p,
        revenueChange: previous ? ((p.revenue - previous.revenue) / previous.revenue * 100) : 0,
        marginChange: previous ? ((p.margin - previous.margin) / previous.margin * 100) : 0,
        hoursChange: previous ? ((p.hoursSpent - previous.hoursSpent) / previous.hoursSpent * 100) : 0
      };
    });

    res.json({
      client,
      currentPeriod: trends[0] || null,
      history: trends,
      summary: {
        avgMarginPercent: profitabilityHistory.length > 0
          ? Math.round(profitabilityHistory.reduce((sum, p) => sum + p.contributionMarginPercent, 0) / profitabilityHistory.length)
          : 0,
        totalRevenue: profitabilityHistory.reduce((sum, p) => sum + p.revenue, 0),
        totalHours: profitabilityHistory.reduce((sum, p) => sum + p.hoursSpent, 0)
      }
    });
  } catch (error) {
    console.error("Error fetching client profitability detail:", error);
    res.status(500).json({ error: "Failed to fetch client profitability detail" });
  }
});

// Calculate/recalculate profitability metrics
router.post("/calculate", async (req, res) => {
  try {
    const { clientId, period, revenue } = req.body;

    if (!clientId || !period) {
      return res.status(400).json({ error: "Client ID and period are required" });
    }

    // Parse period (format: "YYYY-MM")
    const [year, month] = period.split("-").map(Number);
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59);

    // Get all time entries for this client in this period
    const entries = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.clientId, clientId),
          gte(timeEntries.startTime, periodStart),
          lte(timeEntries.startTime, periodEnd),
          eq(timeEntries.status, "approved")
        )
      );

    // Calculate totals
    const totalMinutes = entries.reduce((sum, e) => sum + (e.duration || 0), 0);
    const billableMinutes = entries.filter(e => e.billable).reduce((sum, e) => sum + (e.duration || 0), 0);

    // Calculate direct costs (time × rate)
    const directCosts = entries.reduce((sum, e) => {
      const rate = e.hourlyRate || 0;
      const hours = (e.duration || 0) / 60;
      return sum + (hours * rate);
    }, 0);

    // Revenue (passed in or estimated from billable hours)
    const revenueAmount = revenue || (billableMinutes / 60 * 15000); // Default $150/hr

    // Calculate margin
    const marginAmount = revenueAmount - directCosts;
    const marginPercent = revenueAmount > 0 ? Math.round((marginAmount / revenueAmount) * 100) : 0;

    // Average hourly rate
    const avgRate = totalMinutes > 0 ? Math.round((directCosts / (totalMinutes / 60))) : 0;

    // Upsert profitability record
    const existingRecord = await db
      .select()
      .from(clientProfitability)
      .where(
        and(
          eq(clientProfitability.clientId, clientId),
          eq(clientProfitability.period, period)
        )
      )
      .limit(1);

    let profitabilityRecord;
    if (existingRecord.length > 0) {
      // Update existing
      [profitabilityRecord] = await db
        .update(clientProfitability)
        .set({
          revenue: Math.round(revenueAmount),
          directCosts: Math.round(directCosts),
          margin: Math.round(marginAmount),
          contributionMarginPercent: marginPercent,
          hoursSpent: totalMinutes,
          billableHours: billableMinutes,
          averageHourlyRate: avgRate,
          calculatedAt: new Date()
        })
        .where(eq(clientProfitability.id, existingRecord[0].id))
        .returning();
    } else {
      // Create new
      [profitabilityRecord] = await db
        .insert(clientProfitability)
        .values({
          clientId,
          period,
          revenue: Math.round(revenueAmount),
          directCosts: Math.round(directCosts),
          margin: Math.round(marginAmount),
          contributionMarginPercent: marginPercent,
          hoursSpent: totalMinutes,
          billableHours: billableMinutes,
          averageHourlyRate: avgRate
        })
        .returning();
    }

    res.json(profitabilityRecord);
  } catch (error) {
    console.error("Error calculating profitability:", error);
    res.status(500).json({ error: "Failed to calculate profitability" });
  }
});

// Get profitability trends for a client
router.get("/trends/:clientId", async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const { months = 12 } = req.query;

    const trends = await db
      .select()
      .from(clientProfitability)
      .where(eq(clientProfitability.clientId, clientId))
      .orderBy(desc(clientProfitability.period))
      .limit(parseInt(months as string));

    // Format for charting
    const chartData = trends.reverse().map(t => ({
      period: t.period,
      revenue: t.revenue / 100,
      directCosts: t.directCosts / 100,
      margin: t.margin / 100,
      marginPercent: t.contributionMarginPercent,
      hours: Math.round(t.hoursSpent / 60 * 10) / 10
    }));

    res.json(chartData);
  } catch (error) {
    console.error("Error fetching profitability trends:", error);
    res.status(500).json({ error: "Failed to fetch profitability trends" });
  }
});

// ===================
// CAPACITY PLANNING
// ===================

// Get capacity planning data
router.get("/capacity", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Start date and end date are required" });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    // Get all time entries
    const allEntries = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          gte(timeEntries.startTime, start),
          lte(timeEntries.startTime, end)
        )
      );

    // Group by user
    const byUser: Record<number, { userId: number; totalMinutes: number; billableMinutes: number }> = {};
    allEntries.forEach(entry => {
      if (!byUser[entry.userId]) {
        byUser[entry.userId] = { userId: entry.userId, totalMinutes: 0, billableMinutes: 0 };
      }
      byUser[entry.userId].totalMinutes += entry.duration || 0;
      if (entry.billable) {
        byUser[entry.userId].billableMinutes += entry.duration || 0;
      }
    });

    // Calculate capacity (assuming 40 hours per week)
    const workDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) / 7) * 5;
    const expectedMinutesPerUser = workDays * 8 * 60;

    const capacityData = Object.values(byUser).map(u => {
      const utilization = (u.totalMinutes / expectedMinutesPerUser) * 100;
      const available = Math.max(0, expectedMinutesPerUser - u.totalMinutes);

      return {
        userId: u.userId,
        utilizationPercent: Math.round(utilization),
        totalHours: Math.round(u.totalMinutes / 60 * 10) / 10,
        billableHours: Math.round(u.billableMinutes / 60 * 10) / 10,
        availableHours: Math.round(available / 60 * 10) / 10,
        status: utilization > 100 ? "overloaded" :
                utilization > 85 ? "at_capacity" :
                utilization > 60 ? "optimal" : "underutilized"
      };
    });

    res.json(capacityData);
  } catch (error) {
    console.error("Error fetching capacity data:", error);
    res.status(500).json({ error: "Failed to fetch capacity data" });
  }
});

// ===================
// HOURLY RATES
// ===================

// Get hourly rates for a user
router.get("/rates/user/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    const rates = await db
      .select()
      .from(hourlyRates)
      .where(eq(hourlyRates.userId, userId))
      .orderBy(desc(hourlyRates.effectiveFrom));

    res.json(rates);
  } catch (error) {
    console.error("Error fetching hourly rates:", error);
    res.status(500).json({ error: "Failed to fetch hourly rates" });
  }
});

// Create hourly rate
router.post("/rates", async (req, res) => {
  try {
    const { userId, standardRate, effectiveFrom, effectiveTo, clientId, roleId } = req.body;

    if (!userId || !standardRate || !effectiveFrom) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const [newRate] = await db
      .insert(hourlyRates)
      .values({
        userId,
        roleId: roleId || null,
        standardRate: Math.round(standardRate * 100), // Convert to cents
        effectiveFrom: new Date(effectiveFrom),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        clientId: clientId || null
      })
      .returning();

    res.status(201).json(newRate);
  } catch (error) {
    console.error("Error creating hourly rate:", error);
    res.status(500).json({ error: "Failed to create hourly rate" });
  }
});

// Update hourly rate
router.put("/rates/:id", async (req, res) => {
  try {
    const rateId = parseInt(req.params.id);
    const { standardRate, effectiveFrom, effectiveTo } = req.body;

    const updateData: any = {};

    if (standardRate !== undefined) updateData.standardRate = Math.round(standardRate * 100);
    if (effectiveFrom !== undefined) updateData.effectiveFrom = new Date(effectiveFrom);
    if (effectiveTo !== undefined) updateData.effectiveTo = effectiveTo ? new Date(effectiveTo) : null;

    const [updatedRate] = await db
      .update(hourlyRates)
      .set(updateData)
      .where(eq(hourlyRates.id, rateId))
      .returning();

    if (!updatedRate) {
      return res.status(404).json({ error: "Hourly rate not found" });
    }

    res.json(updatedRate);
  } catch (error) {
    console.error("Error updating hourly rate:", error);
    res.status(500).json({ error: "Failed to update hourly rate" });
  }
});

export default router;
