import { Router } from "express";
import { requirePermission } from "../middleware/check-permission";

const router = Router();

// Document routes will be implemented later
router.get("/", requirePermission('documents', 'read'), async (req, res) => {
  res.status(501).send("Document management coming soon");
});

export default router;
