import { ClipboardList, Package, ShieldCheck, ShoppingBag, Store, Tags, Users, CheckCircle2, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { customerOrders } from "../../data/orders";
import { activeProducts } from "../../data/products";
import { monthlySales, categorySales } from "../../data/sales";
import { supplierCustomers } from "../../data/orders";
import { useApplications, useSuppliers, reviewApplication, useCategories } from "../../lib/registry";
import { mwk, mwkCompact, shortDate } from "../../lib/format";
import DashboardCard from "../../components/ui/DashboardCard";
import { LineChart, BarChart } from "../../components/charts/Charts";
import { CustomerOrderStatusBadge } from "../../components/marketplace/OrderStatus";
import DataTable from "../../components/ui/DataTable";
import type { Column } from "../../components/ui/DataTable";
import { useToast } from "../../lib/toast";

export default function AdminDashboardPage() {
  const suppliers = useSuppliers();
  const applications = useApplications();
  const categories = useCategories();
  const { push } = useToast();

  const pending = applications.filter((a) => a.status === "pending");
  const gmv = customerOrders.reduce((sum, o) => sum + o.total, 0);

  const recentOrders = customerOrders.slice(0, 5);

  const columns: Column<(typeof recentOrders)[number]>[] = [
    {
      key: "order",
      header: "Order",
      render: (o) => (
        <div>
          <Link to={`/orders/${o.id}`} className="small bold link">{o.number}</Link>
          <div className="xs muted">{shortDate(o.placedAt)}</div>
        </div>
      ),
    },
    { key: "customer", header: "Customer", render: (o) => <span className="small">{o.customerName}</span> },
    {
      key: "total",
      header: "Total",
      align: "right",
      render: (o) => <b>{mwk(o.total)}</b>,
    },
    {
      key: "payment",
      header: "Payment",
      render: (o) => <span className="xs muted">{o.payment.method}</span>,
    },
    { key: "status", header: "Status", render: (o) => <CustomerOrderStatusBadge status={o.status} /> },
  ];

  return (
    <div className="stack dash-page">
      <div className="section-head" style={{ marginBottom: 0 }}>
        <div>
          <span className="eyebrow">Overview</span>
          <h1 className="h-section">Platform Dashboard</h1>
          <p className="small muted">A live snapshot of the whole MedLink marketplace.</p>
        </div>
        <Link to="/admin/applications" className="btn btn-primary btn-sm hide-mobile">
          <ShieldCheck size={15} /> Review KYC ({pending.length})
        </Link>
      </div>

      <div className="grid grid-4 dash-grid">
        <DashboardCard icon={<ShoppingBag size={19} />} label="Gross sales (GMV)" value={mwkCompact(gmv)} trend={18.2} sub="All orders" tone="amber" />
        <DashboardCard icon={<ClipboardList size={19} />} label="Orders" value={String(customerOrders.length)} trend={9.6} sub="Marketplace orders" tone="teal" />
        <DashboardCard icon={<Store size={19} />} label="Suppliers" value={String(suppliers.length)} sub={`${suppliers.length - suppliers.filter((s) => s.suspended).length} live`} tone="navy" />
        <DashboardCard icon={<Package size={19} />} label="Active products" value={String(activeProducts.length)} sub="Across all stores" tone="green" />
        <DashboardCard icon={<Users size={19} />} label="Customers" value={String(supplierCustomers.length + customerOrders.length)} sub="Facilities & buyers" tone="teal" />
        <DashboardCard icon={<ShieldCheck size={19} />} label="Pending KYC" value={String(pending.length)} sub="Awaiting review" tone="amber" />
        <DashboardCard icon={<Tags size={19} />} label="Categories" value={String(categories.length)} sub="Managed in admin" tone="navy" />
      </div>

      <div className="split dash-charts">
        <div className="card card-pad">
          <div className="section-head" style={{ marginBottom: 8 }}>
            <div>
              <span className="eyebrow">Revenue</span>
              <h3 className="h-card">Monthly marketplace sales</h3>
            </div>
          </div>
          <LineChart data={monthlySales.map((m) => ({ label: m.month, value: m.sales }))} color="#FFB74D" />
        </div>
        <div className="card card-pad">
          <div className="section-head" style={{ marginBottom: 8 }}>
            <div>
              <span className="eyebrow">By department</span>
              <h3 className="h-card">Sales by category</h3>
            </div>
          </div>
          <BarChart data={categorySales.map((c) => ({ label: c.name, value: c.value }))} color="#0B1120" />
        </div>
      </div>

      <div className="card card-pad">
        <div className="section-head" style={{ marginBottom: 12 }}>
          <div>
            <span className="eyebrow">Live</span>
            <h3 className="h-card">Recent orders</h3>
          </div>
          <Link to="/admin/orders" className="btn btn-outline btn-sm">All orders</Link>
        </div>
        <DataTable columns={columns} rows={recentOrders} minWidth={680} />
      </div>

      {pending.length > 0 && (
        <div className="card card-pad">
          <div className="section-head" style={{ marginBottom: 12 }}>
            <div>
              <span className="eyebrow">Action needed</span>
              <h3 className="h-card">Pending KYC applications</h3>
            </div>
            <Link to="/admin/applications" className="btn btn-outline btn-sm">Open queue</Link>
          </div>
          <div className="grid grid-3">
            {pending.slice(0, 3).map((a) => (
              <div key={a.id} className="card dash-mini">
                <div className="row" style={{ gap: 10 }}>
                  <span className="dash-card-icon dash-card-amber" style={{ marginBottom: 0 }}>
                    <ShieldCheck size={17} />
                  </span>
                  <div className="grow">
                    <b className="small">{a.businessName}</b>
                    <div className="xs muted">{a.categoryFocus} · {a.city}</div>
                  </div>
                  <span className="badge badge-amber">Pending</span>
                </div>
                <p className="xs muted" style={{ marginTop: 10 }}>
                  {a.directorName} · ref {a.ref}
                </p>
                <div className="row" style={{ gap: 8, marginTop: 12 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      reviewApplication(a.id, "approved");
                      push({ title: "Application approved", message: `${a.businessName} is now a verified supplier.`, icon: "success" });
                    }}
                  >
                    <CheckCircle2 size={14} /> Approve
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      reviewApplication(a.id, "rejected", "Rejected from dashboard. Add a note in the review queue.");
                      push({ title: "Application rejected", message: `${a.businessName} was rejected.`, icon: "error" });
                    }}
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}