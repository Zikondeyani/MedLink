import { Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { useCategories } from "../../lib/registry";
import { useAuth } from "../../lib/auth";
import Logo from "../ui/Logo";

export default function Footer() {
  const cats = useCategories();
  const { user } = useAuth();

  const privateFooterLinks =
    user?.role === "supplier"
      ? [
          { to: "/supplier", label: "Supplier dashboard" },
          { to: "/supplier/products", label: "Your products" },
          { to: "/supplier/orders", label: "Incoming orders" },
          { to: "/supplier/notifications", label: "Notifications" },
        ]
      : user?.role === "admin"
        ? [
            { to: "/admin", label: "Admin dashboard" },
            { to: "/admin/applications", label: "KYC applications" },
            { to: "/admin/transactions", label: "Transactions" },
            { to: "/admin/notifications", label: "Notifications" },
          ]
        : [];
  return (
    <footer className="footer">
      <span className="footer-wordmark" aria-hidden="true">MEDLINK</span>
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Logo size={40} light />
            <p className="small muted">
              Connecting Healthcare. Delivering Better.
              <br />
              The medical supplies and equipment marketplace for Malawi and beyond.
            </p>
            <div className="footer-social">
              <a href="#" aria-label="WhatsApp">WhatsApp</a>
              <a href="#" aria-label="Facebook">Facebook</a>
              <a href="#" aria-label="Instagram">Instagram</a>
              <a href="#" aria-label="X (Twitter)">X</a>
            </div>
          </div>

          <div>
            <h4>Marketplace</h4>
            <ul>
              <li><Link to="/products">All products</Link></li>
              <li><Link to="/suppliers">Explore suppliers</Link></li>
              <li><Link to="/categories">All categories</Link></li>
              <li><Link to="/faq">Help & FAQs</Link></li>
            </ul>
          </div>

          <div>
            <h4>Categories</h4>
            <ul>
              {cats.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link to={`/categories/${c.slug}`}>{c.name}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4>{user?.role === "admin" ? "Platform admin" : "For suppliers"}</h4>
            <ul>
              {user?.role !== "supplier" && (
                <li><Link to="/become-a-supplier">Apply to sell</Link></li>
              )}
              {privateFooterLinks.map((link) => (
                <li key={link.to}><Link to={link.to}>{link.label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h4>Contact</h4>
            <ul className="footer-contact">
              <li><Phone size={15} /> +265 888 000 123</li>
              <li><Mail size={15} /> hello@medlink.mw</li>
              <li><MapPin size={15} /> Lilongwe, Malawi</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span className="small muted">© 2026 MedLink Marketplace. All rights reserved.</span>
          <span className="footer-trust small muted">
            <Link to="/faq">FAQs</Link> · <Link to="/become-a-supplier">Sell on MedLink</Link>
            {user && (
              <>
                {" · "}
                <Link to={user.role === "customer" ? "/account" : user.role === "supplier" ? "/supplier" : "/admin"}>
                  {user.role === "customer" ? "My account" : user.role === "supplier" ? "Supplier dashboard" : "Admin"}
                </Link>
              </>
            )}
          </span>
        </div>
      </div>
    </footer>
  );
}