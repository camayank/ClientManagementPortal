import { Router } from "express";
import { requirePermission } from "../middleware/check-permission";

const router = Router();

// User management routes will be implemented later
router.get("/", requirePermission('users', 'read'), async (req, res) => {
  res.status(501).send("User management coming soon");
});

export default router;
