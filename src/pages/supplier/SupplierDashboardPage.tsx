import { ClipboardList, Package, ShoppingBag, TrendingUp, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import {
  useCategorySales,
  useMonthlyOrders,
  useMonthlySales,
  useSupplierDashboardStats,
  useTopProducts,
} from "../../lib/analytics";
import { useSupplierOrders } from "../../lib/customerData";
import { useCurrentSupplierId } from "../../lib/registry";
import { mwk, mwkCompact, shortDate } from "../../lib/format";
import DashboardCard from "../../components/ui/DashboardCard";
import { LineChart, BarChart, DonutChart } from "../../components/charts/Charts";
import { SupplierOrderStatusBadge } from "../../components/marketplace/OrderStatus";
import DataTable from "../../components/ui/DataTable";
import type { Column } from "../../components/ui/DataTable";

export default function SupplierDashboardPage() {
  // This store's own rows — never another store's.
  const supplierId = useCurrentSupplierId() ?? undefined;
  const supplierDashboardStats = useSupplierDashboardStats(supplierId);
  const monthlySales = useMonthlySales(supplierId);
  const monthlyOrders = useMonthlyOrders(supplierId);
  const topProducts = useTopProducts(supplierId);
  const categorySales = useCategorySales(supplierId);
  const storeOrders = useSupplierOrders().filter((order) => order.supplierId === supplierId);
  const recentOrders = storeOrders.slice(0, 5);

  const columns: Column<(typeof recentOrders)[number]>[] = [
    {
      key: "order",
      header: "Order",
      render: (o) => (
        <div>
          <Link to={`/supplier/orders/${o.id}`} className="small bold link">{o.number}</Link>
          <div className="xs muted">{shortDate(o.placedAt)}</div>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (o) => (
        <div>
          <div className="small semibold">{o.customerOrg}</div>
          <div className="xs muted">{o.city} · {o.area}</div>
        </div>
      ),
    },
    { key: "items", header: "Items", render: (o) => <span>{o.itemsTotal}</span>, align: "right" },
    { key: "total", header: "Total", render: (o) => <b>{mwk(o.total)}</b>, align: "right" },
    { key: "status", header: "Status", render: (o) => <SupplierOrderStatusBadge status={o.status} /> },
  ];

  return (
    <div className="stack dash-page">
      <div className="section-head" style={{ marginBottom: 0 }}>
        <div>
          <span className="eyebrow">Overview</span>
          <h1 className="h-section">Dashboard</h1>
          <p className="small muted">Here's what's happening with your store today.</p>
        </div>
        <Link to="/supplier/products/new" className="btn btn-primary btn-sm hide-mobile">+ Add product</Link>
      </div>

      <div className="grid grid-4 dash-grid">
        <DashboardCard
          icon={<Wallet size={19} />}
          label="Total Sales"
          value={mwk(supplierDashboardStats.totalSales)}
          sub="Goods value, all time"
          tone="teal"
        />
        <DashboardCard
          icon={<ShoppingBag size={19} />}
          label="Orders"
          value={String(supplierDashboardStats.orders)}
          sub="All time"
          tone="navy"
        />
        <DashboardCard
          icon={<Package size={19} />}
          label="Products"
          value={String(supplierDashboardStats.products)}
          sub="Published"
          tone="green"
        />
        <DashboardCard
          icon={<ClipboardList size={19} />}
          label="Pending Orders"
          value={String(supplierDashboardStats.pendingOrders)}
          sub="Ready for action"
          tone="amber"
        />
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr" }}>
        <div className="card card-pad">
          <div className="between" style={{ marginBottom: 8 }}>
            <h3 className="h-card">Sales over time</h3>
            <span className="xs muted">Last 12 months</span>
          </div>
          <LineChart data={monthlySales.map((d) => ({ label: d.month, value: d.sales }))} />
        </div>
        <div className="card card-pad">
          <div className="between" style={{ marginBottom: 8 }}>
            <h3 className="h-card">Orders over time</h3>
            <span className="xs muted">Last 12 months</span>
          </div>
          <BarChart data={monthlyOrders.map((d) => ({ label: d.month, value: d.orders }))} format="plain" color="#FFB74D" />
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
        <div className="card card-pad">
          <div className="between" style={{ marginBottom: 12 }}>
            <h3 className="h-card">Top selling products</h3>
            <Link to="/supplier/sales" className="link small">Full report</Link>
          </div>
          <div className="stack-sm">
            {topProducts.map((p, i) => (
              <div key={p.name} className="top-product">
                <span className="top-product-rank">{i + 1}</span>
                <div className="grow">
                  <div className="between small">
                    <b className="small">{p.name}</b>
                    <span className="muted">{mwkCompact(p.revenue)}</span>
                  </div>
                  <div className="top-product-bar">
                    <i style={{ width: `${(p.units / topProducts[0].units) * 100}%` }} />
                  </div>
                  <span className="xs muted">{p.units} units sold</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card card-pad">
          <h3 className="h-card" style={{ marginBottom: 8 }}>Sales by category</h3>
          <DonutChart data={categorySales} size={170} />
        </div>
      </div>

      <div className="card card-pad">
        <div className="between" style={{ marginBottom: 14 }}>
          <h3 className="h-card">Recent orders</h3>
          <Link to="/supplier/orders" className="link small">View all</Link>
        </div>
        <div style={{ marginInline: -24, marginBottom: -24 }}>
          <DataTable
          columns={columns}
          rows={recentOrders}
          minWidth={720}
          empty="No orders for your store yet."
        />
        </div>
      </div>

      <div className="card card-pad dash-tip">
        <TrendingUp size={18} className="teal" />
        <p className="small muted">
          <b className="ink">Pro tip:</b> Mark orders as <b>Ready for Pickup</b> promptly so MedLink can schedule
          collection and your customers receive their items faster.
        </p>
      </div>
    </div>
  );
}