import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  FileText,
  MapPin,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useApplications } from "../../lib/registry";
import { prettyDate } from "../../lib/format";
import type { KycStatus } from "../../data/types";

type Filter = "all" | KycStatus;

const filterChips: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

const statusTone: Record<KycStatus, string> = {
  pending: "badge-amber",
  approved: "badge-green",
  rejected: "badge-red",
};

export default function AdminApplicationsPage() {
  const applications = useApplications();
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(
    () => ({
      all: applications.length,
      pending: applications.filter((a) => a.status === "pending").length,
      approved: applications.filter((a) => a.status === "approved").length,
      rejected: applications.filter((a) => a.status === "rejected").length,
    }),
    [applications],
  );

  const visible = useMemo(
    () => (filter === "all" ? applications : applications.filter((a) => a.status === filter)),
    [applications, filter],
  );

  return (
    <div className="stack dash-page">
      <div className="section-head" style={{ marginBottom: 0 }}>
        <div>
          <span className="eyebrow">Compliance</span>
          <h1 className="h-section">KYC Applications</h1>
          <p className="small muted">
            Review supplier registrations, verify documents and approve stores for the marketplace.
          </p>
        </div>
      </div>

      <div className="row wrap" style={{ gap: 8 }}>
        {filterChips.map((c) => (
          <button
            key={c.id}
            className={`chip${filter === c.id ? " chip-active" : ""}`}
            onClick={() => setFilter(c.id)}
          >
            {c.label} <span className="faq-chip-count">{counts[c.id]}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card card-pad faq-empty">
          <ShieldCheck size={32} className="muted" />
          <h3>Nothing here</h3>
          <p className="muted small">No applications match this filter.</p>
        </div>
      ) : (
        <div className="kyc-grid-list">
          {visible.map((a) => (
            <Link key={a.id} to={`/admin/applications/${a.id}`} className="card kyc-row kyc-row-link">
              <span className="dash-card-icon dash-card-amber" style={{ marginBottom: 0, width: 40, height: 40 }}>
                {a.status === "approved" ? <BadgeCheck size={18} /> : a.status === "rejected" ? <XCircle size={18} /> : <ShieldCheck size={18} />}
              </span>
              <div className="grow">
                <b className="small" style={{ fontSize: 14 }}>{a.businessName}</b>
                <div className="xs muted" style={{ marginTop: 3 }}>
                  {a.ref} · submitted {prettyDate(a.submittedAt)}
                </div>
                <div className="row wrap" style={{ gap: 10, marginTop: 6 }}>
                  <span className="row xs muted" style={{ gap: 5 }}>
                    <Building2 size={12} /> {a.categoryFocus}
                  </span>
                  <span className="row xs muted" style={{ gap: 5 }}>
                    <MapPin size={12} /> {a.city} · {a.area}
                  </span>
                  <span className="row xs muted" style={{ gap: 5 }}>
                    <FileText size={12} /> {a.documents.length} doc{a.documents.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
              <span className={`badge ${statusTone[a.status]}`}>
                {a.status === "pending" ? "Pending" : a.status === "approved" ? "Approved" : "Rejected"}
              </span>
              <ArrowRight size={16} className="muted kyc-row-arrow" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}