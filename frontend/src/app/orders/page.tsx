"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type SessionUser = { id: string; name: string; email: string; role: "admin" | "staff" };
type Order = {
  _id: string;
  orderNumber?: string;
  customerName?: string;
  tableNumber?: string;
  orderType?: string;
  items: { name: string; quantity: number }[];
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
};
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const statuses = ["pending", "preparing", "ready", "completed", "cancelled"];
const money = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);

export default function OrdersPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<Record<string, string>>({});
  const [paymentMethods, setPaymentMethods] = useState<Record<string, "cash" | "upi">>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadOrders = useCallback(async () => {
    try {
      const [sessionResponse, ordersResponse] = await Promise.all([
        fetch(`${API_URL}/api/auth/me`, { credentials: "include" }),
        fetch(`${API_URL}/api/orders`, { credentials: "include" })
      ]);
      const sessionResult = await sessionResponse.json();
      const ordersResult = await ordersResponse.json();
      if (!sessionResponse.ok || !sessionResult.success) throw new Error(sessionResult.message || "Authentication token required. Please sign in.");
      if (!ordersResponse.ok || !ordersResult.success) throw new Error(ordersResult.message || "Unable to load orders.");
      setUser(sessionResult.data.user as SessionUser);
      const data = (ordersResult.data as Order[]).map((order) => ({ ...order, status: order.status === "served" ? "completed" : order.status }));
      setOrders(data);
      setSelectedStatuses((previous) => {
        const next = { ...previous };
        for (const order of data) next[order._id] = order.status;
        return next;
      });
      setPaymentMethods((previous) => {
        const next = { ...previous };
        for (const order of data) next[order._id] ??= "cash";
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load orders.");
    } finally { setLoading(false); }
  }, []);

 useEffect(() => {
  let cancelled = false;

  async function fetchInitialOrders() {
    try {
      const [sessionResponse, ordersResponse] = await Promise.all([
        fetch(`${API_URL}/api/auth/me`, {
          credentials: "include",
        }),
        fetch(`${API_URL}/api/orders`, {
          credentials: "include",
        }),
      ]);

      const [sessionResult, ordersResult] = await Promise.all([
        sessionResponse.json(),
        ordersResponse.json(),
      ]);

      if (!sessionResponse.ok || !sessionResult.success) {
        throw new Error(
          sessionResult.message ||
            "Authentication token required. Please sign in."
        );
      }

      if (!ordersResponse.ok || !ordersResult.success) {
        throw new Error(
          ordersResult.message || "Unable to load orders."
        );
      }

      if (cancelled) return;

      setUser(sessionResult.data.user as SessionUser);

      const data = (ordersResult.data as Order[]).map((order) => ({
        ...order,
        status:
          order.status === "served" ? "completed" : order.status,
      }));

      setOrders(data);

      setSelectedStatuses((previous) => {
        const next = { ...previous };

        for (const order of data) {
          next[order._id] = order.status;
        }

        return next;
      });

      setPaymentMethods((previous) => {
        const next = { ...previous };

        for (const order of data) {
          next[order._id] ??= "cash";
        }

        return next;
      });

      setError("");
    } catch (err) {
      if (!cancelled) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load orders."
        );
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }

  void fetchInitialOrders();

  return () => {
    cancelled = true;
  };
}, []);

  async function updateStatus(order: Order) {
    const status = selectedStatuses[order._id] ?? order.status;
    if (status === order.status) { setMessage("Choose a different status first."); return; }
    try {
      setSavingId(order._id); setError(""); setMessage("");
      const response = await fetch(`${API_URL}/api/orders/${order._id}/status`, {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to update order.");
      setMessage("Order status updated successfully."); await loadOrders();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to update order."); }
    finally { setSavingId(null); }
  }

  async function recordPayment(order: Order) {
    try {
      setPayingId(order._id); setError(""); setMessage("");
      const response = await fetch(`${API_URL}/api/orders/${order._id}/payment`, {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: "paid", paymentMethod: paymentMethods[order._id] ?? "cash" })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to record payment.");
      setMessage(`Payment recorded for ${order.orderNumber || "order"}.`); await loadOrders();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to record payment."); }
    finally { setPayingId(null); }
  }

  return <main className="min-h-screen bg-slate-50 p-5 text-slate-800 md:p-8"><div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><Link href="/" className="text-sm text-orange-600 hover:underline">← Back to Dashboard</Link><h1 className="mt-3 text-3xl font-bold">Order Management</h1><p className="mt-2 text-sm text-slate-500">Move orders through the workflow and record payments.</p></div><Link href="/new-order" className="rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white hover:bg-orange-600">＋ Create order</Link></header>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}{/token|required|not authenticated|session/i.test(error) && <p className="mt-2"><Link href="/login" className="font-semibold underline">Open login page</Link></p>}</div>}
    {message && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-700">{message}</p>}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><div className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">Total Orders</p><p className="mt-2 text-3xl font-bold">{orders.length}</p></div><div className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">Pending Orders</p><p className="mt-2 text-3xl font-bold">{orders.filter((o) => o.status === "pending").length}</p></div><div className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">Completed Orders</p><p className="mt-2 text-3xl font-bold">{orders.filter((o) => o.status === "completed").length}</p></div></div>
    <section className="overflow-x-auto rounded-2xl border bg-white"><div className="border-b p-5"><h2 className="text-xl font-bold">All Orders</h2><p className="mt-1 text-sm text-slate-500">Signed in as {user ? `${user.name} (${user.role})` : "checking session..."}.</p></div>
      {loading ? <p className="p-6">Loading orders...</p> : orders.length === 0 ? <p className="p-6 text-slate-500">No orders found.</p> : <table className="w-full min-w-[1000px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Order</th><th className="p-4">Customer / Type</th><th className="p-4">Items</th><th className="p-4">Total</th><th className="p-4">Payment</th><th className="p-4">Status</th><th className="p-4">Actions</th></tr></thead><tbody className="divide-y">{orders.map((order) => <tr key={order._id}><td className="whitespace-nowrap p-4 font-semibold">{order.orderNumber || `#${order._id.slice(-6).toUpperCase()}`}<p className="text-xs font-normal text-slate-500">{order._id.slice(-8)}</p></td><td className="p-4">{order.customerName || "Walk-in Customer"}<p className="text-xs capitalize text-slate-500">{order.orderType || (order.tableNumber ? "dine-in" : "takeaway")}{order.tableNumber ? ` · Table ${order.tableNumber}` : ""}</p></td><td className="p-4">{order.items.reduce((sum, item) => sum + item.quantity, 0)} item(s)<p className="text-xs text-slate-500">{order.items.map((item) => `${item.name} ×${item.quantity}`).join(", ")}</p></td><td className="whitespace-nowrap p-4 font-semibold">{money(order.totalAmount)}</td><td className="p-4 capitalize">{order.paymentStatus}{order.paymentMethod ? <p className="text-xs text-slate-500">{order.paymentMethod}</p> : null}</td><td className="p-4"><select aria-label={`Status for ${order.orderNumber || order._id}`} value={selectedStatuses[order._id] ?? order.status} onChange={(event) => setSelectedStatuses((previous) => ({ ...previous, [order._id]: event.target.value }))} className="rounded-lg border bg-white px-3 py-2">{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select><button type="button" onClick={() => void updateStatus(order)} disabled={savingId === order._id || (selectedStatuses[order._id] ?? order.status) === order.status} className="mt-2 block rounded-lg bg-orange-500 px-3 py-2 font-semibold text-white disabled:opacity-40">{savingId === order._id ? "Saving..." : "Update status"}</button></td><td className="p-4">{user !== null && order.paymentStatus !== "paid" && order.status !== "cancelled" ? <><select aria-label={`Payment method for ${order.orderNumber || order._id}`} value={paymentMethods[order._id] ?? "cash"} onChange={(event) => setPaymentMethods((previous) => ({ ...previous, [order._id]: event.target.value as "cash" | "upi" }))} className="w-full rounded-lg border bg-white px-3 py-2"><option value="cash">Cash</option><option value="upi">UPI</option></select><button type="button" onClick={() => void recordPayment(order)} disabled={payingId === order._id} className="mt-2 rounded-lg border border-emerald-600 px-3 py-2 font-semibold text-emerald-700 disabled:opacity-40">{payingId === order._id ? "Saving..." : "Mark paid"}</button></> : <span className="text-xs text-slate-500">{order.paymentStatus === "paid" ? "Recorded" : "Unavailable"}</span>}<Link href={`${API_URL}/api/orders/${order._id}/invoice`} target="_blank" className="mt-2 block text-xs font-semibold text-orange-600 hover:underline">Invoice API</Link></td></tr>)}</tbody></table>}
    </section>
    <p className="text-xs text-slate-500">Status changes follow the allowed workflow: Pending → Preparing → Ready → Completed. An order can be cancelled before completion. Only authenticated users can record Cash/UPI payments; daily reports remain Admin-only.</p>
  </div></main>;
}
