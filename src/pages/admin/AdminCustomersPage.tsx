import { useEffect } from "react";
import { useAccounts } from "../../lib/accounts";
import { setCustomerBlocked, useCustomerFlags } from "../../lib/registry";
import { useOrders } from "../../lib/customerData";
import { useToast } from "../../lib/toast";
import { mwk, shortDate } from "../../lib/format";
import DataTable from "../../components/ui/DataTable";
import type { Column } from "../../components/ui/DataTable";
import EmptyState from "../../components/ui/EmptyState";

interface CustomerRow {
  id: string;
  name: string;
  contact: string;
  city: string;
  orders: number;
  total: number;
  since: string;
  /** Blocked straight from the account row, not a local mirror. */
  blocked: boolean;
}

export default function AdminCustomersPage() {
  const { accounts, loading, loaded, error, refresh } = useAccounts();
  const flags = useCustomerFlags();
  const orders = useOrders();
  const { push } = useToast();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Registered accounts are the source; the order history only adds the spend.
  const byEmail = new Map<string, { orders: number; total: number; city: string; last: string }>();
  for (const order of orders) {
    const key = order.customerEmail.trim().toLowerCase();
    const entry = byEmail.get(key) ?? { orders: 0, total: 0, city: order.address.city, last: order.placedAt };
    entry.orders += 1;
    entry.total += order.total;
    entry.last = order.placedAt > entry.last ? order.placedAt : entry.last;
    byEmail.set(key, entry);
  }

  const rows: CustomerRow[] = accounts
    .filter((account) => account.role === "customer")
    .map((account) => {
      const stats = byEmail.get(account.email.trim().toLowerCase());
      return {
        id: account.id,
        name: account.name || account.email,
        contact: account.email,
        city: stats?.city ?? "—",
        orders: stats?.orders ?? 0,
        total: stats?.total ?? 0,
        since: shortDate(account.createdAt ?? ""),
        blocked: account.blocked,
      };
    })
    .sort((a, b) => b.orders - a.orders || a.name.localeCompare(b.name));

  async function setBlocked(row: CustomerRow, blocked: boolean): Promise<void> {
    const result = await setCustomerBlocked(row.id, blocked);
    if (!result.ok) {
      push({ title: "Not updated", message: result.error ?? "The server rejected the change.", icon: "error" });
      return;
    }
    push({
      title: blocked ? "Account blocked" : "Account restored",
      message: `${row.name} ${blocked ? "can no longer" : "can now"} place orders.`,
      icon: "info",
    });
  }

  const columns: Column<CustomerRow>[] = [
    {
      key: "customer",
      header: "Customer",
      render: (c) => (
        <div className="row" style={{ gap: 8 }}>
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
        const blocked = flags[c.id]?.blocked ?? c.blocked;
        return (
          <button
            className={`btn btn-sm ${blocked ? "btn-primary" : "btn-outline"}`}
            onClick={() => void setBlocked(c, !blocked)}
          >
            {blocked ? "Unblock" : "Block"}
          </button>
        );
      },
    },
  ];

  if (error) {
    return (
      <div className="stack dash-page">
        <EmptyState icon="search" title="Could not load customers" message={error} />
      </div>
    );
  }

  return (
    <div className="stack dash-page">
      <div className="section-head" style={{ marginBottom: 0 }}>
        <div>
          <span className="eyebrow">Community</span>
          <h1 className="h-section">Customers</h1>
          <p className="small muted">
            {rows.length} registered {rows.length === 1 ? "account" : "accounts"} with order history from the database.
          </p>
        </div>
      </div>
      <div className="card card-pad">
        {rows.length === 0 && loaded && !loading ? (
          <EmptyState
            icon="box"
            title="No customers yet"
            message="Customer accounts appear here as soon as people sign up."
          />
        ) : (
          <DataTable columns={columns} rows={rows} minWidth={700} />
        )}
      </div>
    </div>
  );
}
