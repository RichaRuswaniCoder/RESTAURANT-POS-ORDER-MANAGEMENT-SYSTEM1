
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

type MenuItem = {
  _id: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
};

type MenuForm = {
  name: string;
  description: string;
  category: string;
  price: string;
  imageUrl: string;
  isAvailable: boolean;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const initialForm: MenuForm = {
  name: "",
  description: "",
  category: "",
  price: "",
  imageUrl: "",
  isAvailable: true
};

const money = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR"
  }).format(amount);

export default function MenuManagementPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [form, setForm] = useState<MenuForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // GET: Load menu items using the HttpOnly cookie.
  const loadMenu = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/menu`, {
        credentials: "include"
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Could not load menu items."
        );
      }

      setItems(result.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load menu items."
      );
    } finally {
      setLoading(false);
    }
  }, []);

 useEffect(() => {
  let cancelled = false;

  async function fetchInitialMenu() {
    try {
      const response = await fetch(`${API_URL}/api/menu`, {
        credentials: "include",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Could not load menu items."
        );
      }

      if (!cancelled) {
        setItems(result.data as MenuItem[]);
        setError("");
      }
    } catch (err) {
      if (!cancelled) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load menu items."
        );
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }

  void fetchInitialMenu();

  return () => {
    cancelled = true;
  };
}, []);
  function startEdit(item: MenuItem) {
    setEditingId(item._id);

    setForm({
      name: item.name,
      description: item.description || "",
      category: item.category,
      price: String(item.price),
      imageUrl: item.imageUrl || "",
      isAvailable: item.isAvailable
    });

    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(initialForm);
    setError("");
    setMessage("");
  }

  // POST: Add an item. PUT: Update an item.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const price = Number(form.price);

    if (!Number.isFinite(price) || price < 0) {
      setError("Enter a valid price greater than or equal to zero.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const response = await fetch(
        editingId
          ? `${API_URL}/api/menu/${editingId}`
          : `${API_URL}/api/menu`,
        {
          method: editingId ? "PUT" : "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: form.name.trim(),
            description: form.description.trim(),
            category: form.category.trim(),
            price,
            imageUrl: form.imageUrl.trim(),
            isAvailable: form.isAvailable
          })
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Could not save menu item."
        );
      }

      setMessage(
        editingId
          ? "Menu item updated successfully."
          : "Menu item added successfully."
      );

      setEditingId(null);
      setForm(initialForm);

      await loadMenu();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save item."
      );
    } finally {
      setSaving(false);
    }
  }



  const categories = Array.from(new Set(items.map((item) => item.category))).sort();
  const filteredItems = items.filter((item) =>
    (categoryFilter === "all" || item.category === categoryFilter) &&
    `${item.name} ${item.category} ${item.description ?? ""}`.toLowerCase().includes(searchText.toLowerCase())
  );

  async function toggleAvailability(item: MenuItem) {
    try {
      setError("");
      setMessage("");
      const response = await fetch(`${API_URL}/api/menu/${item._id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !item.isAvailable })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not update availability.");
      setMessage(`${item.name} ${item.isAvailable ? "deactivated" : "activated"} successfully.`);
      await loadMenu();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update availability.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="text-sm text-orange-600 hover:underline"
            >
              ← Back to Dashboard
            </Link>

            <h1 className="mt-3 text-3xl font-bold">
              Menu Management
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage your restaurant&apos;s food items and prices.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
            Total menu items: <strong>{items.length}</strong>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}

            <Link
              href="/login"
              className="ml-2 font-semibold underline"
            >
              Go to login
            </Link>
          </div>
        )}

        {message && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
          >
            {message}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <h2 className="text-xl font-bold">
            {editingId ? "Edit Menu Item" : "Add New Menu Item"}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Items are saved through your backend API.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-6 grid gap-5 md:grid-cols-2"
          >
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium">
                Item name *
              </label>

              <input
                id="name"
                required
                minLength={2}
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-orange-500"
                placeholder="e.g. Margherita Pizza"
              />
            </div>

            <div>
              <label
                htmlFor="category"
                className="mb-2 block text-sm font-medium"
              >
                Category *
              </label>

              <input
                id="category"
                required
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-orange-500"
                placeholder="e.g. Pizza"
              />
            </div>

            <div>
              <label htmlFor="price" className="mb-2 block text-sm font-medium">
                Price (₹) *
              </label>

              <input
                id="price"
                required
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) =>
                  setForm({ ...form, price: e.target.value })
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-orange-500"
                placeholder="249"
              />
            </div>

            <div>
              <label
                htmlFor="imageUrl"
                className="mb-2 block text-sm font-medium"
              >
                Image URL (optional)
              </label>

              <input
                id="imageUrl"
                type="url"
                value={form.imageUrl}
                onChange={(e) =>
                  setForm({ ...form, imageUrl: e.target.value })
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-orange-500"
                placeholder="https://example.com/food.jpg"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-medium"
              >
                Description (optional)
              </label>

              <textarea
                id="description"
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-orange-500"
                placeholder="Describe the food item"
              />
            </div>

            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={form.isAvailable}
                onChange={(e) =>
                  setForm({ ...form, isAvailable: e.target.checked })
                }
                className="h-4 w-4 accent-orange-500"
              />
              Available to order
            </label>

            <div className="flex flex-wrap gap-3 md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save Changes"
                    : "Add Menu Item"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-xl border border-slate-300 px-5 py-3 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-xl font-bold">Your Menu</h2>

            <p className="mt-1 text-sm text-slate-500">
              Items retrieved from MongoDB through your backend.
            </p>
          </div>

          <div className="grid gap-3 border-b border-slate-100 p-5 sm:grid-cols-[1fr_220px]">
            <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search by name, category, or description" aria-label="Search menu items" className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-orange-500" />
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter menu by category" className="rounded-xl border border-slate-300 bg-white px-4 py-3">
              <option value="all">All categories</option>
              {categories.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>

          {loading ? (
            <p className="p-6 text-slate-500">
              Loading menu items...
            </p>
          ) : filteredItems.length === 0 ? (
            <p className="p-6 text-slate-500">
              {items.length === 0 ? "No menu items found. Add your first item above." : "No menu items match your search or category filter."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Name</th>
                    <th className="px-5 py-4">Category</th>
                    <th className="px-5 py-4">Price</th>
                    <th className="px-5 py-4">Availability</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-semibold">
                        {item.name}
                      </td>

                      <td className="px-5 py-4">
                        {item.category}
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {money(item.price)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            item.isAvailable
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {item.isAvailable ? "Available" : "Unavailable"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="mr-3 font-semibold text-orange-600 hover:underline"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => void toggleAvailability(item)}
                          className={`font-semibold hover:underline ${item.isAvailable ? "text-red-600" : "text-emerald-700"}`}
                        >
                          {item.isAvailable ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
