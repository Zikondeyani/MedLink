/* ============================================================
   MedLink — dashboards and charts

   Every number on a dashboard is derived from real rows: the
   buyer's orders, the store's fulfilment rows and the catalogue.
   Nothing is pre-baked, so a new account with no orders shows
   empty charts and zero totals, which is the truth.

   The only static piece is the fulfilment step labels, which are
   UI copy rather than data.
   ============================================================ */

import { useMemo } from "react";
import { getAllSupplierOrders, useOrders, useSupplierOrders } from "./customerData";
import { useActiveProducts, useCategories, usePricing, useProducts, useSuppliers } from "./registry";

/* ---------- static UI copy (not data) ---------- */

/** Fulfilment pipeline labels shown to suppliers. */
export const supplyOrderStatusSteps: {
  key: "new" | "confirmed" | "preparing" | "ready" | "completed";
  label: string;
}[] = [
  { key: "new", label: "New" },
  { key: "confirmed", label: "Confirmed" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready for Pickup" },
  { key: "completed", label: "Completed" },
];

/* ---------- the shape every aggregate works on ---------- */

/** What a buyer order and a store fulfilment row have in common. */
interface SaleRow {
  placedAt: string;
  status: string;
  total: number;
  subtotal: number;
  lines: { name: string; price: number; quantity: number; productId: string }[];
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The rows a dashboard should read: one store's fulfilment, or every order. */
function useSaleRows(supplierId?: string): SaleRow[] {
  const orders = useOrders();
  const supplierOrders = useSupplierOrders();
  return useMemo(() => {
    if (supplierId) {
      return supplierOrders.filter((order) => order.supplierId === supplierId) as SaleRow[];
    }
    return orders as SaleRow[];
  }, [orders, supplierOrders, supplierId]);
}

/** The last 12 calendar months, oldest first. */
function lastTwelveMonths(): { key: string; label: string }[] {
  const now = new Date();
  const buckets: { key: string; label: string }[] = [];
  for (let offset = 11; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    buckets.push({ key, label: MONTH_LABELS[date.getMonth()] ?? key });
  }
  return buckets;
}

function monthKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Cancelled work is not sales. */
function isCountable(row: { status: string }): boolean {
  return row.status !== "cancelled";
}

/* ---------- sales over time ---------- */

export function useMonthlySales(supplierId?: string): { month: string; sales: number }[] {
  const rows = useSaleRows(supplierId);
  return useMemo(() => {
    const totals = new Map<string, number>();
    for (const row of rows) {
      if (!isCountable(row)) continue;
      const key = monthKey(row.placedAt);
      if (!key) continue;
      totals.set(key, (totals.get(key) ?? 0) + row.total);
    }
    return lastTwelveMonths().map(({ key, label }) => ({ month: label, sales: totals.get(key) ?? 0 }));
  }, [rows]);
}

export function useMonthlyOrders(supplierId?: string): { month: string; orders: number }[] {
  const rows = useSaleRows(supplierId);
  return useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      if (!isCountable(row)) continue;
      const key = monthKey(row.placedAt);
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return lastTwelveMonths().map(({ key, label }) => ({ month: label, orders: counts.get(key) ?? 0 }));
  }, [rows]);
}

/* ---------- best sellers ---------- */

export function useTopProducts(supplierId?: string): { name: string; units: number; revenue: number }[] {
  const rows = useSaleRows(supplierId);
  return useMemo(() => {
    const byName = new Map<string, { units: number; revenue: number }>();
    for (const row of rows) {
      if (!isCountable(row)) continue;
      for (const line of row.lines) {
        const entry = byName.get(line.name) ?? { units: 0, revenue: 0 };
        entry.units += line.quantity;
        entry.revenue += line.price * line.quantity;
        byName.set(line.name, entry);
      }
    }
    return [...byName.entries()]
      .map(([name, entry]) => ({ name, ...entry }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);
  }, [rows]);
}

/* ---------- category mix ---------- */

export function useCategorySales(supplierId?: string): { name: string; value: number }[] {
  const rows = useSaleRows(supplierId);
  // The full catalogue (not only the published shelf) supplies the labels, so a
  // line from a now-archived product still lands in its category.
  const products = useProducts();
  const categories = useCategories();

  return useMemo(() => {
    const labelById = new Map(categories.map((category) => [category.id, category.name]));
    const scoped = supplierId ? products.filter((product) => product.supplierId === supplierId) : products;
    const categoryByProduct = new Map(scoped.map((product) => [product.id, product.categoryId]));

    const totals = new Map<string, number>();
    let grand = 0;
    for (const row of rows) {
      if (!isCountable(row)) continue;
      for (const line of row.lines) {
        const categoryId = line.productId ? categoryByProduct.get(line.productId) : undefined;
        const label = categoryId ? (labelById.get(categoryId) ?? "Other") : "Other";
        const value = line.price * line.quantity;
        totals.set(label, (totals.get(label) ?? 0) + value);
        grand += value;
      }
    }
    if (grand === 0) return [];
    return [...totals.entries()]
      .map(([name, value]) => ({ name, value: Math.round((value / grand) * 100) }))
      .sort((a, b) => b.value - a.value);
  }, [rows, products, categories, supplierId]);
}

/* ---------- store dashboard ---------- */

export interface SupplierDashboardStats {
  totalSales: number;
  orders: number;
  products: number;
  pendingOrders: number;
  avgOrderValue: number;
  /** Share of the store's orders that have been completed, in percent. */
  fulfilment: number;
}

/** Real totals for one store, or the whole platform when no id is given. */
export function useSupplierDashboardStats(supplierId?: string): SupplierDashboardStats {
  const supplierOrders = useSupplierOrders();
  const products = useActiveProducts();
  const supplierId_ = supplierId;

  return useMemo(() => {
    const rows = supplierId_ ? supplierOrders.filter((order) => order.supplierId === supplierId_) : supplierOrders;
    const countable = rows.filter(isCountable);
    const totalSales = countable.reduce((sum, order) => sum + order.subtotal, 0);
    const completed = countable.filter((order) => order.status === "completed").length;
    const scopedProducts = supplierId_
      ? products.filter((product) => product.supplierId === supplierId_)
      : products;

    return {
      totalSales,
      orders: countable.length,
      products: scopedProducts.length,
      pendingOrders: countable.filter((order) => order.status !== "completed").length,
      avgOrderValue: countable.length === 0 ? 0 : Math.round(totalSales / countable.length),
      fulfilment: countable.length === 0 ? 0 : Math.round((completed / countable.length) * 100),
    };
  }, [supplierOrders, products, supplierId_]);
}

/* ---------- admin overview ---------- */

export interface PlatformSummary {
  revenue: number;
  orders: number;
  customers: number;
  suppliers: number;
  products: number;
  heldInEscrow: number;
  serviceFee: number;
}

/** Platform-wide totals for the admin dashboard, all from real rows. */
export function usePlatformSummary(): PlatformSummary {
  const orders = useOrders();
  const suppliers = useSuppliers();
  const products = useActiveProducts();
  const pricing = usePricing();

  return useMemo(() => {
    const countable = orders.filter(isCountable);
    const revenue = countable.reduce((sum, order) => sum + order.total, 0);
    const goods = countable.reduce((sum, order) => sum + order.subtotal, 0);
    // Escrow = fulfilment value the admin has not released yet.
    const settled = new Set(
      getAllSupplierOrders()
        .filter((order) => order.status === "completed")
        .map((order) => order.orderId ?? ""),
    );
    const held = getAllSupplierOrders()
      .filter((order) => order.orderId && !settled.has(order.orderId))
      .reduce((sum, order) => sum + order.subtotal, 0);

    return {
      revenue,
      orders: countable.length,
      customers: new Set(countable.map((order) => order.customerEmail.toLowerCase())).size,
      suppliers: suppliers.length,
      products: products.length,
      heldInEscrow: held,
      serviceFee: Math.round(goods * pricing.serviceFeeRate),
    };
  }, [orders, suppliers, products, pricing]);
}

/* ---------- buyer totals ---------- */

/** Buyer's own order count and spend, for the account hub. */
export function useBuyerTotals(email: string): { orders: number; spend: number; open: number } {
  const orders = useOrders();
  return useMemo(() => {
    const key = email.trim().toLowerCase();
    const owned = orders.filter((order) => order.customerEmail.trim().toLowerCase() === key && isCountable(order));
    return {
      orders: owned.length,
      spend: owned.reduce((sum, order) => sum + order.total, 0),
      open: owned.filter((order) => order.status !== "delivered" && order.status !== "cancelled").length,
    };
  }, [orders, email]);
}

/** All buyer orders, newest first. */
export function useAllOrdersSorted(): ReturnType<typeof useOrders> {
  const orders = useOrders();
  return useMemo(
    () => [...orders].sort((a, b) => b.placedAt.localeCompare(a.placedAt)),
    [orders],
  );
}
