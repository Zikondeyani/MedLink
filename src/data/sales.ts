/* ============================================================
   Supplier analytics — mock data for the store dashboard
   ============================================================ */

export const monthlySales = [
  { month: "Oct", sales: 210000 },
  { month: "Nov", sales: 320000 },
  { month: "Dec", sales: 275000 },
  { month: "Jan", sales: 410000 },
  { month: "Feb", sales: 385000 },
  { month: "Mar", sales: 520000 },
  { month: "Apr", sales: 465000 },
  { month: "May", sales: 610000 },
  { month: "Jun", sales: 580000 },
  { month: "Jul", sales: 720000 },
  { month: "Aug", sales: 890000 },
  { month: "Sep", sales: 960000 },
];

export const monthlyOrders = [
  { month: "Oct", orders: 6 },
  { month: "Nov", orders: 9 },
  { month: "Dec", orders: 7 },
  { month: "Jan", orders: 11 },
  { month: "Feb", orders: 10 },
  { month: "Mar", orders: 14 },
  { month: "Apr", orders: 12 },
  { month: "May", orders: 16 },
  { month: "Jun", orders: 15 },
  { month: "Jul", orders: 19 },
  { month: "Aug", orders: 22 },
  { month: "Sep", orders: 26 },
];

export const topProducts = [
  { name: "Digital Blood Pressure Monitor", units: 142, revenue: 12070000 },
  { name: "Stethoscope Classic III", units: 98, revenue: 6370000 },
  { name: "Pulse Oximeter", units: 176, revenue: 7920000 },
  { name: "Patient Monitor Multi-Parameter", units: 24, revenue: 44400000 },
  { name: "Oxygen Concentrator 5L", units: 18, revenue: 26100000 },
];

export const categorySales = [
  { name: "Diagnostic Equipment", value: 46 },
  { name: "Medical Equipment", value: 32 },
  { name: "Consumables", value: 14 },
  { name: "Other", value: 8 },
];

export const supplierDashboardStats = {
  totalSales: 4850000,
  orders: 128,
  products: 245,
  pendingOrders: 12,
  avgOrderValue: 37891,
  conversion: 68,
};

export const supplyOrderStatusSteps: { key: "new" | "confirmed" | "preparing" | "ready" | "completed"; label: string }[] = [
  { key: "new", label: "New" },
  { key: "confirmed", label: "Confirmed" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready for Pickup" },
  { key: "completed", label: "Completed" },
];