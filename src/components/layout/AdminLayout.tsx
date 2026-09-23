import { useEffect, useState } from "react";
import {
  Bell,
  ClipboardList,
  Landmark,
  LayoutDashboard,
  Menu,
  Package,
  Percent,
  ShieldCheck,
  Store,
  Tags,
  Users,
  X,
} from "lucide-react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useApplications } from "../../lib/registry";
import { useNotifications } from "../../lib/notifications";
import Logo from "../ui/Logo";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/applications", label: "KYC Applications", icon: ShieldCheck },
  { to: "/admin/suppliers", label: "Suppliers", icon: Store },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/orders", label: "Orders", icon: ClipboardList },
  { to: "/admin/transactions", label: "Transactions", icon: Landmark },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/categories", label: "Categories", icon: Tags },
  { to: "/admin/pricing", label: "Pricing", icon: Percent },
];

export default function AdminLayout() {
  const applications = useApplications();
  const pendingCount = applications.filter((a) => a.status === "pending").length;
  const { unread } = useNotifications();
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setDrawer(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawer]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `snav-link${isActive ? " active" : ""}`;

  const Sidebar = (
    <aside className={`snav admin-snav${drawer ? " snav-open" : ""}`}>
      <div className="snav-head">
        <Logo compact size={30} />
        <span className="snav-brand">
          MedLink <small>Admin</small>
        </span>
        <button className="btn btn-ghost btn-icon snav-close" onClick={() => setDrawer(false)} aria-label="Close menu">
          <X size={18} />
        </button>
      </div>

      <div className="snav-store card admin-snav-card">
        <span className="snav-avatar"><ShieldCheck size={22} /></span>
        <div className="grow">
          <b className="small">Platform Administrator</b>
          <span className="badge badge-green" style={{ marginTop: 2 }}>
            <ShieldCheck size={11} /> Full access
          </span>
        </div>
      </div>

      <nav className="snav-nav" aria-label="Admin">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
            <item.icon size={18} strokeWidth={1.9} />
            {item.label}
            {item.label === "KYC Applications" && pendingCount > 0 && (
              <span className="snav-count">{pendingCount}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="snav-foot">
        <Link to="/" className="snav-link">
          <Store size={15} /> Back to marketplace
        </Link>
      </div>
    </aside>
  );

  return (
    <div className="supplier-shell admin-shell">
      {drawer && <div className="snav-scrim" onClick={() => setDrawer(false)} />}
      {Sidebar}

      <div className="supplier-main">
        <header className="supplier-topbar">
          <button className="btn btn-ghost btn-icon supplier-burger" onClick={() => setDrawer(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <div className="grow">
            <span className="xs muted">MedLink platform</span>
            <h2 className="small">Admin Control Centre</h2>
          </div>
          <div className="supplier-topbar-actions">
            <Link to="/account?tab=notifications" className="nav-icon-btn" aria-label="Notifications">
              <Bell size={19} />
              {unread > 0 && <span className="nav-badge">{unread}</span>}
            </Link>
            <Link to="/" className="btn btn-outline btn-sm">
              Marketplace
            </Link>
          </div>
        </header>

        <main className="supplier-content container">
          <Outlet />
        </main>
      </div>
    </div>
  );
}