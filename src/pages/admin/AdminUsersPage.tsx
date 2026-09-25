/* ============================================================
   MedLink admin — Accounts
   The admin half of authentication: every account on the platform,
   with the role decided at sign-up and the tenant granted by KYC
   approval. Role changes and suspensions run through the admin_*
   RPCs, which re-check the caller's role inside Postgres.
   ============================================================ */
import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, Loader2, RefreshCw, Search, ShieldCheck, ShieldOff, Store, Users } from "lucide-react";
import { Link } from "react-router-dom";
import DataTable from "../../components/ui/DataTable";
import type { Column } from "../../components/ui/DataTable";
import { roleLabel, useAuth, type UserRole } from "../../lib/auth";
import { listAccounts, setAccountRole, setAccountStatus, type AccountRecord } from "../../lib/accounts";
import { useToast } from "../../lib/toast";
import { prettyDate } from "../../lib/format";

type Filter = "all" | UserRole | "suspended";

const roleTone: Record<UserRole, string> = {
  customer: "badge-amber",
  supplier: "badge-navy",
  admin: "badge-green",
};

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "customer", label: "Customers" },
  { id: "supplier", label: "Suppliers" },
  { id: "admin", label: "Admins" },
  { id: "suspended", label: "Suspended" },
];

export default function AdminUsersPage() {
  const { user, backend, refresh } = useAuth();
  const { push } = useToast();
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      setAccounts(await listAccounts());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(
    () => ({
      all: accounts.length,
      customer: accounts.filter((a) => a.role === "customer").length,
      supplier: accounts.filter((a) => a.role === "supplier").length,
      admin: accounts.filter((a) => a.role === "admin").length,
      suspended: accounts.filter((a) => a.status === "suspended").length,
    }),
    [accounts],
  );

  const term = q.trim().toLowerCase();
  const visible = accounts.filter((a) => {
    const matchesFilter =
      filter === "all" ? true : filter === "suspended" ? a.status === "suspended" : a.role === filter;
    if (!matchesFilter) return false;
    if (!term) return true;
    return (
      a.name.toLowerCase().includes(term) ||
      a.email.toLowerCase().includes(term) ||
      (a.supplierId ?? "").toLowerCase().includes(term)
    );
  });

  async function changeRole(account: AccountRecord, role: UserRole): Promise<void> {
    if (account.role === role) return;
    setBusyId(account.id);
    const result = await setAccountRole(account, role, user);
    setBusyId("");
    if (!result.ok) {
      push({ title: "Role not changed", message: result.error, icon: "error" });
      return;
    }
    setAccounts((prev) => prev.map((a) => (a.id === result.account.id ? result.account : a)));
    push({
      title: "Role updated",
      message: `${result.account.name} is now a ${roleLabel(role).toLowerCase()}.`,
      icon: "success",
    });
  }

  async function toggleStatus(account: AccountRecord): Promise<void> {
    const next = account.status === "active" ? "suspended" : "active";
    setBusyId(account.id);
    const result = await setAccountStatus(account, next, user);
    setBusyId("");
    if (!result.ok) {
      push({ title: "Status not changed", message: result.error, icon: "error" });
      return;
    }
    setAccounts((prev) => prev.map((a) => (a.id === result.account.id ? result.account : a)));
    push({
      title: next === "suspended" ? "Account suspended" : "Account reactivated",
      message:
        next === "suspended"
          ? `${result.account.name} can no longer sign in or place orders.`
          : `${result.account.name} can sign in again.`,
      icon: next === "suspended" ? "error" : "success",
    });
  }

  const columns: Column<AccountRecord>[] = [
    {
      key: "account",
      header: "Account",
      render: (a) => (
        <div className="row" style={{ gap: 8 }}>
          <span className={`badge ${roleTone[a.role]}`}>{roleLabel(a.role)}</span>
          <div>
            <b className="small">{a.name}</b>
            <div className="xs muted">
              {a.email}
              {a.id === user?.id && " · you"}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Set role",
      render: (a) => (
        <div className="row wrap" style={{ gap: 6 }}>
          {(["customer", "supplier", "admin"] as UserRole[]).map((role) => (
            <button
              key={role}
              className={`chip${a.role === role ? " chip-active" : ""}`}
              disabled={a.role === role || busyId === a.id}
              onClick={() => void changeRole(a, role)}
            >
              {roleLabel(role)}
            </button>
          ))}
          {busyId === a.id && <Loader2 size={14} className="muted" />}
        </div>
      ),
    },
    {
      key: "tenant",
      header: "Supplier tenant",
      render: (a) =>
        a.supplierId ? (
          <span className="xs semibold">{a.supplierId}</span>
        ) : (
          <span className="xs muted">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (a) => (
        <div className="stack-sm">
          <span className={`badge ${a.status === "active" ? "badge-green" : "badge-red"}`}>
            {a.status === "active" ? "Active" : "Suspended"}
          </span>
          <button
            className={`btn btn-sm ${a.status === "active" ? "btn-outline" : "btn-primary"}`}
            style={a.status === "active" ? { color: "var(--red)", borderColor: "currentColor" } : undefined}
            disabled={busyId === a.id || a.id === user?.id}
            onClick={() => void toggleStatus(a)}
          >
            {a.status === "active" ? (
              <>
                <ShieldOff size={13} /> Suspend
              </>
            ) : (
              <>
                <ShieldCheck size={13} /> Reactivate
              </>
            )}
          </button>
        </div>
      ),
    },
    {
      key: "joined",
      header: "Joined",
      render: (a) => <span className="small">{a.createdAt ? prettyDate(a.createdAt) : "—"}</span>,
    },
  ];

  return (
    <div className="stack dash-page">
      <div className="section-head" style={{ marginBottom: 0 }}>
        <div>
          <span className="eyebrow">Access control</span>
          <h1 className="h-section">Accounts</h1>
          <p className="small muted">
            {counts.all} accounts — the role is decided when an account is created (customer sign-up, supplier
            application, admin provision) and can be corrected here.
          </p>
        </div>
        <div className="row wrap" style={{ gap: 8 }}>
          <button
            className="btn btn-outline"
            disabled={loading}
            onClick={() => {
              void load();
              void refresh();
            }}
          >
            {loading ? <Loader2 size={15} /> : <RefreshCw size={15} />} Refresh
          </button>
          <Link to="/admin/applications" className="btn btn-outline">
            <Store size={15} /> KYC queue
          </Link>
        </div>
      </div>

      {backend === "local" && (
        <div className="card card-pad">
          <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
            <KeyRound size={18} className="amber" />
            <div className="grow">
              <b className="small">Demo backend — these accounts live in this browser</b>
              <p className="xs muted" style={{ marginTop: 4, lineHeight: 1.6 }}>
                Add <b>VITE_SUPABASE_URL</b> and <b>VITE_SUPABASE_ANON_KEY</b> (or{" "}
                <b>VITE_SUPABASE_PUBLISHABLE_KEY</b>) to <b>.env</b> and run the SQL in{" "}
                <b>supabase/migrations</b> to manage real Supabase accounts, roles and suspensions from this
                screen.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="row wrap" style={{ gap: 8, justifyContent: "space-between" }}>
        <div className="row wrap" style={{ gap: 8 }}>
          {filters.map((f) => (
            <button
              key={f.id}
              className={`chip${filter === f.id ? " chip-active" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label} <span className="faq-chip-count">{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <div className="input-wrap" style={{ maxWidth: 280 }}>
          <Search size={15} className="muted" />
          <input
            className="input"
            placeholder="Search name, email or tenant"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search accounts"
          />
        </div>
      </div>

      {error && (
        <div className="card card-pad">
          <b className="small red">{error}</b>
          <p className="xs muted" style={{ marginTop: 4 }}>
            Only administrators can read the account list — check that your own profile row carries the admin
            role (see supabase/seed.sql).
          </p>
        </div>
      )}

      <div className="card card-pad">
        {loading ? (
          <div className="row" style={{ gap: 8, justifyContent: "center", padding: "28px 0" }}>
            <Loader2 size={18} className="muted" />
            <span className="small muted">Loading accounts…</span>
          </div>
        ) : visible.length === 0 ? (
          <div className="empty">
            <span className="empty-icon">
              <Users size={26} strokeWidth={1.7} />
            </span>
            <h3 className="h-card">No accounts here</h3>
            <p className="small muted">No account matches this filter or search.</p>
          </div>
        ) : (
          <DataTable columns={columns} rows={visible} minWidth={940} />
        )}
      </div>

      <p className="xs muted">
        Approving a KYC application is what grants the supplier role and attaches the marketplace tenant. Setting
        a role by hand here never invents a tenant — it keeps whatever the account already has.
      </p>
    </div>
  );
}
