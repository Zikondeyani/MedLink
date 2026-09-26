import { supplierCustomers } from "../../lib/customerData";
import { useCurrentSupplierId } from "../../lib/registry";
import { mwkCompact, shortDate } from "../../lib/format";
import DataTable from "../../components/ui/DataTable";
import type { Column } from "../../components/ui/DataTable";
import { Mail, MapPin, Phone, User } from "lucide-react";

export default function SupplierCustomersPage() {
  const supplierId = useCurrentSupplierId();
  // Every row is a real buyer of this store, rolled up from its fulfilment rows.
  const rows = supplierId ? supplierCustomers(supplierId) : [];

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: "customer",
      header: "Customer",
      render: (c) => (
        <div className="row" style={{ gap: 12 }}>
          <span className="s-avatar" style={{ width: 38, height: 38, fontSize: 13, background: "linear-gradient(135deg,#0B1120,#F59E0B)", color: "#fff" }}>
            {(c.name || c.email).split(" ").slice(0, 2).map((w) => w[0]).join("")}
          </span>
          <div>
            <b className="small">{c.name || c.email}</b>
            <div className="xs muted row" style={{ gap: 4 }}>
              <Phone size={11} /> {c.phone || c.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "city",
      header: "Location",
      render: (c) => (
        <span className="small row" style={{ gap: 5 }}><MapPin size={13} className="muted" /> {c.area ? `${c.area}, ` : ""}{c.city}</span>
      ),
    },
    { key: "orders", header: "Orders", render: (c) => <span className="badge badge-soft">{c.orders} orders</span> },
    { key: "total", header: "Total spend", render: (c) => <b>{mwkCompact(c.spend)}</b>, align: "right" },
    {
      key: "since",
      header: "Last order",
      render: (c) => <span className="small muted row" style={{ gap: 5 }}><User size={13} /> {shortDate(c.lastOrderAt)}</span>,
    },
    {
      key: "action",
      header: "",
      render: (c) => (
        <a className="btn btn-outline btn-sm row" style={{ gap: 6 }} href={`mailto:${c.email}`}>
          <Mail size={13} /> Contact
        </a>
      ),
    },
  ];

  return (
    <div className="stack">
      <div className="section-head" style={{ marginBottom: 0 }}>
        <div>
          <span className="eyebrow">Relationships</span>
          <h1 className="h-section">Customers</h1>
          <p className="small muted">Who is buying from your store, and how much they spend.</p>
        </div>
      </div>

      <div className="grid grid-3 dash-grid">
        <div className="card inventory-stat">
          <span className="inventory-icon teal"><User size={18} /></span>
          <div><b>{rows.length}</b><small>Active customers</small></div>
        </div>
        <div className="card inventory-stat">
          <span className="inventory-icon navy"><Mail size={18} /></span>
          <div><b>{rows.reduce((a, c) => a + c.orders, 0)}</b><small>Total orders</small></div>
        </div>
        <div className="card inventory-stat">
          <span className="inventory-icon green"><MapPin size={18} /></span>
          <div><b>{new Set(rows.map((c) => c.city)).size}</b><small>Cities served</small></div>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        minWidth={700}
        empty="No customer has ordered from your store yet."
      />
    </div>
  );
}