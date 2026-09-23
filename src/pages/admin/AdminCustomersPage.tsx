import { supplierCustomers, customerOrders } from "../../data/orders";
import { useCustomerFlags, toggleCustomerBlocked } from "../../lib/registry";
import { useToast } from "../../lib/toast";
import { mwk } from "../../lib/format";
import DataTable from "../../components/ui/DataTable";
import type { Column } from "../../components/ui/DataTable";

interface CustomerRow {
  id: string;
  name: string;
  contact: string;
  city: string;
  orders: number;
  total: number;
  since: string;
  kind: "Facility" | "Buyer";
}

export default function AdminCustomersPage() {
  const flags = useCustomerFlags();
  const { push } = useToast();

  const byName = new Map<string, { orders: number; total: number; city: string }>();
  for (const o of customerOrders) {
    const cur = byName.get(o.customerName) ?? { orders: 0, total: 0, city: o.address.city };
    cur.orders += 1;
    cur.total += o.total;
    cur.city = o.address.city;
    byName.set(o.customerName, cur);
  }

  const rows: CustomerRow[] = [
    ...supplierCustomers.map((c) => ({ ...c, kind: "Facility" as const })),
    ...[...byName.entries()].map(([name, v], i) => ({
      id: `buyer-${i}`,
      name,
      contact: "—",
      city: v.city,
      orders: v.orders,
      total: v.total,
      since: "2026",
      kind: "Buyer" as const,
    })),
  ];

  const columns: Column<CustomerRow>[] = [
    {
      key: "customer",
      header: "Customer",
      render: (c) => (
        <div className="row" style={{ gap: 8 }}>
          <span className={`badge ${c.kind === "Facility" ? "badge-navy" : "badge-amber"}`}>{c.kind}</span>
          <div>
            <b className="small">{c.name}</b>
            <div className="xs muted">{c.contact}</div>
          </div>
        </div>
      ),
    },
    { key: "city", header: "City", render: (c) => <span className="small">{c.city}</span> },
    { key: "orders", header: "Orders", align: "right", render: (c) => <span>{c.orders}</span> },
    { key: "total", header: "Spend", align: "right", render: (c) => <b>{mwk(c.total)}</b> },
    { key: "since", header: "Customer since", render: (c) => <span className="small">{c.since}</span> },
    {
      key: "status",
      header: "Status",
      render: (c) => {
        const blocked = flags[c.id]?.blocked ?? false;
        return (
          <button
            className={`btn btn-sm ${blocked ? "btn-primary" : "btn-outline"}`}
            onClick={() => {
              toggleCustomerBlocked(c.id);
              push({
                title: blocked ? "Account restored" : "Account blocked",
                message: `${c.name} ${blocked ? "can now" : "can no longer"} place orders.`,
                icon: "info",
              });
            }}
          >
            {blocked ? "Unblock" : "Block"}
          </button>
        );
      },
    },
  ];

  return (
    <div className="stack dash-page">
      <div className="section-head" style={{ marginBottom: 0 }}>
        <div>
          <span className="eyebrow">Community</span>
          <h1 className="h-section">Customers</h1>
          <p className="small muted">
            {rows.length} customers — healthcare facilities and individual buyers on MedLink.
          </p>
        </div>
      </div>
      <div className="card card-pad">
        <DataTable columns={columns} rows={rows} minWidth={700} />
      </div>
    </div>
  );
}