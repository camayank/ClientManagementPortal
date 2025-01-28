import { Router } from "express";
import { requirePermission } from "../middleware/check-permission";

const router = Router();

// Reporting routes will be implemented later
router.get("/", requirePermission('reports', 'read'), async (req, res) => {
  res.status(501).send("Reporting features coming soon");
});

export default router;
