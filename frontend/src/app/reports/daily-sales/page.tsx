"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface RecentOrder {
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  totalAmount: number;
}

interface SalesReport {
  date: string;
  totalOrders: number;
  completedOrders: number;
  paidOrders: number;
  paidSales: number;
  unpaidOrders: number;
  pendingOrders: number;
  salesByMethod: {
    cash: number;
    upi: number;
  };
  recentOrders: RecentOrder[];
}

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

function asRecord(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === "object") {
    return value as Record<string, unknown>;
  }

  return {};
}

function toNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function money(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTime(value: string): string {
  if (!value) return "—";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleTimeString();
}

function normalizeReport(
  payload: unknown,
  selectedDate: string,
): SalesReport {
  let data = asRecord(payload);

  // Handle API responses wrapped inside data or report.
  for (let index = 0; index < 3; index += 1) {
    if (data.data !== null && typeof data.data === "object") {
      data = asRecord(data.data);
      continue;
    }

    if (data.report !== null && typeof data.report === "object") {
      data = asRecord(data.report);
      continue;
    }

    break;
  }

  const paymentData = asRecord(data.salesByMethod);

  const rawOrders = Array.isArray(data.recentOrders)
    ? data.recentOrders
    : Array.isArray(data.orders)
      ? data.orders
      : [];

  const recentOrders: RecentOrder[] = rawOrders.map((item) => {
    const order = asRecord(item);

    return {
      orderNumber: String(order.orderNumber ?? order._id ?? "—"),
      createdAt: String(order.createdAt ?? ""),
      status: String(order.status ?? "unknown"),
      paymentStatus: String(order.paymentStatus ?? "unknown"),
      paymentMethod: order.paymentMethod
        ? String(order.paymentMethod)
        : null,
      totalAmount: toNumber(order.totalAmount),
    };
  });

  return {
    date: typeof data.date === "string" ? data.date : selectedDate,
    totalOrders: toNumber(data.totalOrders),
    completedOrders: toNumber(data.completedOrders),
    paidOrders: toNumber(data.paidOrders),
    paidSales: toNumber(data.paidSales),
    unpaidOrders: toNumber(data.unpaidOrders),
    pendingOrders: toNumber(data.pendingOrders),
    salesByMethod: {
      cash: toNumber(paymentData.cash),
      upi: toNumber(paymentData.upi),
    },
    recentOrders,
     };
}

async function fetchDailySalesReport(
  date: string,
): Promise<SalesReport> {
  const response = await fetch(
    `${API_URL}/api/reports/daily-sales?date=${encodeURIComponent(date)}`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  const payload: unknown = await response.json().catch(() => ({}));
  const body = asRecord(payload);

  if (!response.ok || body.success === false) {
    if (response.status === 401) {
      throw new Error("Not authenticated. Please sign in again.");
    }

    if (response.status === 403) {
      throw new Error(
        "Admin access required. Sign in with an Admin account.",
      );
    }

    throw new Error(
      typeof body.message === "string"
        ? body.message
        : typeof body.error === "string"
          ? body.error
          : `Unable to load report (HTTP ${response.status}).`,
    );
  }

  return normalizeReport(payload, date);
}

export default function DailySalesPage() {
  // Initialize the selected date after the component mounts.
  const [date, setDate] = useState("");
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDate(new Date().toISOString().slice(0, 10));
  }, []);

  // Load the report when the selected date changes.
  useEffect(() => {
    if (!date) return;

    let cancelled = false;

    fetchDailySalesReport(date)
      .then((nextReport) => {
        if (!cancelled) {
          setReport(nextReport);
          setError("");
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setReport(null);
          setError(
            caught instanceof Error
              ? caught.message
              : "Something went wrong while loading the report.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [date]);

  function handleDateChange(value: string) {
    setLoading(true);
    setError("");
    setDate(value);
  }

  const cards = report
    ? [
        {
          title: "Total Orders",
          value: String(report.totalOrders),
        },
        {
          title: "Completed",
          value: String(report.completedOrders),
        },
        {
          title: "Paid Orders",
          value: String(report.paidOrders),
        },
        {
          title: "Paid Sales",
          value: money(report.paidSales),
        },
      ]
    : [];

  const needsSignIn =
    /not authenticated|authentication token|required|invalid or expired/i.test(
      error,
    );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link
              href="/"
              className="text-sm text-orange-600 hover:underline"
            >
              ← Back to Dashboard
            </Link>

            <h1 className="mt-3 text-3xl font-bold">
              Daily Sales Report
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Daily order counts and payments recorded on the selected UTC date.
            </p>
          </div>

          <div>
            <label
              htmlFor="reportDate"
              className="mb-2 block text-sm font-medium"
            >
              Report date (UTC)
            </label>

            <input
              id="reportDate"
              type="date"
              value={date}
              onChange={(event) =>
                handleDateChange(event.target.value)
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2"
            />
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
          >
            <p>{error}</p>

            {needsSignIn && (
              <Link
                href="/login"
                className="mt-2 inline-block font-semibold underline"
              >
                Sign in
              </Link>
            )}
          </div>
        )}

        {loading ? (
          <p className="rounded-xl bg-white p-6">
            Loading report...
          </p>
        ) : report ? (
          <>
            {/* Summary cards */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-sm text-slate-500">
                    {card.title}
                  </p>

                  <p className="mt-3 text-3xl font-bold">
                    {card.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Payment breakdown and order status */}
            <div className="grid gap-4 sm:grid-cols-2">
              <section className="rounded-2xl border bg-white p-6">
                <h2 className="text-lg font-bold">
                  Payment Breakdown
                </h2>

                <div className="mt-4 flex justify-between border-b py-3">
                  <span className="text-slate-600">Cash</span>
                  <strong>{money(report.salesByMethod.cash)}</strong>
                </div>

                <div className="flex justify-between border-b py-3">
                  <span className="text-slate-600">UPI</span>
                  <strong>{money(report.salesByMethod.upi)}</strong>
                </div>

                <div className="flex justify-between py-3">
                  <span className="text-slate-600">Unpaid Orders</span>
                  <strong>{report.unpaidOrders}</strong>
                </div>
              </section>

              <section className="rounded-2xl border bg-white p-6">
                <h2 className="text-lg font-bold">
                  Order Status
                </h2>

                <div className="mt-4 flex justify-between border-b py-3">
                  <span className="text-slate-600">Pending</span>
                  <strong>{report.pendingOrders}</strong>
                </div>

                <div className="flex justify-between border-b py-3">
                  <span className="text-slate-600">Completed</span>
                  <strong>{report.completedOrders}</strong>
                </div>

                <div className="flex justify-between py-3">
                  <span className="text-slate-600">Paid Sales</span>
                  <strong>{money(report.paidSales)}</strong>
                </div>
              </section>
            </div>

            {/* Recent orders */}
            <section className="overflow-x-auto rounded-2xl border bg-white">
              <div className="border-b p-5">
                <h2 className="text-lg font-bold">
                  Recent Orders for {report.date}
                </h2>
              </div>

              {report.recentOrders.length === 0 ? (
                <p className="p-6 text-slate-500">
                  No orders were created on this date.
                </p>
              ) : (
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="p-4">Order Number</th>
                      <th className="p-4">Created</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Payment</th>
                      <th className="p-4">Total</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {report.recentOrders.map((order, index) => (
                      <tr
                        key={`${order.orderNumber}-${order.createdAt}-${index}`}
                      >
                        <td className="p-4 font-semibold">
                          {order.orderNumber}
                        </td>

                        <td className="p-4">
                          {formatTime(order.createdAt)}
                        </td>

                        <td className="p-4 capitalize">
                          {order.status}
                        </td>

                        <td className="p-4 capitalize">
                          {order.paymentStatus}
                          {order.paymentMethod
                            ? ` (${order.paymentMethod})`
                            : ""}
                        </td>

                        <td className="p-4 font-semibold">
                          {money(order.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        ) : (
          !error && (
            <p className="rounded-xl bg-white p-6 text-slate-500">
              No report data is available.
            </p>
          )
        )}

        <p className="text-xs text-slate-500">
          This report uses the UTC calendar day. Paid sales include
          orders with a recorded payment; unpaid orders are not
          counted as sales.
        </p>
      </div>
    </main>
  );
}