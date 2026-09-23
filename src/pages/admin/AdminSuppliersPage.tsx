import { useState } from "react";
import { ExternalLink, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useSuppliers, setSupplierSuspended, toggleSupplierVerified, removeSupplier } from "../../lib/registry";
import { useToast } from "../../lib/toast";
import DataTable from "../../components/ui/DataTable";
import type { Column } from "../../components/ui/DataTable";
import { SupplierAvatar } from "../../components/marketplace/SupplierCard";
import VerificationBadge from "../../components/ui/VerificationBadge";
import Rating from "../../components/ui/Rating";

export default function AdminSuppliersPage() {
  const suppliers = useSuppliers();
  const { push } = useToast();
  const [q, setQ] = useState("");

  const term = q.trim().toLowerCase();
  const rows = term
    ? suppliers.filter(
        (s) => s.name.toLowerCase().includes(term) || s.category.toLowerCase().includes(term) || s.location.city.toLowerCase().includes(term),
      )
    : suppliers;

  const live = suppliers.filter((s) => !s.suspended).length;
  const suspended = suppliers.length - live;

  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: "supplier",
      header: "Supplier",
      render: (s) => (
        <div className="row" style={{ gap: 10 }}>
          <SupplierAvatar supplier={s} size={38} />
          <div>
            <div className="row" style={{ gap: 6 }}>
              <b className="small">{s.name}</b>
              <VerificationBadge verified={s.verified} />
            </div>
            <div className="xs muted">{s.category}</div>
          </div>
        </div>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (s) => <span className="small">{s.location.city}, {s.location.area}</span>,
    },
    { key: "products", header: "Products", align: "right", render: (s) => <span>{s.productCount}</span> },
    {
      key: "rating",
      header: "Rating",
      render: (s) => <Rating value={s.rating} count={s.reviewCount} size="sm" />,
    },
    {
      key: "status",
      header: "Status",
      render: (s) =>
        s.suspended ? (
          <span className="badge badge-red">Suspended</span>
        ) : (
          <span className="badge badge-green">Live</span>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (s) => (
        <div className="row wrap" style={{ gap: 6 }}>
          <Link to={`/suppliers/${s.slug}`} className="btn btn-outline btn-sm">
            <ExternalLink size={13} /> View store
          </Link>
          <button
            className="btn btn-outline btn-sm"
            style={{ color: s.suspended ? "var(--green)" : "var(--red)", borderColor: "currentColor", fontWeight: 600 }}
            onClick={() => {
              setSupplierSuspended(s.id, !s.suspended);
              push({
                title: s.suspended ? "Supplier reinstated" : "Supplier suspended",
                message: `${s.name} is now ${s.suspended ? "visible on the marketplace" : "hidden from the marketplace"}.`,
                icon: "info",
              });
            }}
          >
            <ShieldOff size={13} /> {s.suspended ? "Reinstate" : "Suspend"}
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              toggleSupplierVerified(s.id);
              push({
                title: s.verified ? "Verification removed" : "Supplier verified",
                message: `${s.name} ${s.verified ? "is no longer" : "is now"} verified.`,
                icon: "success",
              });
            }}
          >
            <ShieldCheck size={13} /> {s.verified ? "Unverify" : "Verify"}
          </button>
          <button
            className="btn btn-outline btn-sm"
            style={{ color: "var(--red)", borderColor: "currentColor", fontWeight: 600 }}
            onClick={() => {
              removeSupplier(s.id);
              push({ title: "Supplier removed", message: `${s.name} was removed from the marketplace.`, icon: "error" });
            }}
          >
            <Trash2 size={13} /> Remove
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="stack dash-page">
      <div className="section-head" style={{ marginBottom: 0 }}>
        <div>
          <span className="eyebrow">Marketplace</span>
          <h1 className="h-section">Suppliers</h1>
          <p className="small muted">
            {live} live stores · {suspended} suspended · {suppliers.filter((s) => s.verified).length} verified
          </p>
        </div>
        <input
          className="input"
          style={{ maxWidth: 280 }}
          placeholder="Search name, category or city…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search suppliers"
        />
      </div>

      <div className="card card-pad">
        <DataTable columns={columns} rows={rows} minWidth={740} />
      </div>
    </div>
  );
}