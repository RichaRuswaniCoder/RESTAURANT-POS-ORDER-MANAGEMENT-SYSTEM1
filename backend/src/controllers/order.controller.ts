import { randomBytes } from "node:crypto";
import type { RequestHandler } from "express";
import { isValidObjectId } from "mongoose";

import { env } from "../config/env.js";
import { calculateBill } from "../domain/billing.js";
import { ORDER_STATUSES, canTransitionOrderStatus, normalizeLegacyStatus, type OrderStatus } from "../domain/order-status.js";
import { MenuItemModel } from "../models/menu-item.js";
import { OrderModel } from "../models/order.js";
function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}
function publicOrder(order: unknown): Record<string, unknown> {
  const candidate = order as { toObject?: () => unknown } | null;
  const raw = typeof candidate?.toObject === "function" ? candidate.toObject() : order;
  const value: Record<string, unknown> = raw && typeof raw === "object"
    ? { ...(raw as Record<string, unknown>) }
    : {};
  value.status = normalizeLegacyStatus(String(value.status ?? "pending"));
  // Compatibility for orders created before human-readable numbers were added.
  if (typeof value.orderNumber !== "string" || !value.orderNumber) {
    value.orderNumber = `LEGACY-${String(value._id ?? "UNKNOWN").slice(-8).toUpperCase()}`;
  }
  return value;
}

function generateOrderNumber(): string {
  const day = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `RPOS-${day}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

// GET /api/orders
export const getOrders: RequestHandler = async (_req, res, next) => {
  try {
    const orders = await OrderModel.find().sort({ createdAt: -1 });
    const data = orders.map(publicOrder);
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

// GET /api/orders/:id
export const getOrderById: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid order ID" });
      return;
    }
    const order = await OrderModel.findById(id);
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }
    res.status(200).json({ success: true, data: publicOrder(order) });
  } catch (error) {
    next(error);
  }
};

// GET /api/orders/:id/invoice
export const getOrderInvoice: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid order ID" });
      return;
    }
    const order = await OrderModel.findById(id);
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }
    const itemSubtotal = order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const invoice = {
      invoiceNumber: `INV-${order.orderNumber || order._id.toString().toUpperCase()}`,
      invoiceDate: order.createdAt,
      orderId: order._id.toString(),
      orderNumber: publicOrder(order).orderNumber,
      orderType: order.orderType ?? "takeaway",
      customerName: order.customerName,
      tableNumber: order.tableNumber,
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: Math.round(item.quantity * item.unitPrice * 100) / 100
      })),
      subtotal: order.subtotal > 0 || itemSubtotal === 0 ? order.subtotal : itemSubtotal,
      discountPercent: order.discountPercent ?? 0,
      discountAmount: order.discountAmount ?? 0,
      taxRate: order.taxRate ?? 0,
      taxAmount: order.taxAmount ?? 0,
      totalAmount: order.totalAmount,
      orderStatus: normalizeLegacyStatus(order.status),
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod ?? null
    };
    res.status(200).json({ success: true, message: "Invoice generated successfully", data: invoice });
  } catch (error) {
    next(error);
  }
};

// POST /api/orders. Prices and totals always come from MongoDB/server config.
export const createOrder: RequestHandler = async (req, res, next) => {
  try {
    const { customerName, tableNumber, orderType = "takeaway", items, discountPercent = 0 } = req.body ?? {};

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: "An order must contain at least one item." });
      return;
    }
    if (typeof discountPercent !== "number" || !Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > env.MAX_DISCOUNT_PERCENT) {
      res.status(400).json({ success: false, message: `Discount must be between 0 and ${env.MAX_DISCOUNT_PERCENT} percent.` });
      return;
    }
    if (!(["dine-in", "takeaway"] as const).includes(orderType)) {
      res.status(400).json({ success: false, message: "orderType must be dine-in or takeaway." });
      return;
    }
    if ((customerName !== undefined && (typeof customerName !== "string" || customerName.length > 100)) ||
        (tableNumber !== undefined && (typeof tableNumber !== "string" || tableNumber.length > 20))) {
      res.status(400).json({ success: false, message: "Customer name or table number is invalid." });
      return;
    }

    // Merge duplicate menu IDs so adding the same item twice cannot bypass quantity caps.
    const quantities = new Map<string, number>();
    for (const item of items) {
      if (!item || typeof item.menuItem !== "string" || !isValidObjectId(item.menuItem) ||
          !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100) {
        res.status(400).json({ success: false, message: "Each item needs a valid menuItem ID and quantity from 1 to 100." });
        return;
      }
      const totalQuantity = (quantities.get(item.menuItem) ?? 0) + item.quantity;
      if (totalQuantity > 100) {
        res.status(400).json({ success: false, message: "A menu item quantity cannot exceed 100 per order." });
        return;
      }
      quantities.set(item.menuItem, totalQuantity);
    }

    const menuItems = await MenuItemModel.find({ _id: { $in: [...quantities.keys()] } });
    const menuById = new Map(menuItems.map((item) => [item._id.toString(), item]));
    const orderItems = [];
    for (const [menuItemId, quantity] of quantities) {
      const menuItem = menuById.get(menuItemId);
      if (!menuItem) {
        res.status(400).json({ success: false, message: `Menu item not found: ${menuItemId}` });
        return;
      }
      if (!menuItem.isAvailable) {
        res.status(400).json({ success: false, message: `${menuItem.name} is currently unavailable.` });
        return;
      }
      orderItems.push({ menuItem: menuItem._id, name: menuItem.name, quantity, unitPrice: menuItem.price });
    }

    const bill = calculateBill(orderItems, discountPercent, env.BILLING_TAX_RATE);
    const order = await OrderModel.create({
      orderNumber: generateOrderNumber(),
      orderType,
      customerName: customerName?.trim() || "Walk-in Customer",
      tableNumber: orderType === "dine-in" ? (tableNumber?.trim() || "") : "",
      items: orderItems,
      ...bill
    });
    res.status(201).json({ success: true, message: "Order created successfully", data: publicOrder(order) });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/orders/:id/status
export const updateOrderStatus: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params.id;
    const status = req.body?.status;
    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid order ID" });
      return;
    }
    if (typeof status !== "string" || !isOrderStatus(status)) {
  res.status(400).json({
    success: false,
    message: "Invalid order status"
  });
  return;
}
    const order = await OrderModel.findById(id);
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }
    if (!canTransitionOrderStatus(order.status, status)) {
      res.status(409).json({ success: false, message: `Cannot change order status from ${normalizeLegacyStatus(order.status)} to ${status}.` });
      return;
    }
    order.status = status;
    await order.save();
    res.status(200).json({ success: true, message: "Order status updated successfully", data: publicOrder(order) });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/orders/:id/payment - authenticated Admin and Staff may record payment.
export const updatePaymentStatus: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { paymentStatus, paymentMethod } = req.body ?? {};
    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid order ID" });
      return;
    }
    if (paymentStatus !== "paid" || !["cash", "upi"].includes(paymentMethod)) {
      res.status(400).json({ success: false, message: 'Provide paymentStatus "paid" and paymentMethod "cash" or "upi".' });
      return;
    }
    const order = await OrderModel.findById(id);
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }
    if (order.status === "cancelled") {
      res.status(400).json({ success: false, message: "Cannot mark a cancelled order as paid" });
      return;
    }
    if (order.paymentStatus !== "unpaid") {
      res.status(409).json({ success: false, message: "Only unpaid orders can be marked as paid." });
      return;
    }
    order.paymentStatus = "paid";
    order.paymentMethod = paymentMethod;
    order.paidAt = new Date();
    await order.save();
    res.status(200).json({ success: true, message: "Payment recorded successfully", data: publicOrder(order) });
  } catch (error) {
    next(error);
  }
};
