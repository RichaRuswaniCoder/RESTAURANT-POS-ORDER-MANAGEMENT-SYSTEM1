import { Router } from "express";
import {
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem
} from "../controllers/menu.controller.js";
import {
  authenticate,
  requireAdmin
} from "../middleware/auth.middleware.js";

const router = Router();

// Logged-in users can view the menu
router.get("/", authenticate, getMenuItems);

// Only Admin can modify menu items
router.post("/", authenticate, requireAdmin, createMenuItem);
router.put("/:id", authenticate, requireAdmin, updateMenuItem);
router.delete("/:id", authenticate, requireAdmin, deleteMenuItem);

export default router;