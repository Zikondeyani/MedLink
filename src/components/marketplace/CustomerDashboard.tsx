import { Link } from "react-router-dom";
import { CheckCircle2, Clock, Package, Wallet } from "lucide-react";
import { customerOrders } from "../../data/orders";
import { activeProducts } from "../../data/products";
import { suppliers } from "../../data/suppliers";
import { mwk } from "../../lib/format";
import { useAuth } from "../../lib/auth";
import DashboardCard from "../ui/DashboardCard";
import ProductCard from "./ProductCard";
import SupplierCard from "./SupplierCard";
import { CustomerOrderStatusBadge } from "./OrderStatus";

/**
 * Signed-in customer home. The old account "Overview" tab moved here, so the
 * home page becomes a dashboard once a user logs in (and /account is now a
 * plain sectioned settings page, not a tab hub).
 */
export default function CustomerDashboard() {
  const { user } = useAuth();
  const delivered = customerOrders.filter((o) => o.status === "delivered").length;
  const pending = customerOrders.filter((o) => o.status !== "delivered" && o.status !== "cancelled").length;
  const totalSpent = customerOrders.filter((o) => o.status === "delivered").reduce((a, o) => a + o.total, 0);
  const recommended = activeProducts.filter((p) => p.popular).slice(0, 4);
  const favSuppliers = [...suppliers].sort((a, b) => b.rating - a.rating).slice(0, 2);
  const firstName = (user?.name ?? "there").split(" ")[0];

  return (
    <div className="page container">
      <div className="page-head">
        <span className="eyebrow">Dashboard</span>
        <h1 className="h-display" style={{ fontSize: "clamp(24px,4vw,34px)" }}>
          Hello, {firstName} 👋
        </h1>
        <p>Here's what's happening with your orders and saved items.</p>
      </div>

      <div className="stack">
        <div className="grid grid-4 dash-grid">
          <DashboardCard icon={<Package size={19} />} label="Total Orders" value={String(customerOrders.length)} sub="All time" tone="navy" />
          <DashboardCard icon={<Clock size={19} />} label="Pending Orders" value={String(pending)} sub="In progress" tone="teal" />
          <DashboardCard icon={<CheckCircle2 size={19} />} label="Delivered" value={String(delivered)} sub="Completed" tone="green" />
          <DashboardCard icon={<Wallet size={19} />} label="Total Spent" value={mwk(totalSpent)} sub="Across orders" tone="amber" />
        </div>

        <div className="card card-pad">
          <div className="between" style={{ marginBottom: 14 }}>
            <h2 className="h-card">Recent orders</h2>
            <Link to="/orders" className="link small">View all</Link>
          </div>
          <div className="stack-sm">
            {customerOrders.slice(0, 3).map((o) => (
              <Link to={`/orders/${o.id}`} key={o.id} className="review-line recent-order">
                <div className="grow">
                  <div className="between">
                    <b className="small">{o.number}</b>
                    <CustomerOrderStatusBadge status={o.status} />
                  </div>
                  <div className="xs muted">{o.lines.reduce((a, l) => a + l.quantity, 0)} items · {o.lines[0]?.supplierName}</div>
                </div>
                <b className="small">{mwk(o.total)}</b>
              </Link>
            ))}
          </div>
        </div>

        <div className="card card-pad">
          <div className="between" style={{ marginBottom: 14 }}>
            <h2 className="h-card">Recommended for you</h2>
            <Link to="/products" className="link small">Browse all</Link>
          </div>
          <div className="p-grid p-grid-4">
            {recommended.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>

        <div className="card card-pad">
          <div className="between" style={{ marginBottom: 14 }}>
            <h2 className="h-card">Favorite suppliers</h2>
            <Link to="/suppliers" className="link small">All suppliers</Link>
          </div>
          <div className="grid grid-2">
            {favSuppliers.map((s) => (
              <SupplierCard key={s.id} supplier={s} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}