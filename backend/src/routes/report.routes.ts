import { Router } from "express";
import { getDailySales } from "../controllers/report.controller.js";
import { authenticate, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();
router.get("/daily-sales", authenticate, requireAdmin, getDailySales);
export default router;
