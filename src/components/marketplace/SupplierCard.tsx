import { ArrowRight, MapPin, Package } from "lucide-react";
import { Link } from "react-router-dom";
import type { Supplier } from "../../data/types";
import { initials } from "../../lib/format";
import VerificationBadge from "../ui/VerificationBadge";

export function SupplierAvatar({ supplier, size = 52 }: { supplier: Supplier; size?: number }) {
  return (
    <span
      className="s-avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `linear-gradient(135deg, ${supplier.color}, #0B1120)`,
        color: "#fff",
      }}
    >
      {initials(supplier.name)}
    </span>
  );
}

export default function SupplierCard({ supplier }: { supplier: Supplier }) {
  return (
    <article className="card card-hover scard" style={{ overflow: "hidden" }}>
      <div
        className="scard-banner"
        style={{ background: `linear-gradient(120deg, ${supplier.bannerGradient[0]}, ${supplier.bannerGradient[1]})` }}
      >
        <div className="bg-grid-pattern" />
        <div className="scard-banner-art" />
        <span className="scard-verify">
          <VerificationBadge verified={supplier.verified} label={supplier.verified ? "Verified" : "Partner"} />
        </span>
      </div>

      <div className="scard-body">
        <div className="scard-head">
          <SupplierAvatar supplier={supplier} size={56} />
          <div className="scard-title">
            <Link to={`/suppliers/${supplier.slug}`} className="scard-name">
              {supplier.name}
            </Link>
            <span className="scard-cat muted small">{supplier.category}</span>
          </div>
          <Link to={`/suppliers/${supplier.slug}`} className="scard-go" aria-label={`Visit ${supplier.name}`}>
            <ArrowRight size={17} />
          </Link>
        </div>

        <div className="scard-meta">
          <span className="scard-meta-item">
            <Package size={14} /> {supplier.productCount} products
          </span>
          <span className="scard-meta-item">
            <MapPin size={14} /> {supplier.location.city}
          </span>
        </div>

        <Link to={`/suppliers/${supplier.slug}`} className="scard-link">
          Visit store <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}