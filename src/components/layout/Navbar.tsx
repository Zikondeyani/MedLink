import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, LayoutDashboard, LogIn, LogOut, Menu, PackageSearch, Search, ShieldCheck, ShoppingCart, Store, User, X } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useCategories } from "../../lib/registry";
import { useCart } from "../../lib/cart";
import { useNotifications } from "../../lib/notifications";
import { useAuth } from "../../lib/auth";
import Logo from "../ui/Logo";
import SearchBar from "../ui/SearchBar";
import SignInModal from "../auth/SignInModal";
import { initials } from "../../lib/format";

export default function Navbar() {
  const { summary } = useCart();
  const { unread } = useNotifications();
  const cats = useCategories();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);
  const acctRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false);
      if (acctRef.current && !acctRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const navLink = ({ isActive }: { isActive: boolean }) =>
    `nav-link${isActive ? " nav-link-active" : ""}`;

  return (
    <>
    <header className="nav">
      <div className="nav-top">
        <div className="container between">
          <span className="nav-top-msg">
            <PackageSearch size={13} /> Connecting Healthcare. Delivering Better.
          </span>
          <div className="nav-top-links">
            <Link to="/become-a-supplier">Become a supplier</Link>
            <Link to="/orders">Track your order</Link>
            <Link to="/faq">Help & FAQs</Link>
            <Link to="/supplier">Supplier dashboard</Link>
          </div>
        </div>
      </div>

      <div className="nav-main container">
        <Logo />

        <div className="nav-search">
          <SearchBar variant="nav" />
        </div>

        <nav className="nav-links" aria-label="Main">
          <div className="nav-dropdown" ref={catRef}>
            <button className={`nav-link${catOpen ? " nav-link-active" : ""}`} onClick={() => setCatOpen((v) => !v)}>
              Categories <ChevronDown size={14} />
            </button>
            {catOpen && (
              <div className="nav-drop-panel card">
                <div className="nav-drop-grid">
                  {cats.map((c) => (
                    <Link key={c.id} to={`/categories/${c.slug}`} onClick={() => setCatOpen(false)}>
                      <span>{c.name}</span>
                      <small>{c.productCount}</small>
                    </Link>
                  ))}
                </div>
                <Link to="/products" className="nav-drop-all" onClick={() => setCatOpen(false)}>
                  Browse all products →
                </Link>
              </div>
            )}
          </div>
          <NavLink to="/suppliers" className={navLink}>
            Suppliers
          </NavLink>
          <NavLink to="/orders" className={navLink}>
            Orders
          </NavLink>
        </nav>

        <div className="nav-actions">
          <button className="nav-icon-btn nav-search-mobile" aria-label="Search" onClick={() => setMobileSearch((v) => !v)}>
            <Search size={19} />
          </button>

          <Link to="/account?tab=notifications" className="nav-icon-btn" aria-label="Notifications">
            <Bell size={19} />
            {unread > 0 && <span className="nav-badge">{unread}</span>}
          </Link>

          <Link to="/cart" className="nav-icon-btn" aria-label="Cart">
            <ShoppingCart size={19} />
            {summary.items > 0 && (
              <span key={summary.items} className="nav-badge cart-bump">
                {summary.items}
              </span>
            )}
          </Link>

          <div className="nav-dropdown" ref={acctRef}>
            {user ? (
              <>
                <button className="nav-account" onClick={() => setAccountOpen((v) => !v)}>
                  <span className="nav-avatar">{initials(user.name)}</span>
                  <span className="nav-account-name">{user.name.split(" ")[0]}</span>
                  <ChevronDown size={14} className="muted" />
                </button>
                {accountOpen && (
                  <div className="nav-drop-panel card nav-account-panel">
                    <div className="nav-account-head">
                      <b>{user.name}</b>
                      <small className="muted">{user.email}</small>
                    </div>
                    <Link to="/account" onClick={() => setAccountOpen(false)}>
                      <User size={15} /> My account
                    </Link>
                    <Link to="/account?tab=orders" onClick={() => setAccountOpen(false)}>
                      <ShoppingCart size={15} /> My orders
                    </Link>
                    <Link to="/supplier" onClick={() => setAccountOpen(false)}>
                      <LayoutDashboard size={15} /> Supplier dashboard
                    </Link>
                    <Link to="/become-a-supplier" onClick={() => setAccountOpen(false)}>
                      <Store size={15} /> Sell on MedLink
                    </Link>
                    <Link to="/admin" onClick={() => setAccountOpen(false)}>
                      <ShieldCheck size={15} /> Admin
                    </Link>
                    <button
                      className="nav-account-signout"
                      onClick={() => {
                        signOut();
                        setAccountOpen(false);
                      }}
                    >
                      <LogOut size={15} /> Sign out
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button className="nav-account nav-account-signin" onClick={() => setSignInOpen(true)}>
                <LogIn size={16} />
                <span className="nav-account-name">Sign in</span>
              </button>
            )}
          </div>

          <button className="nav-burger" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
            <Menu size={22} />
          </button>
        </div>
      </div>

      {mobileSearch && (
        <div className="nav-mobile-search container">
          <SearchBar
            variant="hero"
            placeholder="Search medical equipment, suppliers..."
            autoFocus
            initial=""
          />
        </div>
      )}

      {/* Mobile menu — dropdown panel under the header (no side drawer) */}
      {mobileOpen && <div className="nav-menu-scrim" onClick={() => setMobileOpen(false)} />}
      {mobileOpen && (
        <div className="nav-menu" role="dialog" aria-modal="true" aria-label="Mobile menu">
          <div className="nav-menu-inner container">
            <div className="nav-menu-head">
              <span className="nav-menu-title">Menu</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X size={20} />
              </button>
            </div>

            <button
              className="nav-menu-search"
              onClick={() => {
                setMobileOpen(false);
                setMobileSearch(true);
              }}
            >
              <Search size={16} /> Search medical equipment...
            </button>

            <nav aria-label="Mobile">
              <Link to="/" onClick={() => setMobileOpen(false)}>
                Home
              </Link>
              <Link to="/products" onClick={() => setMobileOpen(false)}>
                All products
              </Link>
              <Link to="/suppliers" onClick={() => setMobileOpen(false)}>
                Suppliers
              </Link>
              <Link to="/orders" onClick={() => setMobileOpen(false)}>
                Orders
              </Link>
              <Link to="/become-a-supplier" onClick={() => setMobileOpen(false)}>
                Become a supplier
              </Link>
              <Link to="/faq" onClick={() => setMobileOpen(false)}>
                Help & FAQs
              </Link>
              {user ? (
                <Link to="/account" onClick={() => setMobileOpen(false)}>
                  <User size={16} /> My account
                </Link>
              ) : (
                <button
                  className="nav-menu-action"
                  onClick={() => {
                    setMobileOpen(false);
                    setSignInOpen(true);
                  }}
                >
                  <LogIn size={16} /> Sign in
                </button>
              )}
              <Link to="/supplier" onClick={() => setMobileOpen(false)}>
                Supplier dashboard
              </Link>
            </nav>

            <p className="nav-menu-label">Categories</p>
            <div className="nav-menu-cats">
              {cats.map((c) => (
                <Link
                  key={c.id}
                  to={`/categories/${c.slug}`}
                  className="chip"
                  onClick={() => setMobileOpen(false)}
                >
                  {c.name}
                </Link>
              ))}
            </div>

            <Link to="/cart" className="btn btn-primary btn-block nav-menu-cart" onClick={() => setMobileOpen(false)}>
              <ShoppingCart size={16} /> View cart ({summary.items})
            </Link>
          </div>
        </div>
      )}

      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
    </header>
    </>
  );
}