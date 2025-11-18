import { Router } from "express";
import taskRoutes from "./tasks";
import documentRoutes from "./documents";
import userRoutes from "./users";
import clientRoutes from "./clients";
import reportRoutes from "./reports";
import analyticsRoutes from "./analytics";
import complianceRoutes from "./compliance";
import accountingProfileRoutes from "./accounting-profiles";
import workflowRoutes from "./workflows";
import qualityControlRoutes from "./quality-control";
import timeTrackingRoutes from "./time-tracking";
import profitabilityRoutes from "./profitability";
import communicationRoutes from "./communication";

const router = Router();

router.use("/tasks", taskRoutes);
router.use("/documents", documentRoutes);
router.use("/users", userRoutes);
router.use("/clients", clientRoutes);
router.use("/reports", reportRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/compliance", complianceRoutes);
router.use("/accounting-profiles", accountingProfileRoutes);
router.use("/workflows", workflowRoutes);
router.use("/quality-control", qualityControlRoutes);
router.use("/time-tracking", timeTrackingRoutes);
router.use("/profitability", profitabilityRoutes);
router.use("/communication", communicationRoutes);

export default router;
