import { Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { useCategories } from "../../lib/registry";
import Logo from "../ui/Logo";

export default function Footer() {
  const cats = useCategories();
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
            <h4>For suppliers</h4>
            <ul>
              <li><Link to="/become-a-supplier">Apply to sell</Link></li>
              <li><Link to="/supplier">Supplier dashboard</Link></li>
              <li><Link to="/supplier/products">Your products</Link></li>
              <li><Link to="/supplier/orders">Incoming orders</Link></li>
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
            <Link to="/faq">FAQs</Link> · <Link to="/become-a-supplier">Sell on MedLink</Link> ·{" "}
            <Link to="/admin">Admin</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}