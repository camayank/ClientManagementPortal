import { Router } from "express";
import taskRoutes from "./tasks";
import documentRoutes from "./documents";
import userRoutes from "./users";
import clientRoutes from "./clients";
import reportRoutes from "./reports";

const router = Router();

router.use("/tasks", taskRoutes);
router.use("/documents", documentRoutes);
router.use("/users", userRoutes);
router.use("/clients", clientRoutes);
router.use("/reports", reportRoutes);

export default router;
