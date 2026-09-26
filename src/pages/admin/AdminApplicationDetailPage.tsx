import { useState } from "react";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  FileText,
  Landmark,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getSupplierBySlug, reviewApplication, slugify, useApplications } from "../../lib/registry";
import { useToast } from "../../lib/toast";
import { prettyDate } from "../../lib/format";

export default function AdminApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const applications = useApplications();
  const { push } = useToast();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  const app = id ? applications.find((a) => a.id === id) : undefined;

  if (!app) {
    return (
      <div className="stack dash-page">
        <div className="card card-pad faq-empty">
          <ShieldCheck size={34} className="muted" />
          <h3 className="h-card">Application not found</h3>
          <p className="muted small">This KYC application no longer exists.</p>
          <Link to="/admin/applications" className="btn btn-primary" style={{ marginTop: 12 }}>
            Back to KYC queue
          </Link>
        </div>
      </div>
    );
  }

  const liveStore = app.status === "approved" ? getSupplierBySlug(slugify(app.businessName)) : undefined;
  const statusTone: Record<string, string> = {
    pending: "badge-amber",
    approved: "badge-green",
    rejected: "badge-red",
  };

  /**
   * The database is the only record of a decision: it stores the outcome and,
   * on approval, creates the store and grants the role. If the write fails the
   * queue is left exactly as it was.
   */
  async function decide(status: "approved" | "rejected", reason?: string): Promise<void> {
    const result = await reviewApplication(app!.id, status, reason);
    setRejecting(false);
    setNote("");
    if (!result.ok) {
      push({
        title: "Decision not stored",
        message: result.error ?? "The MedLink server rejected the review.",
        icon: "error",
      });
      return;
    }
    push(
      status === "approved"
        ? { title: "Supplier approved", message: "KYC verified — the store is now live on the marketplace.", icon: "success" }
        : { title: "Application rejected", message: "The applicant has been notified of the outcome.", icon: "error" },
    );
  }

  const approve = (): Promise<void> => decide("approved");

  const reject = (): Promise<void> =>
    decide("rejected", note || "KYC documents did not pass verification.");

  return (
    <div className="stack dash-page">
      <Link to="/admin/applications" className="row muted small" style={{ gap: 6, width: "fit-content" }}>
        <ArrowLeft size={14} /> Back to KYC queue
      </Link>

      <div className="card card-pad">
        <div className="row wrap" style={{ gap: 12, justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="row wrap" style={{ gap: 10, alignItems: "center" }}>
              <h2 className="h-section" style={{ margin: 0, fontSize: 22 }}>{app.businessName}</h2>
              <span className={`badge ${statusTone[app.status]}`}>
                {app.status === "pending" ? "Pending review" : app.status === "approved" ? "Approved" : "Rejected"}
              </span>
            </div>
            <div className="xs muted" style={{ marginTop: 4 }}>
              {app.ref} · submitted {prettyDate(app.submittedAt)}
              {app.reviewedAt && ` · reviewed ${prettyDate(app.reviewedAt)}`}
            </div>
          </div>
          <span className="badge badge-navy">{app.categoryFocus}</span>
        </div>

        <div className="kyc-sections" style={{ marginTop: 16 }}>
          <section>
            <h4 className="eyebrow">Business details</h4>
            <div className="kyc-grid">
              <div className="kyc-cell"><Building2 size={15} className="muted" /><span>Type</span><b>{app.businessType}</b></div>
              <div className="kyc-cell"><Calendar size={15} className="muted" /><span>Reg. number</span><b>{app.registrationNumber}</b></div>
              <div className="kyc-cell"><Mail size={15} className="muted" /><span>Email</span><b>{app.email}</b></div>
              <div className="kyc-cell"><Phone size={15} className="muted" /><span>Phone</span><b>{app.phone}</b></div>
              <div className="kyc-cell"><MapPin size={15} className="muted" /><span>Location</span><b>{app.city} · {app.area}</b></div>
              {app.website && <div className="kyc-cell"><FileText size={15} className="muted" /><span>Website</span><b>{app.website}</b></div>}
            </div>
          </section>

          <section>
            <h4 className="eyebrow">Director / owner identity</h4>
            <div className="kyc-grid">
              <div className="kyc-cell"><User size={15} className="muted" /><span>Full name</span><b>{app.directorName}</b></div>
              <div className="kyc-cell"><ShieldCheck size={15} className="muted" /><span>ID type</span><b>{app.directorIdType}</b></div>
              <div className="kyc-cell"><ShieldCheck size={15} className="muted" /><span>ID number</span><b>{app.directorIdNumber}</b></div>
            </div>
          </section>

          <section>
            <h4 className="eyebrow">Submitted documents</h4>
            <div className="stack">
              {app.documents.map((d) => (
                <div key={d.label} className="doc-slot doc-ok">
                  <span className="doc-slot-icon"><FileText size={18} className="green" /></span>
                  <div className="grow">
                    <b className="small">{d.label}</b>
                    <div className="xs muted">{d.name} · {d.size} · uploaded {prettyDate(d.uploadedAt)}</div>
                  </div>
                  {d.url ? (
                    <a className="badge badge-green" href={d.url} target="_blank" rel="noreferrer">
                      <ExternalLink size={13} /> Open file
                    </a>
                  ) : (
                    <span className="badge badge-green"><CheckCircle2 size={13} /> Verified file</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {app.operatingAccount && (
            <section>
              <h4 className="eyebrow">Payout / operating account</h4>
              <div className="kyc-grid">
                <div className="kyc-cell"><Landmark size={15} className="muted" /><span>Bank</span><b>{app.operatingAccount.bankName}</b></div>
                <div className="kyc-cell"><User size={15} className="muted" /><span>Account name</span><b>{app.operatingAccount.accountName}</b></div>
                <div className="kyc-cell"><CreditCard size={15} className="muted" /><span>Account number</span><b>{app.operatingAccount.accountNumber}</b></div>
                {app.operatingAccount.branch && (
                  <div className="kyc-cell"><MapPin size={15} className="muted" /><span>Branch</span><b>{app.operatingAccount.branch}</b></div>
                )}
                {app.operatingAccount.mobileMoney && (
                  <div className="kyc-cell"><Phone size={15} className="muted" /><span>Mobile money</span><b>{app.operatingAccount.mobileMoney}</b></div>
                )}
              </div>
              <p className="xs muted" style={{ marginTop: 8 }}>
                Where MedLink sends released escrow payouts for this supplier.
              </p>
            </section>
          )}

          {app.reviewNote && (
            <section>
              <h4 className="eyebrow">Review note</h4>
              <p className="small" style={{ background: "var(--amber-soft)", padding: "10px 14px", borderRadius: 10 }}>
                {app.reviewNote}
              </p>
            </section>
          )}
        </div>

        {app.status === "pending" ? (
          <div className="kyc-actions" style={{ marginTop: 18 }}>
            {rejecting ? (
              <div className="card" style={{ padding: 14, borderColor: "rgba(225,29,72,0.35)" }}>
                <label className="field">
                  <span>Reason for rejection (optional)</span>
                  <textarea
                    className="input textarea"
                    rows={2}
                    placeholder="e.g. Registration certificate expired. Please resubmit."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </label>
                <div className="row wrap" style={{ gap: 8, marginTop: 10 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => void reject()}>
                    <XCircle size={14} /> Confirm rejection
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => { setRejecting(false); setNote(""); }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="row wrap" style={{ gap: 10 }}>
                <button className="btn btn-primary" onClick={() => void approve()}>
                  <CheckCircle2 size={16} /> Approve & verify supplier
                </button>
                <button className="btn btn-outline" style={{ color: "var(--red)", borderColor: "currentColor" }} onClick={() => setRejecting(true)}>
                  <XCircle size={16} /> Reject application
                </button>
              </div>
            )}
            <p className="xs muted" style={{ marginTop: 10 }}>
              Approving immediately verifies the supplier and publishes their store on the marketplace.
            </p>
          </div>
        ) : (
          <div className="row wrap" style={{ gap: 10, marginTop: 18 }}>
            {liveStore && (
              <Link to={`/suppliers/${liveStore.slug}`} className="btn btn-primary">
                <ExternalLink size={15} /> View live store
              </Link>
            )}
            <Link to="/admin/applications" className="btn btn-outline">
              <ArrowLeft size={15} /> Back to KYC queue
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}