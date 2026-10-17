import { Router } from "express";
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  updatePaymentStatus,
  getOrderInvoice
} from "../controllers/order.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();
router.get("/", authenticate, getOrders);
router.post("/", authenticate, createOrder);
router.get("/:id/invoice", authenticate, getOrderInvoice);
router.get("/:id", authenticate, getOrderById);
router.patch("/:id/status", authenticate, updateOrderStatus);
router.patch("/:id/payment", authenticate, updatePaymentStatus);
export default router;
