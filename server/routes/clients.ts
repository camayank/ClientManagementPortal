import { Router } from "express";
import { requirePermission } from "../middleware/check-permission";

const router = Router();

// Client management routes will be implemented later
router.get("/", requirePermission('clients', 'read'), async (req, res) => {
  res.status(501).send("Client management coming soon");
});

export default router;
