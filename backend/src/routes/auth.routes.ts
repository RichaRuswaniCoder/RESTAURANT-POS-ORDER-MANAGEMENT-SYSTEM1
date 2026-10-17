import { Router } from "express";
import { getCurrentUser, login, logout } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();
router.post("/login", login);
router.get("/me", authenticate, getCurrentUser);
router.post("/logout", logout);
export default router;
