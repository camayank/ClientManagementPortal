import { Router } from "express";
import taskRoutes from "./tasks";
import documentRoutes from "./documents";
import userRoutes from "./users";
import clientRoutes from "./clients";
import reportRoutes from "./reports";
import analyticsRoutes from "./analytics";

const router = Router();

router.use("/tasks", taskRoutes);
router.use("/documents", documentRoutes);
router.use("/users", userRoutes);
router.use("/clients", clientRoutes);
router.use("/reports", reportRoutes);
router.use("/analytics", analyticsRoutes);

export default router;
