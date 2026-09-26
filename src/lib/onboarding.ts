/* ============================================================
   MedLink — supplier onboarding (KYC) backend
   The wire between the two sides of the supplier role:
     • BecomeASupplierPage submits an application  → INSERT (public form)
     • AdminApplications pages review it          → admin RPC
     • /become-a-supplier "check status" box      → ref lookup RPC

   Every function is a no-op returning `{ status: "skipped" }` when no
   Supabase project is configured, so the pages fall back to the local
   registry and the demo keeps working end to end.
   ============================================================ */
import { toApplication } from "./db";
import { slugify } from "./registry";
import { supabase } from "./supabase";
import type { ApplicationStatusRow, KycStatus } from "./database.types";
import type { SupplierApplication } from "../data/types";

/** Everything a new application carries before the backend assigns id/ref. */
export type SupplierApplicationInput = Omit<SupplierApplication, "id" | "ref" | "status" | "submittedAt">;

export type ApplicationSubmitResult =
  | { status: "submitted"; application: SupplierApplication }
  | { status: "skipped" }
  | { status: "error"; error: string };

export type ApplicationReviewResult =
  | { status: "reviewed" }
  | { status: "skipped" }
  | { status: "error"; error: string };

export interface BackendApplicationStatus {
  ref: string;
  businessName: string;
  status: KycStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export type ApplicationStatusResult =
  | { status: "found"; application: BackendApplicationStatus }
  | { status: "not_found" }
  | { status: "skipped" }
  | { status: "error"; error: string };

/**
 * Deterministic marketplace tenant id for an approved supplier. Kept in sync
 * with the registry so the admin console, the supplier dashboard and the
 * public store page all resolve the same tenant.
 */
export function supplierTenantId(businessName: string): string {
  return `sup-${slugify(businessName)}`;
}

/** Submit a KYC application. Anonymous applicants are allowed by RLS. */
export async function createSupplierApplication(
  input: SupplierApplicationInput,
): Promise<ApplicationSubmitResult> {
  if (!supabase) return { status: "error", error: "No backend configured." };

  // A signed-in applicant claims the row; guests leave it unlinked.
  const { data: sessionData } = await supabase.auth.getSession();

  const { data, error } = await supabase
    .from("supplier_applications")
    .insert({
      applicant_id: sessionData.session?.user.id ?? null,
      business_name: input.businessName.trim(),
      business_type: input.businessType,
      category_focus: input.categoryFocus,
      website: input.website?.trim() || null,
      contact_email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      city: input.city,
      area: input.area.trim(),
      registration_number: input.registrationNumber.trim(),
      director_name: input.directorName.trim(),
      director_id_type: input.directorIdType,
      director_id_number: input.directorIdNumber.trim(),
      operating_account: input.operatingAccount
        ? {
            bankName: input.operatingAccount.bankName,
            accountName: input.operatingAccount.accountName,
            accountNumber: input.operatingAccount.accountNumber,
            branch: input.operatingAccount.branch ?? null,
            mobileMoney: input.operatingAccount.mobileMoney ?? null,
          }
        : null,
      documents: input.documents.map((doc) => ({
        label: doc.label,
        name: doc.name,
        size: doc.size,
        uploadedAt: doc.uploadedAt,
        // Cloudinary path (jsonb column — no migration needed when present).
        ...(doc.url ? { url: doc.url } : {}),
        ...(doc.publicId ? { publicId: doc.publicId } : {}),
      })),
    })
    .select(
      "id, applicant_id, ref, business_name, business_type, category_focus, website, contact_email, phone, city, area, registration_number, director_name, director_id_type, director_id_number, operating_account, documents, status, submitted_at, reviewed_at, reviewed_by, review_note",
    )
    .single();

  if (error || !data) {
    return { status: "error", error: error?.message ?? "Could not submit the application." };
  }
  // The success screen shows the row the server actually stored, reference and
  // all — not a guess rebuilt from the form.
  return { status: "submitted", application: toApplication(data) };
}

/**
 * Find the backend row for an application the app already knows about.
 * Applications are matched on their reference number because the local
 * registry and Postgres both issue the same APL-YYYY-NNN format.
 */
async function resolveBackendApplicationId(ref: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("supplier_applications")
    .select("id")
    .ilike("ref", ref.trim())
    .maybeSingle();
  if (error) return null;
  return data?.id ?? null;
}

/**
 * Approve or reject an application on the backend. Approval is what grants the
 * applicant the supplier role and attaches their marketplace tenant.
 */
export async function reviewSupplierApplicationOnBackend(
  application: Pick<SupplierApplication, "ref" | "businessName">,
  decision: KycStatus,
  note?: string,
): Promise<ApplicationReviewResult> {
  if (!supabase) return { status: "skipped" };

  const id = await resolveBackendApplicationId(application.ref);
  // Applications submitted before the backend was connected only exist locally.
  if (!id) return { status: "skipped" };

  const { error } = await supabase.rpc("admin_review_supplier_application", {
    application_id: id,
    decision,
    note: note?.trim() || null,
    tenant_id: decision === "approved" ? supplierTenantId(application.businessName) : null,
  });

  if (error) return { status: "error", error: error.message };
  return { status: "reviewed" };
}

function mapStatusRow(row: ApplicationStatusRow): BackendApplicationStatus {
  const application: BackendApplicationStatus = {
    ref: row.ref,
    businessName: row.business_name,
    status: row.status,
    submittedAt: row.submitted_at,
  };
  if (row.reviewed_at) application.reviewedAt = row.reviewed_at;
  if (row.review_note) application.reviewNote = row.review_note;
  return application;
}

/** Public "check your application status" lookup by reference number. */
export async function lookupApplicationStatus(ref: string): Promise<ApplicationStatusResult> {
  if (!supabase) return { status: "skipped" };
  const trimmed = ref.trim();
  if (!trimmed) return { status: "not_found" };

  const { data, error } = await supabase.rpc("application_status_by_ref", { application_ref: trimmed });
  if (error) return { status: "error", error: error.message };

  const row = data?.[0];
  if (!row) return { status: "not_found" };
  return { status: "found", application: mapStatusRow(row) };
}
