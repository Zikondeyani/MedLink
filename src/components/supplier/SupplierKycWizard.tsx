/* ============================================================
   MedLink — the supplier KYC form

   One wizard, two callers:

     • BecomeASupplierPage      an applicant fills this in and, on
       submit, their supplier account is created from the password
       they choose in the next step.
     • SupplierVerificationPage a signed-in supplier whose application
       was rejected reopens the same form pre-filled with what they
       submitted, fixes it and resubmits.

   The form owns the steps, the validation and the document uploads.
   What happens on submit belongs to the caller.
   ============================================================ */
import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Info,
  Landmark,
  Loader2,
  Mail,
  ShieldCheck,
  Upload,
} from "lucide-react";
import type { ApplicationDocument } from "../../data/types";
import { useCategories } from "../../lib/registry";
import { useAuth } from "../../lib/auth";
import type { SupplierApplicationInput } from "../../lib/onboarding";
import {
  applicantOwner,
  formatFileSize,
  uploadFile,
  useUploadOwner,
  KYC_MAX_BYTES,
} from "../../lib/cloudinary";

type Step = 1 | 2 | 3 | 4 | 5;

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

export interface KycFormState {
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

export const emptyKycForm: KycFormState = {
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

export type KycDoc = {
  name: string;
  size: string;
  uploading: boolean;
  /** Cloudinary URL — the path persisted in supplier_applications.documents. */
  url?: string;
  publicId?: string;
  /** Set when the Cloudinary upload failed; blocks the next step. */
  error?: string;
} | null;

const docSlots: { key: string; label: string; hint: string }[] = [
  { key: "reg", label: "Business registration certificate", hint: "Registered with the Registrar of Companies" },
  { key: "tax", label: "Tax clearance certificate", hint: "Current year, issued by MRA" },
  { key: "id", label: "Director ID (front & back)", hint: "National ID, passport or driving licence" },
];

/** Rebuild the form from a stored application so a rejection can be fixed. */
export function kycFormFromApplication(app: {
  businessName: string;
  businessType: string;
  categoryFocus: string;
  website?: string;
  email: string;
  phone: string;
  city: string;
  area: string;
  registrationNumber: string;
  directorName: string;
  directorIdType: string;
  directorIdNumber: string;
  operatingAccount?: { bankName: string; accountName: string; accountNumber: string; branch?: string; mobileMoney?: string };
}): KycFormState {
  return {
    businessName: app.businessName,
    businessType: app.businessType,
    categoryFocus: app.categoryFocus,
    website: app.website ?? "",
    email: app.email,
    phone: app.phone,
    city: app.city,
    area: app.area,
    registrationNumber: app.registrationNumber,
    directorName: app.directorName,
    directorIdType: app.directorIdType,
    directorIdNumber: app.directorIdNumber,
    opBankName: app.operatingAccount?.bankName ?? "",
    opAccountName: app.operatingAccount?.accountName ?? "",
    opAccountNumber: app.operatingAccount?.accountNumber ?? "",
    opBranch: app.operatingAccount?.branch ?? "",
    opMobileMoney: app.operatingAccount?.mobileMoney ?? "",
    // Consent is a fresh declaration for this submission, never carried over.
    consent: false,
  };
}

/** Seed the document slots from what was already uploaded. */
export function kycDocsFromApplication(documents: ApplicationDocument[]): Record<string, KycDoc> {
  const byLabel = new Map(documents.map((d) => [d.label, d]));
  const seed = (key: string): KycDoc => {
    const slot = docSlots.find((s) => s.key === key);
    const found = slot ? byLabel.get(slot.label) : undefined;
    if (!found) return null;
    return {
      name: found.name,
      size: found.size,
      uploading: false,
      ...(found.url ? { url: found.url } : {}),
      ...(found.publicId ? { publicId: found.publicId } : {}),
    };
  };
  return { reg: seed("reg"), tax: seed("tax"), id: seed("id") };
}

/** The document record persisted in supplier_applications.documents (jsonb). */
function docPayload(doc: NonNullable<KycDoc>, label: string): ApplicationDocument {
  return {
    label,
    name: doc.name,
    size: doc.size,
    uploadedAt: new Date().toISOString(),
    ...(doc.url ? { url: doc.url } : {}),
    ...(doc.publicId ? { publicId: doc.publicId } : {}),
  };
}

function UploadSlot({
  slot,
  doc,
  onFile,
}: {
  slot: { key: string; label: string; hint: string };
  doc: KycDoc;
  onFile: (key: string, file: File | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`doc-slot${doc && !doc.error ? " doc-ok" : ""}`}>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        className="doc-file-input"
        aria-label={slot.label}
        onChange={(e) => {
          // Keep the File, then clear so the same file can be re-picked.
          onFile(slot.key, e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <span className="doc-slot-icon">
        {doc?.uploading ? <Loader2 size={18} className="spin" /> : doc && !doc.error ? <CheckCircle2 size={18} className="green" /> : <FileText size={18} />}
      </span>
      <div className="grow">
        <b className="small">{slot.label}</b>
        <div className={`xs ${doc?.error ? "red" : "muted"}`}>
          {doc
            ? doc.error
              ? `${doc.name} · ${doc.size} — ${doc.error}`
              : `${doc.name} · ${doc.size} ${doc.uploading ? "— uploading…" : doc.url ? "— uploaded ✓" : "— added ✓"}`
            : slot.hint}
        </div>
      </div>
      <button type="button" className="btn btn-outline btn-sm" onClick={() => inputRef.current?.click()}>
        {doc ? "Replace" : <><Upload size={14} /> Upload</>}
      </button>
    </div>
  );
}

export interface KycWizardProps {
  /** Pre-fill for a resubmission. */
  initialForm?: KycFormState;
  initialDocs?: Record<string, KycDoc>;
  /** "apply" reads as a first application, "resubmit" as fixing a rejection. */
  mode: "apply" | "resubmit";
  submitting: boolean;
  onSubmit: (input: SupplierApplicationInput) => void;
  /** Raised as toasts by the page; the form only blocks on failure. */
  onUploadError?: (fileName: string, message: string) => void;
  onUploadUnavailable?: (message: string) => void;
}

export default function SupplierKycWizard({
  initialForm,
  initialDocs,
  mode,
  submitting,
  onSubmit,
  onUploadError,
  onUploadUnavailable,
}: KycWizardProps) {
  const categories = useCategories();
  const { user } = useAuth();
  // A signed-in supplier uploads into their own folder; an applicant has no
  // account yet, so their business name and email name it.
  const signedInOwner = useUploadOwner();

  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<KycFormState>(initialForm ?? emptyKycForm);
  const [docs, setDocs] = useState<Record<string, KycDoc>>(
    initialDocs ?? { reg: null, tax: null, id: null },
  );
  const [tried, setTried] = useState(false);

  const set = <K extends keyof KycFormState>(key: K, value: KycFormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleFile(key: string, file: File | undefined) {
    if (!file) return;

    // Some pickers hand over PDFs with an empty MIME type — fall back to the
    // extension so legitimate files are not rejected.
    const accepted =
      ["application/pdf", "image/png", "image/jpeg"].includes(file.type) || /\.(pdf|png|jpe?g)$/i.test(file.name);
    const size = formatFileSize(file.size);

    if (!accepted) {
      setDocs((d) => ({ ...d, [key]: { name: file.name, size, uploading: false, error: "Use a PDF, PNG or JPG file." } }));
      return;
    }

    setDocs((d) => ({ ...d, [key]: { name: file.name, size, uploading: true } }));

    // Multipart POST streams the file from disk straight to Cloudinary — the
    // bytes are never read into JavaScript memory (no base64, no data URLs).
    const result = await uploadFile(file, {
      purpose: "kyc",
      owner: user ? signedInOwner : applicantOwner(form.businessName || "applicant", form.email),
      maxBytes: KYC_MAX_BYTES,
    });

    if (result.ok) {
      setDocs((d) => ({
        ...d,
        [key]: { name: file.name, size, uploading: false, url: result.file.url, publicId: result.file.publicId },
      }));
      return;
    }

    if (result.notConfigured) {
      // Demo mode (no Supabase backend): keep the metadata-only flow so the
      // application can still be submitted end to end.
      setDocs((d) => ({ ...d, [key]: { name: file.name, size, uploading: false } }));
      onUploadUnavailable?.(result.error);
      return;
    }

    setDocs((d) => ({ ...d, [key]: { name: file.name, size, uploading: false, error: result.error } }));
    onUploadError?.(file.name, result.error);
  }

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const resubmit = mode === "resubmit";

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
        return docSlots.some((s) => !docs[s.key] || docs[s.key]?.uploading || docs[s.key]?.error);
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

  function submit(): void {
    if (stepInvalid()) {
      setTried(true);
      return;
    }
    onSubmit({
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
        docPayload(docs.reg!, "Business registration certificate"),
        docPayload(docs.tax!, "Tax clearance certificate"),
        docPayload(docs.id!, "Director ID (front & back)"),
      ],
      operatingAccount: {
        bankName: form.opBankName.trim(),
        accountName: form.opAccountName.trim(),
        accountNumber: form.opAccountNumber.trim(),
        branch: form.opBranch.trim() || undefined,
        mobileMoney: form.opMobileMoney.trim() || undefined,
      },
    });
  }

  return (
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
              {resubmit && !tried && (
                <em className="muted xs" style={{ fontStyle: "normal" }}>
                  This is the email you sign in with, so keep it as it is.
                </em>
              )}
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
              {resubmit && " Anything you already sent is kept — only replace what was wrong."}
            </p>
            <div className="stack">
              {docSlots.map((s) => (
                <UploadSlot key={s.key} slot={s} doc={docs[s.key]} onFile={(k, f) => void handleFile(k, f)} />
              ))}
            </div>
            {tried && docSlots.some((s) => !docs[s.key] || docs[s.key]?.uploading || docs[s.key]?.error) && (
              <p className="small red" style={{ marginTop: 10 }}>
                {docSlots.some((s) => docs[s.key]?.error)
                  ? "Some documents failed to upload — replace them and try again."
                  : "Please upload all three documents."}
              </p>
            )}
          </>
        )}

        {/* Step 5 — review */}
        {step === 5 && (
          <>
            <h3 className="h-card row" style={{ gap: 8 }}>
              <ClipboardCheck size={18} className="teal" /> {resubmit ? "Review & resubmit" : "Review & submit"}
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
          <button className="btn btn-primary" disabled={submitting} onClick={submit}>
            {submitting ? <Loader2 size={15} /> : <ShieldCheck size={15} />}
            {resubmit ? "Resubmit for review" : "Continue to account setup"}
          </button>
        )}
      </div>
    </div>
  );
}
