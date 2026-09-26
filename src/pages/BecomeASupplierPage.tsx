import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  Headset,
  Info,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import type { SupplierApplication } from "../data/types";
import { useAuth } from "../lib/auth";
import {
  createSupplierApplication,
  type SupplierApplicationInput,
} from "../lib/onboarding";
import { useToast } from "../lib/toast";
import SupplierKycWizard from "../components/supplier/SupplierKycWizard";

/** The three things a new supplier account needs, and nothing else. */
const kycSteps = [
  { label: "Application submitted", desc: "We create a reference number for your application." },
  { label: "KYC review", desc: "Our team verifies your documents and registration details." },
  { label: "Store live", desc: "You're verified and can start listing products instantly." },
];

export default function BecomeASupplierPage() {
  const { push } = useToast();
  const { signUp } = useAuth();
  const navigate = useNavigate();

  // "form" runs the KYC wizard, "account" asks for the sign-in password the
  // applicant chooses, "confirm" is what an unconfirmed email gets instead.
  const [stage, setStage] = useState<"form" | "account" | "confirm">("form");
  const [draft, setDraft] = useState<SupplierApplicationInput | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [tried, setTried] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<SupplierApplication | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);

  /* -------------------- Step 6: create the account -------------------- */

  const passwordProblem = (): string | null => {
    if (password.trim().length < 6) return "Use at least 6 characters.";
    if (password !== confirm) return "The two passwords do not match.";
    return null;
  };

  async function createAccount(): Promise<void> {
    if (!draft) return;
    const problem = passwordProblem();
    if (problem) {
      setTried(true);
      return;
    }

    setTried(false);
    setSubmitting(true);
    setAccountError(null);

    // 1) Store the KYC application. The server issues the reference the admin
    //    queue works from.
    const backend = await createSupplierApplication(draft);

    if (backend.status !== "submitted") {
      setSubmitting(false);
      push({
        title: "Application not stored",
        message:
          backend.status === "error"
            ? backend.error
            : "The MedLink server is not reachable right now. Please try again shortly.",
        icon: "error",
      });
      return;
    }

    const app = backend.application;
    setDone(app);

    // 2) Create the supplier account with the password they just chose. The
    //    database trigger grants the role and creates the store tenant, so
    //    they can work in the dashboard while the review is pending.
    const created = await signUp({
      name: draft.directorName,
      email: draft.email,
      password: password.trim(),
      role: "supplier",
    });

    setSubmitting(false);

    if (!created.ok) {
      // The application is stored either way; keep the password so a retry
      // does not make them choose it again.
      setAccountError(created.error);
      return;
    }

    if (created.signedIn) {
      push({
        title: "Application submitted",
        message: `Reference ${app.ref} — welcome aboard! Your store goes live as soon as KYC is approved.`,
        icon: "success",
      });
      // The banner takes over from here: no reference number to keep.
      navigate("/supplier", { replace: true });
      return;
    }

    // Email confirmation is on: they have to confirm before they can sign in.
    setStage("confirm");
    push({
      title: "Confirm your email",
      message: created.notice,
      icon: "info",
    });
  }

  /* -------------------- Email confirmation pending -------------------- */
  if (stage === "confirm" && done) {
    return (
      <div className="page apply-page">
        <div className="container" style={{ maxWidth: 720 }}>
          <div className="card card-pad apply-success">
            <span className="success-big">
              <Mail size={44} />
            </span>
            <span className="eyebrow">One step left</span>
            <h1 className="h-display" style={{ fontSize: "clamp(24px,4vw,32px)" }}>Confirm your email to sign in</h1>
            <p className="muted" style={{ maxWidth: 540, marginInline: "auto" }}>
              We sent a confirmation link to <b>{done.email}</b>. Open it, then sign in with the password you
              just chose. Your application is already with our team.
            </p>
            <div className="ref-chip">Reference: <b>{done.ref}</b></div>
            <div className="kyc-track">
              {kycSteps.map((s, i) => (
                <div key={s.label} className={`kyc-step${i === 0 ? " kyc-done" : ""}${i === 1 ? " kyc-current" : ""}`}>
                  <span className="kyc-dot">{i === 0 ? <Check size={14} /> : i + 1}</span>
                  <div>
                    <b className="small">{s.label}</b>
                    <p className="xs muted">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="row wrap" style={{ justifyContent: "center", gap: 12, marginTop: 8 }}>
              <Link to="/signup" className="btn btn-primary">Go to sign in <ArrowRight size={15} /></Link>
              <Link to="/faq" className="btn btn-outline">Read the FAQs</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------- Account setup (step 6) -------------------- */
  if (stage === "account" && draft) {
    return (
      <div className="page apply-page">
        <div className="container apply-body">
          <div className="split apply-layout">
            <div className="card card-pad apply-form">
              <div className="apply-steps">
                <div className="apply-step apply-step-done">
                  <span className="apply-step-dot"><Check size={13} /></span>
                  <span className="apply-step-label">Business</span>
                </div>
                <div className="apply-step apply-step-done">
                  <span className="apply-step-dot"><Check size={13} /></span>
                  <span className="apply-step-label">Documents</span>
                </div>
                <div className="apply-step apply-step-active">
                  <span className="apply-step-dot"><User size={13} /></span>
                  <span className="apply-step-label">Your account</span>
                </div>
              </div>

              <div className="apply-panel">
                <h3 className="h-card row" style={{ gap: 8 }}>
                  <KeyRound size={18} className="teal" /> Create your supplier sign-in
                </h3>
                <p className="small muted" style={{ marginBottom: 14 }}>
                  Choose a password now and your account is ready the moment you submit — no waiting, no
                  reference number to keep. You can use your whole supplier dashboard while MedLink reviews
                  your KYC; only your public storefront waits for approval.
                </p>

                <div className="card card-pad" style={{ background: "var(--bg)", marginBottom: 16 }}>
                  <div className="summary-row"><span>Business</span><b>{draft.businessName}</b></div>
                  <div className="summary-row"><span>Sign-in email</span><b>{draft.email}</b></div>
                  <div className="summary-row"><span>Account name</span><b>{draft.directorName}</b></div>
                </div>

                <label className="field">
                  <span>Password *</span>
                  <input
                    className="input"
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  {tried && password.trim().length < 6 && <em className="field-err">Use at least 6 characters.</em>}
                </label>
                <label className="field">
                  <span>Confirm password *</span>
                  <input
                    className="input"
                    type="password"
                    placeholder="Repeat your password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    aria-label="Confirm password"
                  />
                  {tried && confirm.length > 0 && password !== confirm && (
                    <em className="field-err">The two passwords do not match.</em>
                  )}
                </label>

                {accountError && (
                  <div className="kyc-note card" style={{ borderColor: "#f6c4d0", background: "var(--red-soft)" }}>
                    <Info size={16} style={{ color: "var(--red)" }} />
                    <span className="small">
                      {accountError} Your application was submitted — sign in with this email instead, or use a
                      different one.
                    </span>
                  </div>
                )}
              </div>

              <div className="apply-nav">
                <button className="btn btn-outline" onClick={() => setStage("form")}>
                  <ArrowLeft size={15} /> Back
                </button>
                <div className="grow" />
                <button className="btn btn-primary" disabled={submitting} onClick={() => void createAccount()}>
                  {submitting ? <Loader2 size={15} /> : <ShieldCheck size={15} />} Create account & submit
                </button>
              </div>
            </div>

            <aside className="apply-aside">
              <div className="card card-pad">
                <h3 className="h-card row" style={{ gap: 8 }}>
                  <BadgeCheck size={18} className="teal" /> What happens next
                </h3>
                <div className="kyc-track" style={{ gridTemplateColumns: "1fr" }}>
                  {kycSteps.map((s, i) => (
                    <div key={s.label} className={`kyc-step${i === 0 ? " kyc-done" : ""}${i === 1 ? " kyc-current" : ""}`}>
                      <span className="kyc-dot">{i === 0 ? <Check size={14} /> : i + 1}</span>
                      <div>
                        <b className="small">{s.label}</b>
                        <p className="xs muted">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card card-pad">
                <h3 className="h-card row" style={{ gap: 8 }}>
                  <Headset size={18} className="teal" /> Help along the way
                </h3>
                <div className="row" style={{ gap: 8 }}><Phone size={15} className="muted" /><span className="small">+265 888 000 123</span></div>
                <div className="row" style={{ gap: 8, marginTop: 6 }}><Mail size={15} className="muted" /><span className="small">sellers@medlink.mw</span></div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------- KYC wizard (steps 1-5) -------------------- */
  return (
    <div className="page apply-page">
      <div className="apply-hero">
        <div className="bg-grid-pattern" />
        <div className="container apply-hero-inner">
          <span className="eyebrow">Supplier onboarding</span>
          <h1 className="h-display" style={{ fontSize: "clamp(26px,4.5vw,40px)" }}>Become a MedLink Supplier</h1>
          <p className="muted" style={{ maxWidth: 640, marginInline: "auto" }}>
            Register your business, complete KYC verification, and start selling medical supplies to buyers across Malawi.
          </p>
          <div className="how-row">
            {["Apply online", "KYC verification", "Verified store"].map((t, i) => (
              <span key={t} className="card how-row-chip">
                <b>{i + 1}</b> {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="container apply-body">
        <div className="split apply-layout">
          <SupplierKycWizard
            mode="apply"
            submitting={false}
            onSubmit={(input) => {
              setDraft(input);
              setPassword("");
              setConfirm("");
              setTried(false);
              setAccountError(null);
              setStage("account");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onUploadError={(name, message) => push({ title: "Upload failed", message: `${name} — ${message}`, icon: "error" })}
            onUploadUnavailable={(message) => push({ title: "Uploads unavailable", message, icon: "info" })}
          />

          <aside className="apply-aside">
            <div className="card card-pad">
              <h3 className="h-card row" style={{ gap: 8 }}>
                <BadgeCheck size={18} className="teal" /> Why sell on MedLink?
              </h3>
              <ul className="check-list small">
                <li><Check size={14} className="green" /> Reach hospitals, clinics & pharmacies across Malawi</li>
                <li><Check size={14} className="green" /> MedLink handles checkout, payments and delivery</li>
                <li><Check size={14} className="green" /> No fixed listing fees — pay only when you sell</li>
                <li><Check size={14} className="green" /> 10% marketplace service fee on your sales</li>
                <li><Check size={14} className="green" /> Get paid on time, every time</li>
              </ul>
            </div>
            <div className="card card-pad">
              <h3 className="h-card row" style={{ gap: 8 }}>
                <ShieldCheck size={18} className="teal" /> What's KYC?
              </h3>
              <p className="small muted" style={{ lineHeight: 1.65 }}>
                KYC (Know Your Customer) is how we keep the marketplace trustworthy. Every supplier submits
                business and identity documents so buyers can be sure they're dealing with a real, registered
                medical supplier.
              </p>
            </div>
            <div className="card card-pad">
              <h3 className="h-card row" style={{ gap: 8 }}>
                <Headset size={18} className="teal" /> Help along the way
              </h3>
              <div className="row" style={{ gap: 8 }}><Phone size={15} className="muted" /><span className="small">+265 888 000 123</span></div>
              <div className="row" style={{ gap: 8, marginTop: 6 }}><Mail size={15} className="muted" /><span className="small">sellers@medlink.mw</span></div>
              <p className="xs muted" style={{ marginTop: 8 }}>
                Already applied? <Link to="/faq" className="link">Read the FAQs</Link> or sign in — your KYC
                status is on every page once you do.
              </p>
            </div>
          </aside>
        </div>

        <p className="small muted" style={{ textAlign: "center", marginTop: 24 }}>
          <User size={13} className="muted" style={{ verticalAlign: -2 }} />{" "}
          Already have a store? <Link to="/supplier" className="link">Go to your supplier dashboard</Link>
        </p>
      </div>
    </div>
  );
}
