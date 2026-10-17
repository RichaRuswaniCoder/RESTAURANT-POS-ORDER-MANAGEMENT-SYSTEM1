import type { RequestHandler } from "express";
import { OrderModel } from "../models/order.js";
import { normalizeLegacyStatus } from "../domain/order-status.js";

// GET /api/reports/daily-sales?date=YYYY-MM-DD (UTC calendar day)
export const getDailySales: RequestHandler = async (req, res, next) => {
  try {
    const date = typeof req.query.date === "string"
      ? req.query.date
      : new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ success: false, message: "date must use YYYY-MM-DD format" });
      return;
    }
    const start = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime()) || start.toISOString().slice(0, 10) !== date) {
      res.status(400).json({ success: false, message: "Invalid calendar date" });
      return;
    }
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const [orders, paidOrders] = await Promise.all([
      OrderModel.find({ createdAt: { $gte: start, $lt: end } }).select(
        "orderNumber totalAmount paymentStatus paymentMethod status createdAt"
      ),
      OrderModel.find({ paymentStatus: "paid", paidAt: { $gte: start, $lt: end } }).select(
        "orderNumber totalAmount paymentStatus paymentMethod status createdAt paidAt"
      )
    ]);
    const completedOrders = orders.filter((order) => ["completed", "served"].includes(normalizeLegacyStatus(order.status)));
    const salesByMethod = {
      cash: paidOrders.filter((order) => order.paymentMethod === "cash").reduce((sum, order) => sum + order.totalAmount, 0),
      upi: paidOrders.filter((order) => order.paymentMethod === "upi").reduce((sum, order) => sum + order.totalAmount, 0)
    };
    const paidSales = Math.round(paidOrders.reduce((sum, order) => sum + order.totalAmount, 0) * 100) / 100;

    res.status(200).json({
      success: true,
      data: {
        date,
        totalOrders: orders.length,
        completedOrders: completedOrders.length,
        pendingOrders: orders.filter((order) => order.status === "pending").length,
        paidOrders: paidOrders.length,
        unpaidOrders: orders.filter((order) => order.paymentStatus === "unpaid").length,
        paidSales,
        salesByMethod,
        recentOrders: orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 10).map((order) => ({
          orderNumber: order.orderNumber || `LEGACY-${String(order._id).slice(-8).toUpperCase()}`,
          totalAmount: order.totalAmount,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod ?? null,
          status: normalizeLegacyStatus(order.status),
          createdAt: order.createdAt
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};
