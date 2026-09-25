import { useEffect, useState } from "react";
import {
  Bell,
  Boxes,
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  Store,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { currentSupplierId, supplierById } from "../../data/suppliers";
import { useAuth } from "../../lib/auth";
import { useNotifications } from "../../lib/notifications";
import { SupplierAvatar } from "../marketplace/SupplierCard";
import Logo from "../ui/Logo";

const navItems = [
  { to: "/supplier", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/supplier/store", label: "Store", icon: Store },
  { to: "/supplier/products", label: "Products", icon: Package },
  { to: "/supplier/inventory", label: "Inventory", icon: Boxes },
  { to: "/supplier/orders", label: "Orders", icon: ClipboardList },
  { to: "/supplier/customers", label: "Customers", icon: Users },
  { to: "/supplier/sales", label: "Sales", icon: TrendingUp },
  { to: "/supplier/settings", label: "Store Settings", icon: Settings },
];

export default function SupplierLayout() {
  const supplier = supplierById(currentSupplierId);
  const { signOut } = useAuth();
  const { unread } = useNotifications();
  const [drawer, setDrawer] = useState(false);
  const navigate = useNavigate();

  const signOutAndReturnHome = () => {
    signOut();
    navigate("/");
  };

  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawer]);

  if (!supplier) return null;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `snav-link${isActive ? " active" : ""}`;

  const Sidebar = (
    <aside className={`snav${drawer ? " snav-open" : ""}`}>
      <div className="snav-head">
        <Logo compact size={30} />
        <span className="snav-brand">
          MedLink <small>Supplier OS</small>
        </span>
        <button className="btn btn-ghost btn-icon snav-close" onClick={() => setDrawer(false)} aria-label="Close menu">
          <X size={18} />
        </button>
      </div>

      <div className="snav-store card">
        <SupplierAvatar supplier={supplier} size={42} />
        <div className="grow">
          <b className="small">{supplier.name}</b>
          <span className="badge badge-green" style={{ marginTop: 2 }}>
            <Zap size={11} /> Verified Supplier
          </span>
        </div>
      </div>

      <nav className="snav-nav" aria-label="Supplier">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={linkClass} onClick={() => setDrawer(false)}>
            <item.icon size={18} strokeWidth={1.9} />
            {item.label}
            {item.label === "Orders" && (
              <span className="snav-count">12</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="snav-foot">
        <Link to={`/suppliers/${supplier.slug}`} className="snav-link" onClick={() => setDrawer(false)}>
          <ExternalLink size={15} /> View storefront
        </Link>
        <Link to="/" className="snav-link" onClick={() => setDrawer(false)}>
          <Store size={15} /> Back to marketplace
        </Link>
      </div>
    </aside>
  );

  return (
    <div className="supplier-shell">
      {drawer && <div className="snav-scrim" onClick={() => setDrawer(false)} />}
      {Sidebar}

      <div className="supplier-main">
        <header className="supplier-topbar">
          <button className="btn btn-ghost btn-icon supplier-burger" onClick={() => setDrawer(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <div className="grow">
            <span className="xs muted">Hello, Manager 👋</span>
            <h2 className="small">{supplier.name}</h2>
          </div>
          <div className="supplier-topbar-actions">
            <Link to="/supplier/notifications" className="nav-icon-btn" aria-label="Notifications">
              <Bell size={19} />
              {unread > 0 && <span className="nav-badge">{unread}</span>}
            </Link>
            <button className="nav-icon-btn" onClick={signOutAndReturnHome} aria-label="Sign out" title="Sign out">
              <LogOut size={18} />
            </button>
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