/* ============================================================
   MedLink — supplier onboarding (KYC) backend
   The wire between the two sides of the supplier role:
     • BecomeASupplierPage submits an application  → INSERT (public form)
       and the applicant signs up in the same breath, so they can work
       while the review is pending.
     • SupplierVerificationPage fixes a rejection   → UPDATE own row
     • AdminApplications pages review it            → admin RPC

   An applicant never has to keep a reference number: once signed in,
   the KYC status banner shows them where they stand on every page.
   ============================================================ */
import { toApplication } from "./db";
import { supabase } from "./supabase";
import type { KycStatus } from "./database.types";
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

export type ApplicationResubmitResult =
  | { status: "resubmitted"; application: SupplierApplication }
  | { status: "error"; error: string };

/**
 * The columns a submission owns — shared by the insert and the resubmit.
 */
function applicationColumns(input: SupplierApplicationInput) {
  return {
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
  };
}

const APPLICATION_SELECT =
  "id, applicant_id, ref, business_name, business_type, category_focus, website, contact_email, phone, city, area, registration_number, director_name, director_id_type, director_id_number, operating_account, documents, status, submitted_at, reviewed_at, reviewed_by, review_note";

/** Submit a KYC application. Anonymous applicants are allowed by RLS. */
export async function createSupplierApplication(
  input: SupplierApplicationInput,
): Promise<ApplicationSubmitResult> {
  if (!supabase) return { status: "error", error: "No backend configured." };

  // A signed-in applicant claims the row; guests leave it unlinked and the
  // sign-up trigger claims it by email once the account exists.
  const { data: sessionData } = await supabase.auth.getSession();

  const { data, error } = await supabase
    .from("supplier_applications")
    .insert({ applicant_id: sessionData.session?.user.id ?? null, ...applicationColumns(input) })
    .select(APPLICATION_SELECT)
    .single();

  if (error || !data) {
    return { status: "error", error: error?.message ?? "Could not submit the application." };
  }
  // The success screen shows the row the server actually stored, reference and
  // all — not a guess rebuilt from the form.
  return { status: "submitted", application: toApplication(data) };
}

/**
 * Correct a rejected application and send it back for review.
 *
 * The row keeps its reference number and history; the RLS policy pins the new
 * status to 'pending' and blocks anything but the applicant's own row, so
 * this can never approve anything.
 */
export async function resubmitSupplierApplication(
  id: string,
  input: SupplierApplicationInput,
): Promise<ApplicationResubmitResult> {
  if (!supabase) return { status: "error", error: "No backend configured." };

  const { data, error } = await supabase
    .from("supplier_applications")
    .update({
      ...applicationColumns(input),
      status: "pending",
      // A resubmission supersedes the previous verdict.
      review_note: null,
      reviewed_at: null,
      reviewed_by: null,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(APPLICATION_SELECT)
    .maybeSingle();

  if (error) return { status: "error", error: error.message };
  if (!data) {
    return { status: "error", error: "That application could not be found on the server." };
  }
  return { status: "resubmitted", application: toApplication(data) };
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
  application: Pick<SupplierApplication, "ref">,
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
    // The tenant id is the server's to decide: approval reuses the store the
    // sign-up trigger already created, so a hint from here could only ever
    // create a second one.
    tenant_id: null,
  });

  if (error) return { status: "error", error: error.message };
  return { status: "reviewed" };
}
