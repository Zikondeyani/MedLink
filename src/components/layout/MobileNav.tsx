import {
  Bell,
  ClipboardList,
  Home,
  LayoutDashboard,
  Package,
  ShieldCheck,
  ShoppingCart,
  Store,
  User,
  Users,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useCart } from "../../lib/cart";
import { useNotifications } from "../../lib/notifications";
import { useAuth } from "../../lib/auth";

export default function MobileNav() {
  const { summary } = useCart();
  const { unread } = useNotifications();
  const { user } = useAuth();

  const link = ({ isActive }: { isActive: boolean }) =>
    `mnav-link${isActive ? " active" : ""}`;

  const badge = (count: number) => count > 0 ? <span className="nav-badge">{count}</span> : null;

  if (!user) {
    return (
      <nav className="mnav" aria-label="Mobile navigation">
        <NavLink to="/" className={link} end>
          <Home size={20} />
          <small>Home</small>
        </NavLink>
        <NavLink to="/products" className={link}>
          <Package size={20} />
          <small>Products</small>
        </NavLink>
        <NavLink to="/suppliers" className={link}>
          <Store size={20} />
          <small>Suppliers</small>
        </NavLink>
        <NavLink to="/cart" className={link}>
          <span className="mnav-badge-wrap">
            <ShoppingCart size={20} />
            {badge(summary.items)}
          </span>
          <small>Cart</small>
        </NavLink>
        <NavLink to="/become-a-supplier" className={link}>
          <Store size={20} />
          <small>Sell on MedLink</small>
        </NavLink>
      </nav>
    );
  }

  if (user.role === "supplier") {
    return (
      <nav className="mnav" aria-label="Supplier navigation">
        <NavLink to="/supplier" className={link} end>
          <LayoutDashboard size={20} />
          <small>Dashboard</small>
        </NavLink>
        <NavLink to="/supplier/products" className={link}>
          <Package size={20} />
          <small>Products</small>
        </NavLink>
        <NavLink to="/supplier/orders" className={link}>
          <ClipboardList size={20} />
          <small>Orders</small>
        </NavLink>
        <NavLink to="/supplier/notifications" className={link}>
          <span className="mnav-badge-wrap">
            <Bell size={20} />
            {badge(unread)}
          </span>
          <small>Alerts</small>
        </NavLink>
        <NavLink to="/" className={link} end>
          <Store size={20} />
          <small>Marketplace</small>
        </NavLink>
      </nav>
    );
  }

  if (user.role === "admin") {
    return (
      <nav className="mnav" aria-label="Admin navigation">
        <NavLink to="/admin" className={link} end>
          <ShieldCheck size={20} />
          <small>Dashboard</small>
        </NavLink>
        <NavLink to="/admin/orders" className={link}>
          <ClipboardList size={20} />
          <small>Orders</small>
        </NavLink>
        <NavLink to="/admin/customers" className={link}>
          <Users size={20} />
          <small>Customers</small>
        </NavLink>
        <NavLink to="/admin/notifications" className={link}>
          <span className="mnav-badge-wrap">
            <Bell size={20} />
            {badge(unread)}
          </span>
          <small>Alerts</small>
        </NavLink>
        <NavLink to="/" className={link} end>
          <Store size={20} />
          <small>Marketplace</small>
        </NavLink>
      </nav>
    );
  }

  return (
    <nav className="mnav" aria-label="Customer navigation">
      <NavLink to="/" className={link} end>
        <LayoutDashboard size={20} />
        <small>Dashboard</small>
      </NavLink>
      <NavLink to="/products" className={link}>
        <Package size={20} />
        <small>Products</small>
      </NavLink>
      <NavLink to="/orders" className={link}>
        <ClipboardList size={20} />
        <small>Orders</small>
      </NavLink>
      <NavLink to="/cart" className={link}>
        <span className="mnav-badge-wrap">
          <ShoppingCart size={20} />
          {badge(summary.items)}
        </span>
        <small>Cart</small>
      </NavLink>
      <NavLink to="/account" className={link}>
        <span className="mnav-badge-wrap">
          <User size={20} />
          {badge(unread)}
        </span>
        <small>Account</small>
      </NavLink>
    </nav>
  );
}
