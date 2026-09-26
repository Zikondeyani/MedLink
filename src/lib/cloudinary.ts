/* ============================================================
   MedLink — file storage (every file goes into its owner's folder)

   The browser never names a Cloudinary folder. It says WHO is
   uploading and WHAT the file is; the edge function builds the path:

     medlink/customers/<name>-<id8>/profile
     medlink/suppliers/<name>-<id8>/kyc
     medlink/suppliers/<name>-<id8>/products
     medlink/suppliers/<name>-<id8>/store/banner
     medlink/suppliers/<name>-<id8>/store/logo
     medlink/admins/<name>-<id8>/profile

   so one store = one folder, and the KYC documents, product photos and
   store artwork of a supplier sit side by side.

      file ──▶ Supabase Edge Function `cloudinary-upload`
          ◀── { url, publicId, folder }

   Files travel as multipart/form-data (streamed from disk, never base64),
   and only the HTTPS URL is stored in Postgres.
   ============================================================ */

import { useAuth } from "./auth";
import type { UserRole } from "./auth";

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

const SUPABASE_URL = typeof rawUrl === "string" ? rawUrl.trim() : "";
const SUPABASE_KEY = typeof rawKey === "string" ? rawKey.trim() : "";
const UPLOAD_ENDPOINT = `${SUPABASE_URL.replace(/\/+$/, "")}/functions/v1/cloudinary-upload`;

/** True when the Supabase backend (home of the upload function) is configured. */
export const isCloudinaryConfigured = SUPABASE_URL.length > 0 && SUPABASE_KEY.length > 0;

/** Hard limit enforced by the edge function; checked here for a friendly message. */
export const CLOUDINARY_MAX_BYTES = 10 * 1048576; // 10 MB

/** KYC documents are capped lower; product/store artwork at the full limit. */
export const KYC_MAX_BYTES = 5 * 1_048_576; // 5 MB
export const IMAGE_MAX_BYTES = 5 * 1_048_576; // 5 MB

/** A stored file — only these small values are persisted, never the bytes. */
export interface UploadedFile {
  /** HTTPS URL of the asset — the path stored in the database. */
  url: string;
  /** Cloudinary public id — the stable handle for later transforms or deletes. */
  publicId: string;
  /** The owner's folder the asset was written to. */
  folder: string;
  bytes: number;
  format: string;
}

export type UploadResult =
  | { ok: true; file: UploadedFile }
  | { ok: false; error: string; notConfigured?: boolean };

/** What kind of file is this? Decides the sub-folder inside the owner's folder. */
export type UploadPurpose = "kyc" | "products" | "profile" | "store-banner" | "store-logo" | "documents" | "support-files";

/** Human file sizes for the UI ("840 KB", "1.2 MB"). */
export function formatFileSize(bytes: number): string {
  return bytes >= 1_048_576
    ? `${(bytes / 1_048_576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Turn backend/Cloudinary error strings into actionable messages. */
function friendlyError(message: string, status: number): string {
  const text = message.toLowerCase();
  if (status === 404 || text.includes("function not found")) {
    return "The upload backend is not deployed yet — deploy the cloudinary-upload Edge Function (see supabase/functions/cloudinary-upload/index.ts).";
  }
  if (status === 400 && text.includes("role")) {
    return "The upload backend rejected the request as missing who/what — this is a bug, please report it.";
  }
  if (status === 401 || text.includes("authorization") || text.includes("jwt")) {
    return "The upload backend rejected the request — turn Verify JWT off for the cloudinary-upload function in the Supabase dashboard.";
  }
  if (text.includes("signature") || text.includes("invalid api key") || text.includes("specified account")) {
    return "Cloudinary rejected the CLOUDINARY_URL credentials — re-copy the API key and secret from the Cloudinary console.";
  }
  if (text.includes("file size") || text.includes("too large") || text.includes("exceed")) {
    return `That file is larger than the ${formatFileSize(CLOUDINARY_MAX_BYTES)} upload limit.`;
  }
  if (text.includes("unknown cloud")) {
    return "Cloudinary does not recognize the cloud name in CLOUDINARY_URL.";
  }
  if (text.includes("invalid image") || text.includes("unexpected file type")) {
    return "Cloudinary rejected that file format.";
  }
  return message;
}

/** Who is uploading — normally the signed-in account, else a KYC applicant. */
export interface UploadOwner {
  role: UserRole;
  /** Account uuid when signed in; the applicant's email for anonymous KYC. */
  subject: string;
  name: string;
}

export interface UploadOptions {
  purpose: UploadPurpose;
  owner: UploadOwner;
  maxBytes?: number;
}

/**
 * The owner of every upload made by the signed-in account. Falls back to a
 * guest customer folder so an accidental upload never 400s.
 */
export function useUploadOwner(): UploadOwner {
  const { user } = useAuth();
  if (user) {
    return { role: user.role, subject: user.id, name: user.name || user.email };
  }
  return { role: "customer", subject: "medlink-guest", name: "guest" };
}

/** The KYC applicant has no account yet, so their email identifies the folder. */
export function applicantOwner(businessName: string, email: string): UploadOwner {
  return { role: "supplier", subject: email.trim().toLowerCase(), name: businessName };
}

/** Folder preview for the UI, e.g. "medlink/suppliers/med-equip-a1b2c3d4/kyc". */
export function describeOwnerFolder(owner: UploadOwner, purpose: UploadPurpose): string {
  const roots = { customer: "customers", supplier: "suppliers", admin: "admins" } as const;
  const paths: Record<UploadPurpose, string> = {
    kyc: "kyc",
    products: "products",
    profile: "profile",
    "store-banner": "store/banner",
    "store-logo": "store/logo",
    documents: "documents",
    "support-files": "support",
  };
  const slug = owner.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(owner.subject)
    ? owner.subject.replace(/-/g, "").slice(0, 8)
    : "·short-id";
  return `medlink/${roots[owner.role]}/${slug || "account"}-${uuid}/${paths[purpose]}`;
}

/**
 * Upload one file through the MedLink backend into the owner's folder.
 * The file travels as multipart/form-data — the browser streams it from disk
 * and Cloudinary stores it; only the tiny result object comes back.
 */
export async function uploadFile(file: File, options: UploadOptions): Promise<UploadResult> {
  if (!isCloudinaryConfigured) {
    return {
      ok: false,
      notConfigured: true,
      error: "Uploads need the Supabase backend — add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.",
    };
  }

  const maxBytes = options.maxBytes ?? CLOUDINARY_MAX_BYTES;
  if (file.size > maxBytes) {
    return {
      ok: false,
      error: `${file.name} is ${formatFileSize(file.size)} — the limit is ${formatFileSize(maxBytes)}.`,
    };
  }

  const body = new FormData();
  body.append("file", file);
  body.append("role", options.owner.role);
  body.append("subject", options.owner.subject);
  body.append("name", options.owner.name);
  body.append("purpose", options.purpose);

  let response: Response;
  try {
    response = await fetch(UPLOAD_ENDPOINT, {
      method: "POST",
      body,
    });
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof TypeError
          ? "Could not reach the MedLink upload backend. Confirm the Supabase project is active and redeploy cloudinary-upload."
          : "Could not reach the MedLink upload backend.",
    };
  }

  type UploadPayload = {
    url?: string;
    publicId?: string;
    folder?: string;
    bytes?: number;
    format?: string;
    error?: string;
    msg?: string;
    message?: string;
  };

  let payload: UploadPayload | null = null;
  try {
    payload = (await response.json()) as UploadPayload;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.url) {
    const message =
      payload?.error ?? payload?.msg ?? payload?.message ?? `The upload backend responded with HTTP ${response.status}.`;
    return { ok: false, error: friendlyError(message, response.status) };
  }

  return {
    ok: true,
    file: {
      url: payload.url,
      publicId: payload.publicId ?? "",
      folder: payload.folder ?? "",
      bytes: payload.bytes ?? file.size,
      format: payload.format ?? "",
    },
  };
}
