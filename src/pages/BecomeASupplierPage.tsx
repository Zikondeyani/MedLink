import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Headset,
  Info,
  Landmark,
  Loader2,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  Upload,
  User,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { KycStatus, SupplierApplication } from "../data/types";
import { useApplications, submitSupplierApplication, useCategories } from "../lib/registry";
import { useAuth } from "../lib/auth";
import {
  createSupplierApplication,
  lookupApplicationStatus,
  type SupplierApplicationInput,
} from "../lib/onboarding";
import { useToast } from "../lib/toast";
import { shortDate } from "../lib/format";

type Step = 1 | 2 | 3 | 4 | 5;

/** What the "check your status" box shows — resolved from either backend. */
type StatusView = {
  businessName: string;
  ref: string;
  status: KycStatus;
  submittedAt: string;
  reviewNote?: string;
};

/**
 * One-time sign-in password issued with a new supplier account. Random per
 * applicant (never a shared constant) and shown once on the success screen.
 */
function generateSupplierPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint32Array(14);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (n) => alphabet[n % alphabet.length]).join("");
}

const stepTitles: { n: Step; label: string }[] = [
  { n: 1, label: "Business" },
  { n: 2, label: "Contact" },
  { n: 3, label: "KYC" },
  { n: 4, label: "Documents" },
  { n: 5, label: "Review" },
];

const businessTypes = [
  "Distributor / Wholesaler",
  "Manufacturer / Importer",
  "Pharmacy / Retail",
  "Laboratory & Diagnostics",
  "Importer",
  "Other",
];

const directorIdTypes = ["National ID", "Passport", "Driving Licence"];

const cities = ["Lilongwe", "Blantyre", "Mzuzu", "Zomba", "Karonga", "Mangochi", "Salima", "Kasungu"];

interface FormState {
  businessName: string;
  businessType: string;
  categoryFocus: string;
  website: string;
  email: string;
  phone: string;
  city: string;
  area: string;
  registrationNumber: string;
  directorName: string;
  directorIdType: string;
  directorIdNumber: string;
  /** where MedLink sends your supplier payouts once escrowed sales are released */
  opBankName: string;
  opAccountName: string;
  opAccountNumber: string;
  opBranch: string;
  opMobileMoney: string;
  consent: boolean;
}

const emptyForm: FormState = {
  businessName: "",
  businessType: "",
  categoryFocus: "",
  website: "",
  email: "",
  phone: "",
  city: "",
  area: "",
  registrationNumber: "",
  directorName: "",
  directorIdType: "",
  directorIdNumber: "",
  opBankName: "",
  opAccountName: "",
  opAccountNumber: "",
  opBranch: "",
  opMobileMoney: "",
  consent: false,
};

type Doc = { name: string; size: string; uploading: boolean } | null;

const docSlots: { key: string; label: string; hint: string }[] = [
  { key: "reg", label: "Business registration certificate", hint: "Registered with the Registrar of Companies" },
  { key: "tax", label: "Tax clearance certificate", hint: "Current year, issued by MRA" },
  { key: "id", label: "Director ID (front & back)", hint: "National ID, passport or driving licence" },
];

const kycSteps = [
  { label: "Application submitted", desc: "We create a reference number for your application." },
  { label: "KYC review", desc: "Our team verifies your documents and registration details." },
  { label: "Store live", desc: "You're verified and can start listing products instantly." },
];

function UploadSlot({
  slot,
  doc,
  onFile,
}: {
  slot: { key: string; label: string; hint: string };
  doc: Doc;
  onFile: (key: string, file: File | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`doc-slot${doc ? " doc-ok" : ""}`}>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        className="doc-file-input"
        aria-label={slot.label}
        onChange={(e) => onFile(slot.key, e.target.files?.[0])}
      />
      <span className="doc-slot-icon">
        {doc?.uploading ? <Loader2 size={18} className="spin" /> : doc ? <CheckCircle2 size={18} className="green" /> : <FileText size={18} />}
      </span>
      <div className="grow">
        <b className="small">{slot.label}</b>
        <div className="xs muted">{doc ? `${doc.name} · ${doc.size} ${doc.uploading ? "— uploading…" : "— uploaded ✓"}` : slot.hint}</div>
      </div>
      <button type="button" className="btn btn-outline btn-sm" onClick={() => inputRef.current?.click()}>
        {doc ? "Replace" : <><Upload size={14} /> Upload</>}
      </button>
    </div>
  );
}

export default function BecomeASupplierPage() {
  const categories = useCategories();
  const applications = useApplications();
  const { push } = useToast();
  const { signUp } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [docs, setDocs] = useState<Record<string, Doc>>({ reg: null, tax: null, id: null });
  const [done, setDone] = useState<SupplierApplication | null>(null);
  const [createdAccount, setCreatedAccount] = useState<{ email: string; password: string } | null>(null);
  const [tried, setTried] = useState(false);
  const [refInput, setRefInput] = useState("");
  const [checkedApp, setCheckedApp] = useState<StatusView | "notfound" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function handleFile(key: string, file: File | undefined) {
    if (!file) return;
    const size =
      file.size >= 1_048_576
        ? `${(file.size / 1_048_576).toFixed(1)} MB`
        : `${Math.max(1, Math.round(file.size / 1024))} KB`;
    setDocs((d) => ({ ...d, [key]: { name: file.name, size, uploading: true } }));
    window.setTimeout(() => {
      setDocs((d) => {
        const cur = d[key];
        if (!cur) return d;
        return { ...d, [key]: { ...cur, uploading: false } };
      });
    }, 900);
  }

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);

  function stepInvalid(): boolean {
    switch (step) {
      case 1:
        return !form.businessName.trim() || !form.businessType || !form.categoryFocus;
      case 2:
        return !emailOk || form.phone.trim().length < 9 || !form.city || !form.area.trim();
      case 3:
        return (
          !form.registrationNumber.trim() ||
          !form.directorName.trim() ||
          !form.directorIdType ||
          !form.directorIdNumber.trim() ||
          !form.opBankName.trim() ||
          !form.opAccountName.trim() ||
          !form.opAccountNumber.trim()
        );
      case 4:
        return docSlots.some((s) => !docs[s.key] || docs[s.key]?.uploading);
      case 5:
        return !form.consent;
    }
  }

  function next(): void {
    if (stepInvalid()) {
      setTried(true);
      return;
    }
    setTried(false);
    setStep((s) => Math.min(5, s + 1) as Step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(): Promise<void> {
    if (stepInvalid()) {
      setTried(true);
      return;
    }
    const input: SupplierApplicationInput = {
      businessName: form.businessName.trim(),
      businessType: form.businessType,
      categoryFocus: form.categoryFocus,
      website: form.website.trim() || undefined,
      email: form.email.trim(),
      phone: form.phone.trim(),
      city: form.city,
      area: form.area.trim(),
      registrationNumber: form.registrationNumber.trim(),
      directorName: form.directorName.trim(),
      directorIdType: form.directorIdType,
      directorIdNumber: form.directorIdNumber.trim(),
      documents: [
        { label: "Business registration certificate", name: docs.reg!.name, size: docs.reg!.size, uploadedAt: new Date().toISOString() },
        { label: "Tax clearance certificate", name: docs.tax!.name, size: docs.tax!.size, uploadedAt: new Date().toISOString() },
        { label: "Director ID (front & back)", name: docs.id!.name, size: docs.id!.size, uploadedAt: new Date().toISOString() },
      ],
      operatingAccount: {
        bankName: form.opBankName.trim(),
        accountName: form.opAccountName.trim(),
        accountNumber: form.opAccountNumber.trim(),
        branch: form.opBranch.trim() || undefined,
        mobileMoney: form.opMobileMoney.trim() || undefined,
      },
    };

    setSubmitting(true);

    // 1) Store the KYC application. With a Supabase project configured this is a
    //    real insert (the public form is allowed by RLS). The reference the
    //    server issues is reused below so an admin review finds the same row.
    const backend = await createSupplierApplication(input);
    const app = submitSupplierApplication(
      input,
      backend.status === "submitted" ? backend.ref : undefined,
    );

    setDone(app);
    setCheckedApp(null);

    // 2) Create the supplier sign-in account. Applying as a supplier is what
    //    sets the role (stored by the database trigger); the marketplace tenant
    //    is attached when an administrator approves the KYC.
    const password = generateSupplierPassword();
    const created = await signUp({
      name: form.directorName.trim(),
      email: form.email.trim(),
      password,
      role: "supplier",
    });

    setSubmitting(false);

    if (created.ok && created.signedIn) {
      setCreatedAccount({ email: created.user.email, password });
      push({
        title: "Application submitted",
        message: `Reference ${app.ref} — welcome aboard, ${form.directorName.trim().split(" ")[0]}! Your supplier account is ready and KYC review takes 2–3 working days.`,
        icon: "success",
      });
    } else if (created.ok) {
      setCreatedAccount(null);
      push({ title: "Application submitted", message: `Reference ${app.ref} — ${created.notice}`, icon: "info" });
    } else {
      setCreatedAccount(null);
      push({ title: "Application submitted", message: `Reference ${app.ref} — our team will review your KYC within 2–3 working days.`, icon: "success" });
    }

    if (backend.status === "error") {
      push({
        title: "Saved in this browser only",
        message: `Reference ${app.ref} could not be stored on the MedLink server: ${backend.error}`,
        icon: "error",
      });
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function checkStatus(): Promise<void> {
    const term = refInput.trim().toUpperCase();
    if (!term) return;

    // Prefer the server record, then fall back to this browser's registry.
    const remote = await lookupApplicationStatus(term);
    if (remote.status === "found") {
      const found: StatusView = {
        businessName: remote.application.businessName,
        ref: remote.application.ref,
        status: remote.application.status,
        submittedAt: remote.application.submittedAt,
      };
      if (remote.application.reviewNote) found.reviewNote = remote.application.reviewNote;
      setCheckedApp(found);
      return;
    }
    if (remote.status === "error") {
      push({ title: "Could not check that reference", message: remote.error, icon: "error" });
    }

    const local = applications.find((a) => a.ref.toUpperCase() === term);
    if (!local) {
      setCheckedApp("notfound");
      return;
    }
    const found: StatusView = {
      businessName: local.businessName,
      ref: local.ref,
      status: local.status,
      submittedAt: local.submittedAt,
    };
    if (local.reviewNote) found.reviewNote = local.reviewNote;
    setCheckedApp(found);
  }

  const statusTone = (status: SupplierApplication["status"]) =>
    status === "approved" ? "badge-green" : status === "rejected" ? "badge-red" : "badge-amber";
  const statusLabel = (status: SupplierApplication["status"]) =>
    status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Pending review";

  /* -------------------- Success view -------------------- */
  if (done) {
    return (
      <div className="page apply-page">
        <div className="container" style={{ maxWidth: 860 }}>
          <div className="card card-pad apply-success">
            <span className="success-big">
              <BadgeCheck size={44} />
            </span>
            <span className="eyebrow">Application received</span>
            <h1 className="h-display" style={{ fontSize: "clamp(24px,4vw,34px)" }}>Thank you — you're almost in!</h1>
            <p className="muted" style={{ maxWidth: 560, marginInline: "auto" }}>
              Your supplier application has been submitted. Keep your reference number safe — you'll need it to
              check your KYC status.
            </p>
            <div className="ref-chip">Reference: <b>{done.ref}</b></div>

            {createdAccount && (
              <div className="card credentials-card" style={{ maxWidth: 460, margin: "16px auto 0", textAlign: "left" }}>
                <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                  <User size={16} className="teal" />
                  <b className="small">Your supplier sign-in is ready</b>
                </div>
                <p className="xs muted" style={{ marginBottom: 10 }}>
                  We created a supplier account so you can track your store once KYC is approved. Sign in with the
                  details below on any MedLink page.
                </p>
                <div className="credentials-row"><span>Email</span><b>{createdAccount.email}</b></div>
                <div className="credentials-row"><span>Temporary password</span><b>{createdAccount.password}</b></div>
                <Link to="/supplier" className="btn btn-primary btn-block" style={{ marginTop: 12 }}>
                  Go to supplier dashboard <ArrowRight size={15} />
                </Link>
              </div>
            )}

            <div className="kyc-track">
              {kycSteps.map((s, i) => {
                const isDone = i === 0;
                const isActive = i === 1;
                return (
                  <div key={s.label} className={`kyc-step${isDone ? " kyc-done" : ""}${isActive ? " kyc-current" : ""}`}>
                    <span className="kyc-dot">{isDone ? <Check size={14} /> : i + 1}</span>
                    <div>
                      <b className="small">{s.label}</b>
                      <p className="xs muted">{s.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="row wrap" style={{ justifyContent: "center", gap: 12, marginTop: 8 }}>
              <Link to="/products" className="btn btn-primary">Browse the marketplace</Link>
              <Link to="/faq" className="btn btn-outline">Read the FAQs</Link>
            </div>
          </div>

          <div className="card card-pad apply-status-check" style={{ marginTop: 20 }}>
            <div className="row" style={{ gap: 10, marginBottom: 6 }}>
              <Search size={17} className="muted" />
              <h3 className="h-card">Check your application status</h3>
            </div>
            <p className="small muted" style={{ marginBottom: 14 }}>
              Enter your reference number — e.g. <b>{done.ref}</b>
            </p>
            <div className="row wrap" style={{ gap: 10 }}>
              <input
                className="input"
                style={{ maxWidth: 260 }}
                placeholder="APL-2026-XXX"
                value={refInput}
                onChange={(e) => setRefInput(e.target.value)}
                aria-label="Application reference"
              />
              <button className="btn btn-primary" onClick={() => void checkStatus()}>Check status</button>
            </div>
            {checkedApp === "notfound" && (
              <p className="small red" style={{ marginTop: 10 }}>No application found with that reference.</p>
            )}
            {checkedApp && checkedApp !== "notfound" && (
              <div className="status-result card" style={{ marginTop: 14 }}>
                <div className="row wrap" style={{ gap: 10, justifyContent: "space-between" }}>
                  <div>
                    <div className="small semibold">{checkedApp.businessName}</div>
                    <div className="xs muted">Submitted {shortDate(checkedApp.submittedAt)} · {checkedApp.ref}</div>
                  </div>
                  <span className={`badge ${statusTone(checkedApp.status)}`}>{statusLabel(checkedApp.status)}</span>
                </div>
                {checkedApp.reviewNote && (
                  <p className="small muted" style={{ marginTop: 10 }}>Note: {checkedApp.reviewNote}</p>
                )}
              </div>
            )}
          </div>

          <div className="apply-aside-row">
            <Link to="/supplier" className="btn btn-outline">
              <ArrowLeft size={15} /> Back to marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------- Wizard view -------------------- */
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
          {/* ---------- Form ---------- */}
          <div className="card card-pad apply-form">
            <div className="apply-steps">
              {stepTitles.map((s) => (
                <div key={s.n} className={`apply-step${step === s.n ? " apply-step-active" : ""}${step > s.n ? " apply-step-done" : ""}`}>
                  <span className="apply-step-dot">{step > s.n ? <Check size={13} /> : s.n}</span>
                  <span className="apply-step-label">{s.label}</span>
                </div>
              ))}
            </div>

            <div className="apply-panel" key={step}>
              {/* Step 1 — business */}
              {step === 1 && (
                <>
                  <h3 className="h-card row" style={{ gap: 8 }}>
                    <Building2 size={18} className="teal" /> Tell us about your business
                  </h3>
                  <label className="field">
                    <span>Business name *</span>
                    <input className="input" placeholder="e.g. Mzuzu Medical Distributors" value={form.businessName}
                      onChange={(e) => set("businessName", e.target.value)} />
                  </label>
                  <label className="field">
                    <span>Business type *</span>
                    <select className="select" value={form.businessType}
                      onChange={(e) => set("businessType", e.target.value)}>
                      <option value="">Select a business type…</option>
                      {businessTypes.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span>Main product category *</span>
                    <select className="select" value={form.categoryFocus}
                      onChange={(e) => set("categoryFocus", e.target.value)}>
                      <option value="">Select the category you sell in…</option>
                      {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span>Website <em className="muted">(optional)</em></span>
                    <input className="input" placeholder="yourbusiness.mw" value={form.website}
                      onChange={(e) => set("website", e.target.value)} />
                  </label>
                </>
              )}

              {/* Step 2 — contact */}
              {step === 2 && (
                <>
                  <h3 className="h-card row" style={{ gap: 8 }}>
                    <Mail size={18} className="teal" /> Contact & location
                  </h3>
                  <label className="field">
                    <span>Business email *</span>
                    <input className="input" type="email" placeholder="sales@yourbusiness.mw" value={form.email}
                      onChange={(e) => set("email", e.target.value)} />
                    {tried && !emailOk && <em className="field-err">Enter a valid email address.</em>}
                  </label>
                  <label className="field">
                    <span>Phone number *</span>
                    <input className="input" placeholder="+265 99X XXX XXX" value={form.phone}
                      onChange={(e) => set("phone", e.target.value)} />
                    {tried && form.phone.trim().length < 9 && <em className="field-err">Enter a valid phone number.</em>}
                  </label>
                  <div className="split field-split">
                    <label className="field">
                      <span>City *</span>
                      <select className="select" value={form.city} onChange={(e) => set("city", e.target.value)}>
                        <option value="">Select city…</option>
                        {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </label>
                    <label className="field">
                      <span>Area / township *</span>
                      <input className="input" placeholder="e.g. Kanengo" value={form.area}
                        onChange={(e) => set("area", e.target.value)} />
                    </label>
                  </div>
                </>
              )}

              {/* Step 3 — KYC */}
              {step === 3 && (
                <>
                  <h3 className="h-card row" style={{ gap: 8 }}>
                    <ShieldCheck size={18} className="teal" /> KYC & registration
                  </h3>
                  <div className="kyc-note card">
                    <Info size={16} className="teal" />
                    <span className="small">
                      MedLink verifies every supplier before they go live. These details and your documents are
                      reviewed by our compliance team.
                    </span>
                  </div>
                  <label className="field">
                    <span>Business registration number *</span>
                    <input className="input" placeholder="e.g. MLR-2024-01874" value={form.registrationNumber}
                      onChange={(e) => set("registrationNumber", e.target.value)} />
                  </label>
                  <label className="field">
                    <span>Director / owner full name *</span>
                    <input className="input" placeholder="Full legal name" value={form.directorName}
                      onChange={(e) => set("directorName", e.target.value)} />
                  </label>
                  <div className="split field-split">
                    <label className="field">
                      <span>ID type *</span>
                      <select className="select" value={form.directorIdType}
                        onChange={(e) => set("directorIdType", e.target.value)}>
                        <option value="">Select…</option>
                        {directorIdTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </label>
                    <label className="field">
                      <span>ID number *</span>
                      <input className="input" placeholder="ID / passport number" value={form.directorIdNumber}
                        onChange={(e) => set("directorIdNumber", e.target.value)} />
                    </label>
                  </div>

                  {/* Operating / payout account — where MedLink sends released escrow payouts */}
                  <div className="op-fieldset">
                    <h4 className="h-card row" style={{ gap: 8, marginTop: 6 }}>
                      <Landmark size={17} className="teal" /> Operating account (payouts)
                    </h4>
                    <p className="small muted" style={{ marginBottom: 12 }}>
                      Customer payments are held by MedLink until delivery is confirmed, then we release the sale to
                      your operating account below. This protects buyers and keeps your cash-flow predictable.
                    </p>
                    <div className="split field-split">
                      <label className="field">
                        <span>Bank name *</span>
                        <input className="input" placeholder="e.g. National Bank of Malawi" value={form.opBankName}
                          onChange={(e) => set("opBankName", e.target.value)} />
                      </label>
                      <label className="field">
                        <span>Branch / city *</span>
                        <input className="input" placeholder="Branch (e.g. Capital City)" value={form.opBranch}
                          onChange={(e) => set("opBranch", e.target.value)} />
                      </label>
                    </div>
                    <label className="field">
                      <span>Account holder name *</span>
                      <input className="input" placeholder="Operating account name" value={form.opAccountName}
                        onChange={(e) => set("opAccountName", e.target.value)} />
                    </label>
                    <label className="field">
                      <span>Account number *</span>
                      <input className="input" placeholder="Operating account number" value={form.opAccountNumber}
                        onChange={(e) => set("opAccountNumber", e.target.value)} />
                    </label>
                    <label className="field">
                      <span>Mobile money operating line (optional)</span>
                      <input className="input" placeholder="e.g. Mpamba / Airtel Money number" value={form.opMobileMoney}
                        onChange={(e) => set("opMobileMoney", e.target.value)} />
                    </label>
                  </div>
                </>
              )}

              {/* Step 4 — documents */}
              {step === 4 && (
                <>
                  <h3 className="h-card row" style={{ gap: 8 }}>
                    <Upload size={18} className="teal" /> Upload your KYC documents
                  </h3>
                  <p className="small muted" style={{ marginBottom: 14 }}>
                    PDF, PNG or JPG (max 5 MB each). Documents are stored securely and only seen by the MedLink
                    compliance team.
                  </p>
                  <div className="stack">
                    {docSlots.map((s) => (
                      <UploadSlot key={s.key} slot={s} doc={docs[s.key]} onFile={handleFile} />
                    ))}
                  </div>
                  {tried && docSlots.some((s) => !docs[s.key] || docs[s.key]?.uploading) && (
                    <p className="small red" style={{ marginTop: 10 }}>Please upload all three documents.</p>
                  )}
                </>
              )}

              {/* Step 5 — review */}
              {step === 5 && (
                <>
                  <h3 className="h-card row" style={{ gap: 8 }}>
                    <ClipboardCheck size={18} className="teal" /> Review & submit
                  </h3>
                  <p className="small muted" style={{ marginBottom: 14 }}>
                    Confirm the details below are correct before submitting. You can go back to fix anything.
                  </p>
                  <div className="review-grid card">
                    <div className="review-col">
                      <span className="eyebrow">Business</span>
                      <div className="summary-row"><span>Name</span><b>{form.businessName}</b></div>
                      <div className="summary-row"><span>Type</span><b>{form.businessType}</b></div>
                      <div className="summary-row"><span>Category</span><b>{form.categoryFocus}</b></div>
                      {form.website && <div className="summary-row"><span>Website</span><b>{form.website}</b></div>}
                    </div>
                    <div className="review-col">
                      <span className="eyebrow">Contact</span>
                      <div className="summary-row"><span>Email</span><b>{form.email}</b></div>
                      <div className="summary-row"><span>Phone</span><b>{form.phone}</b></div>
                      <div className="summary-row"><span>Location</span><b>{form.city} · {form.area}</b></div>
                    </div>
                    <div className="review-col">
                      <span className="eyebrow">KYC</span>
                      <div className="summary-row"><span>Reg. number</span><b>{form.registrationNumber}</b></div>
                      <div className="summary-row"><span>Director</span><b>{form.directorName}</b></div>
                      <div className="summary-row"><span>ID</span><b>{form.directorIdType} · {form.directorIdNumber}</b></div>
                    </div>
                    <div className="review-col">
                      <span className="eyebrow">Documents</span>
                      {docSlots.map((s) => (
                        <div key={s.key} className="summary-row">
                          <span>{s.label}</span>
                          <b className="row" style={{ gap: 4 }}><CheckCircle2 size={13} className="green" /> {docs[s.key]?.name}</b>
                        </div>
                      ))}
                    </div>
                  </div>
                  <label className="consent-row">
                    <input type="checkbox" checked={form.consent}
                      onChange={(e) => set("consent", e.target.checked)} />
                    <span className="small">
                      I confirm the information provided is accurate and consent to MedLink performing KYC checks on
                      my business and director identity. I understand false information will result in rejection.
                    </span>
                  </label>
                  {tried && !form.consent && <p className="small red">Please accept the declaration to submit.</p>}
                </>
              )}
            </div>

            <div className="apply-nav">
              {step > 1 && (
                <button className="btn btn-outline" onClick={() => setStep((s) => (s - 1) as Step)}>
                  <ArrowLeft size={15} /> Back
                </button>
              )}
              <div className="grow" />
              {step < 5 ? (
                <button className="btn btn-primary" onClick={next}>
                  Continue <ArrowRight size={15} />
                </button>
              ) : (
                <button className="btn btn-primary" disabled={submitting} onClick={() => void submit()}>
                  {submitting ? <Loader2 size={15} /> : <ShieldCheck size={15} />} Submit application
                </button>
              )}
            </div>
          </div>

          {/* ---------- Aside ---------- */}
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
                Already applied? <Link to="/faq" className="link">Read the FAQs</Link> or check your status with
                your reference number.
              </p>
            </div>
          </aside>
        </div>

        {/* Status check (always available) */}
        <div className="card card-pad apply-status-check" style={{ marginTop: 20 }}>
          <div className="row" style={{ gap: 10, marginBottom: 6 }}>
            <Search size={17} className="muted" />
            <h3 className="h-card">Already applied? Check your application status</h3>
          </div>
          <p className="small muted" style={{ marginBottom: 14 }}>Enter the reference number you received after submitting.</p>
          <div className="row wrap" style={{ gap: 10 }}>
            <input
              className="input"
              style={{ maxWidth: 240 }}
              placeholder="APL-2026-XXX"
              value={refInput}
              onChange={(e) => setRefInput(e.target.value)}
              aria-label="Application reference"
            />
            <button className="btn btn-primary" onClick={() => void checkStatus()}>Check status</button>
          </div>
          {checkedApp === "notfound" && (
            <p className="small red" style={{ marginTop: 10 }}>No application found with that reference.</p>
          )}
          {checkedApp && checkedApp !== "notfound" && (
            <div className="status-result card" style={{ marginTop: 14 }}>
              <div className="row wrap" style={{ gap: 10, justifyContent: "space-between" }}>
                <div>
                  <div className="small semibold">{checkedApp.businessName}</div>
                  <div className="xs muted">Submitted {shortDate(checkedApp.submittedAt)} · {checkedApp.ref}</div>
                </div>
                <span className={`badge ${statusTone(checkedApp.status)}`}>{statusLabel(checkedApp.status)}</span>
              </div>
              {checkedApp.reviewNote && (
                <p className="small muted" style={{ marginTop: 10 }}>Note: {checkedApp.reviewNote}</p>
              )}
            </div>
          )}
        </div>

        <p className="small muted" style={{ textAlign: "center", marginTop: 24 }}>
          <User size={13} className="muted" style={{ verticalAlign: -2 }} />{" "}
          Already have a store? <Link to="/supplier" className="link">Go to your supplier dashboard</Link>
        </p>
      </div>
    </div>
  );
}