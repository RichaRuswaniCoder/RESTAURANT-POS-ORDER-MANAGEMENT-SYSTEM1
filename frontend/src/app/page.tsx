"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SessionUser = { id: string; name: string; email: string; role: "admin" | "staff" };
type MenuItem = { _id: string; name: string; category: string; price: number; isAvailable: boolean };
type Order = {
  _id: string;
  orderNumber?: string;
  customerName?: string;
  tableNumber?: string;
  orderType?: "dine-in" | "takeaway";
  items: { name: string; quantity: number }[];
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const money = (amount: number) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 2
}).format(amount);

export default function Home() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [dailySales, setDailySales] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function loadDashboard() {
      try {
        const sessionResponse = await fetch(`${API_URL}/api/auth/me`, { credentials: "include" });
        if (sessionResponse.status === 401) {
          if (!ignore) {
            setUser(null);
            setError("");
          }
          return;
        }
        if (!sessionResponse.ok) throw new Error("Could not verify session. Check that the backend is running and CORS is configured.");
        const sessionResult = await sessionResponse.json();
        const sessionUser = sessionResult?.data?.user as SessionUser | undefined;
        if (!sessionResult.success || !sessionUser) throw new Error("Unable to verify login session.");
        if (!ignore) setUser(sessionUser);

        const [menuResponse, ordersResponse] = await Promise.all([
          fetch(`${API_URL}/api/menu`, { credentials: "include" }),
          fetch(`${API_URL}/api/orders`, { credentials: "include" })
        ]);
        const [menuResult, ordersResult] = await Promise.all([menuResponse.json(), ordersResponse.json()]);
        if (!menuResponse.ok || !menuResult.success) throw new Error(menuResult.message || "Could not load menu items.");
        if (!ordersResponse.ok || !ordersResult.success) throw new Error(ordersResult.message || "Could not load orders.");
        if (!ignore) {
          setMenuItems(menuResult.data);
          setOrders(ordersResult.data);
        }
        if (sessionUser.role === "admin") {
          const date = new Date().toISOString().slice(0, 10);
          const reportResponse = await fetch(`${API_URL}/api/reports/daily-sales?date=${date}`, { credentials: "include" });
          if (reportResponse.ok) {
            const reportResult = await reportResponse.json();
            if (!ignore && reportResult.success) setDailySales(reportResult.data.paidSales);
          }
        }
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : "Unable to load dashboard data.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void loadDashboard();
    return () => { ignore = true; };
  }, []);

  async function signOut() {
    try {
      setSigningOut(true);
      const response = await fetch(`${API_URL}/api/auth/logout`, { method: "POST", credentials: "include" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not sign out.");
      setUser(null);
      setOrders([]);
      setMenuItems([]);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign out.");
    } finally {
      setSigningOut(false);
    }
  }

  const paidSales = orders.filter((order) => order.paymentStatus === "paid").reduce((sum, order) => sum + order.totalAmount, 0);
  const stats = [
    { label: "Paid Sales", value: money(paidSales), note: "From loaded orders", icon: "₹" },
    ...(user?.role === "admin" ? [{ label: "Daily Sales", value: dailySales === null ? "—" : money(dailySales), note: "Paid orders today (UTC)", icon: "▣" }] : []),
    { label: "Total Orders", value: String(orders.length), note: "Orders in the database", icon: "↗" },
    { label: "Completed Orders", value: String(orders.filter((order) => order.status === "completed").length), note: "Finished workflow", icon: "✓" },
    { label: "Available Menu Items", value: String(menuItems.filter((item) => item.isAvailable).length), note: `${menuItems.length} total menu items`, icon: "☰" },
    { label: "Pending Orders", value: String(orders.filter((order) => order.status === "pending").length), note: "Awaiting preparation", icon: "◷" }
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col bg-slate-950 text-white md:flex">
          <div className="border-b border-slate-800 px-6 py-7"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-xl font-bold">R</div><div><h1 className="text-lg font-bold">Restaurant POS</h1><p className="text-xs text-slate-400">Order Management</p></div></div></div>
          <nav className="flex-1 space-y-2 px-4 py-6">
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Main Menu</p>
            <a href="#dashboard" className="flex items-center gap-3 rounded-xl bg-orange-500 px-4 py-3 font-medium">▦ Dashboard</a>
            <Link href="/orders" className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 hover:bg-slate-800">▤ Orders</Link>
            <Link href="/new-order" className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 hover:bg-slate-800">＋ Create Order</Link>
            <Link href="/menu" className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 hover:bg-slate-800">☷ Menu Management</Link>
            {user?.role === "admin" && <Link href="/reports/daily-sales" className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 hover:bg-slate-800">▣ Daily Sales Report</Link>}
          </nav>
          <div className="m-4 rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="font-semibold">{user?.name || "Not signed in"}</p><p className="mt-1 text-xs capitalize text-slate-400">{user?.role || "Guest"} account</p></div>
        </aside>

        <section id="dashboard" className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 md:px-8">
            <div><p className="text-sm text-slate-500">Restaurant / Overview</p><h2 className="mt-1 text-2xl font-bold">Dashboard</h2></div>
            {user ? <div className="flex items-center gap-3"><div className="text-right"><p className="text-sm font-semibold">{user.name}</p><p className="text-xs capitalize text-slate-500">{user.role}</p></div><button type="button" onClick={() => void signOut()} disabled={signingOut} className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-60">{signingOut ? "Signing out..." : "Sign out"}</button></div> : <Link href="/login" className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">Sign in</Link>}
          </header>

          <div className="space-y-8 p-5 md:p-8">
            {!user && !loading ? <section className="rounded-2xl border border-orange-200 bg-white p-8 shadow-sm"><h3 className="text-xl font-bold">Sign in to manage your restaurant</h3><p className="mt-2 max-w-xl text-sm text-slate-600">Your login session could not be found. Sign in to view orders, manage the menu, create bills, and view reports.</p><Link href="/login" className="mt-5 inline-flex rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600">Open sign-in page</Link></section> : null}
            {loading && <p className="rounded-xl bg-white p-5 text-slate-600">Checking session and loading restaurant data...</p>}
            {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700"><p className="font-semibold">Unable to complete request</p><p className="mt-1 text-sm">{error}</p></div>}
            {user && !loading && !error && <>
              <div><h3 className="text-xl font-bold">Welcome back, {user.name.split(" ")[0]}!</h3><p className="mt-1 text-sm text-slate-500">Current data loaded from your backend.</p></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">{stat.label}</p><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-lg font-bold text-orange-600">{stat.icon}</div></div><p className="mt-5 text-3xl font-bold">{stat.value}</p><p className="mt-2 text-xs text-slate-500">{stat.note}</p></div>)}</div>
              <div className="grid gap-6 xl:grid-cols-3">
                <section id="orders" className="overflow-hidden rounded-2xl border border-slate-200 bg-white xl:col-span-2"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h3 className="font-bold">Recent Orders</h3><p className="mt-1 text-sm text-slate-500">Latest orders retrieved from MongoDB</p></div><Link href="/orders" className="text-sm font-semibold text-orange-600 hover:underline">View all</Link></div>{orders.length === 0 ? <p className="p-6 text-sm text-slate-500">No orders found. Create your first order to get started.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-4">Order</th><th className="px-5 py-4">Customer</th><th className="px-5 py-4">Total</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Payment</th></tr></thead><tbody className="divide-y divide-slate-100">{orders.slice(0, 8).map((order) => <tr key={order._id}><td className="px-5 py-4 font-semibold">{order.orderNumber || `#${order._id.slice(-6).toUpperCase()}`}</td><td className="px-5 py-4">{order.customerName || "Walk-in Customer"}</td><td className="whitespace-nowrap px-5 py-4">{money(order.totalAmount)}</td><td className="px-5 py-4 capitalize">{order.status}</td><td className="px-5 py-4 capitalize">{order.paymentStatus}</td></tr>)}</tbody></table></div>}</section>
                <section id="menu" className="rounded-2xl border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h3 className="font-bold">Menu Overview</h3><p className="mt-1 text-sm text-slate-500">Available items</p></div><Link href="/menu" className="text-sm font-semibold text-orange-600 hover:underline">Manage</Link></div>{menuItems.filter((item) => item.isAvailable).slice(0, 6).map((item) => <div key={item._id} className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0"><div><p className="font-medium">{item.name}</p><p className="mt-1 text-xs text-slate-500">{item.category}</p></div><p className="whitespace-nowrap font-semibold">{money(item.price)}</p></div>)}{menuItems.filter((item) => item.isAvailable).length === 0 && <p className="p-5 text-sm text-slate-500">No available items.</p>}</section>
              </div>
              <div className="flex flex-wrap gap-3"><Link href="/new-order" className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600">＋ Create New Order</Link><Link href="/orders" className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50">Manage Orders</Link>{user.role === "admin" && <Link href="/reports/daily-sales" className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50">View Daily Sales</Link>}</div>
            </>}
          </div>
        </section>
      </div>
    </main>
  );
}
