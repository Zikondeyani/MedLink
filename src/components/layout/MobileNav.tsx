import { Home, Package, Search, ShoppingCart, User } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useCart } from "../../lib/cart";
import { useNotifications } from "../../lib/notifications";

export default function MobileNav() {
  const { summary } = useCart();
  const { unread } = useNotifications();

  const link = ({ isActive }: { isActive: boolean }) =>
    `mnav-link${isActive ? " active" : ""}`;

  return (
    <nav className="mnav" aria-label="Mobile navigation">
      <NavLink to="/" className={link} end>
        <Home size={20} />
        <small>Home</small>
      </NavLink>
      <NavLink to="/search" className={link}>
        <Search size={20} />
        <small>Search</small>
      </NavLink>
      <NavLink to="/cart" className={link}>
        <span className="mnav-badge-wrap">
          <ShoppingCart size={20} />
          {summary.items > 0 && <span className="nav-badge cart-bump">{summary.items}</span>}
        </span>
        <small>Cart</small>
      </NavLink>
      <NavLink to="/orders" className={link}>
        <Package size={20} />
        <small>Orders</small>
      </NavLink>
      <NavLink to="/account" className={link}>
        <span className="mnav-badge-wrap">
          <User size={20} />
          {unread > 0 && <span className="nav-badge">{unread}</span>}
        </span>
        <small>Account</small>
      </NavLink>
    </nav>
  );
}