"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";

type MenuItem = { _id: string; name: string; description?: string; category: string; price: number; isAvailable: boolean };
type CreatedOrder = { _id: string; orderNumber: string; subtotal: number; discountAmount: number; taxRate: number; taxAmount: number; totalAmount: number; orderType: string; status: string; paymentStatus: string };
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const TAX_RATE = Number(process.env.NEXT_PUBLIC_BILLING_TAX_RATE ?? 0);
const MAX_DISCOUNT = Number(process.env.NEXT_PUBLIC_MAX_DISCOUNT_PERCENT ?? 10);
const money = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);

export default function NewOrderPage() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [customerName, setCustomerName] = useState("");
  const [orderType, setOrderType] = useState<"dine-in" | "takeaway">("dine-in");
  const [tableNumber, setTableNumber] = useState("1");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadMenu() {
      try {
        const response = await fetch(`${API_URL}/api/menu`, { credentials: "include" });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Unable to load menu. Sign in first.");
        if (!ignore) setMenu(result.data as MenuItem[]);
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : "Unable to load menu.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void loadMenu();
    return () => { ignore = true; };
  }, []);

  const categories = useMemo(() => ["all", ...Array.from(new Set(menu.map((item) => item.category))).sort()], [menu]);
  const visibleMenu = useMemo(() => menu.filter((item) => item.isAvailable && (category === "all" || item.category === category) && `${item.name} ${item.category} ${item.description ?? ""}`.toLowerCase().includes(query.toLowerCase())), [menu, category, query]);
  const selectedItems = menu.flatMap((item) => {
    const quantity = quantities[item._id] ?? 0;
    return quantity > 0 ? [{ ...item, quantity }] : [];
  });
  const subtotal = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const rawDiscount = Number(discountPercent);
  const discount = Number.isFinite(rawDiscount) ? Math.min(MAX_DISCOUNT, Math.max(0, rawDiscount)) : 0;
  const discountAmount = Math.round(subtotal * discount) / 100;
  const estimatedTax = Math.round((subtotal - discountAmount) * TAX_RATE) / 100;
  const estimatedTotal = Math.round((subtotal - discountAmount + estimatedTax) * 100) / 100;

  function setQuantity(id: string, quantity: number) {
    setCreatedOrder(null);
    setQuantities((previous) => {
      const next = { ...previous };
      if (quantity <= 0) delete next[id]; else next[id] = Math.min(100, quantity);
      return next;
    });
  }

  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedItems.length === 0) { setError("Add at least one available menu item."); return; }
    if (orderType === "dine-in" && !tableNumber.trim()) { setError("Enter a table number for dine-in orders."); return; }
    const discountValue = Number(discountPercent);
    if (!Number.isFinite(discountValue) || discountValue < 0 || discountValue > MAX_DISCOUNT) {
      setError(`Discount must be between 0 and ${MAX_DISCOUNT}%.`); return;
    }
    try {
      setSaving(true); setError(""); setMessage(""); setCreatedOrder(null);
      const response = await fetch(`${API_URL}/api/orders`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(), orderType,
          tableNumber: orderType === "dine-in" ? tableNumber.trim() : "",
          discountPercent: discountValue,
          items: selectedItems.map((item) => ({ menuItem: item._id, quantity: item.quantity }))
        })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not create order.");
      const order = result.data as CreatedOrder;
      order.orderNumber ||= `LEGACY-${order._id.slice(-8).toUpperCase()}`;
      setCreatedOrder(order);
      setMessage("Order created. The bill below uses amounts calculated by the server.");
      setQuantities({});
      setCustomerName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create order.");
    } finally {
      setSaving(false);
    }
  }

  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 md:px-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><Link href="/" className="text-sm text-orange-600 hover:underline">← Back to Dashboard</Link><h1 className="mt-3 text-3xl font-bold">Create Order & Bill</h1><p className="mt-2 text-sm text-slate-500">Add menu items, set quantities, and create a server-calculated bill.</p></div>
        <Link href="/orders" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">View orders</Link>
      </header>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}{/token|required|not authenticated|session/i.test(error) && <Link href="/login" className="ml-2 font-semibold underline">Sign in</Link>}</div>}
      {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">{message}</p>}
      {createdOrder && <section className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-emerald-700">Order created successfully</p><h2 className="mt-1 text-2xl font-bold">{createdOrder.orderNumber}</h2></div><span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-semibold capitalize text-orange-700">{createdOrder.status}</span></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><div><p className="text-sm text-slate-500">Subtotal</p><p className="mt-1 font-semibold">{money(createdOrder.subtotal)}</p></div><div><p className="text-sm text-slate-500">Discount</p><p className="mt-1 font-semibold">−{money(createdOrder.discountAmount)}</p></div><div><p className="text-sm text-slate-500">Tax ({createdOrder.taxRate}%)</p><p className="mt-1 font-semibold">{money(createdOrder.taxAmount)}</p></div><div><p className="text-sm text-slate-500">Payment</p><p className="mt-1 font-semibold capitalize">{createdOrder.paymentStatus}</p></div><div><p className="text-sm text-slate-500">Final total</p><p className="mt-1 text-xl font-bold">{money(createdOrder.totalAmount)}</p></div></div><p className="mt-4 text-sm text-slate-500">An authenticated Admin or Staff user can record payment from Order Management.</p><Link href="/orders" className="mt-4 inline-flex rounded-xl bg-orange-500 px-4 py-2 font-semibold text-white hover:bg-orange-600">Open Order Management</Link></section>}

      <form onSubmit={createOrder} className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Available Menu</h2><span className="text-sm text-slate-500">{selectedItems.reduce((sum, item) => sum + item.quantity, 0)} item(s) selected</span></div>
          <div className="grid gap-3 sm:grid-cols-[1fr_200px]"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search menu or category..." className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-orange-500"/><select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-4 py-3">{categories.map((value) => <option key={value} value={value}>{value === "all" ? "All categories" : value}</option>)}</select></div>
          {loading ? <p className="p-6 text-slate-500">Loading menu...</p> : visibleMenu.length === 0 ? <p className="rounded-xl bg-slate-50 p-6 text-slate-500">No available menu items match this search.</p> : <div className="grid gap-3 md:grid-cols-2">{visibleMenu.map((item) => <div key={item._id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"><div className="min-w-0"><p className="font-semibold">{item.name}</p><p className="mt-1 text-xs text-slate-500">{item.category}</p>{item.description && <p className="mt-2 text-sm text-slate-500">{item.description}</p>}<p className="mt-2 font-bold text-orange-600">{money(item.price)}</p></div><div className="flex shrink-0 items-center gap-2"><button type="button" aria-label={`Decrease ${item.name}`} onClick={() => setQuantity(item._id, (quantities[item._id] ?? 0) - 1)} className="h-9 w-9 rounded-lg border border-slate-300 font-bold">−</button><span className="w-5 text-center font-semibold">{quantities[item._id] ?? 0}</span><button type="button" aria-label={`Increase ${item.name}`} onClick={() => setQuantity(item._id, (quantities[item._id] ?? 0) + 1)} className="h-9 w-9 rounded-lg bg-orange-500 font-bold text-white">＋</button></div></div>)}</div>}
        </section>

        <aside className="h-fit space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-xl font-bold">Order Details</h2>
          <div><label htmlFor="orderType" className="mb-2 block text-sm font-medium">Order type</label><select id="orderType" value={orderType} onChange={(event) => setOrderType(event.target.value as "dine-in" | "takeaway")} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"><option value="dine-in">Dine-in</option><option value="takeaway">Takeaway</option></select></div>
          <div><label htmlFor="customerName" className="mb-2 block text-sm font-medium">Customer name (optional)</label><input id="customerName" maxLength={100} value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Walk-in Customer" className="w-full rounded-xl border border-slate-300 px-4 py-3"/></div>
          {orderType === "dine-in" && <div><label htmlFor="tableNumber" className="mb-2 block text-sm font-medium">Table number *</label><input id="tableNumber" required maxLength={20} value={tableNumber} onChange={(event) => setTableNumber(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3"/></div>}
          <div><label htmlFor="discountPercent" className="mb-2 block text-sm font-medium">Discount (%) — max {MAX_DISCOUNT}%</label><input id="discountPercent" type="number" min="0" max={MAX_DISCOUNT} step="0.01" value={discountPercent} onChange={(event) => setDiscountPercent(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3"/></div>
          <div className="space-y-3 border-t border-slate-100 pt-4 text-sm"><div className="flex justify-between"><span className="text-slate-500">Items subtotal</span><span className="font-semibold">{money(subtotal)}</span></div><div className="flex justify-between"><span className="text-slate-500">Discount estimate</span><span className="font-semibold">−{money(discountAmount)}</span></div><div className="flex justify-between"><span className="text-slate-500">Tax estimate ({TAX_RATE}%)</span><span className="font-semibold">{money(estimatedTax)}</span></div><div className="flex justify-between border-t pt-3 text-base"><span className="font-bold">Estimated total</span><span className="font-bold">{money(estimatedTotal)}</span></div><p className="text-xs text-slate-500">Estimate updates as quantities change. Backend pricing and configured tax are authoritative when the order is saved.</p></div>
          <button type="submit" disabled={saving || loading || selectedItems.length === 0} className="w-full rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Creating order..." : "Create Order & Calculate Final Bill"}</button>
        </aside>
      </form>
    </div>
  </main>;
}
