/* ============================================================
   MedLink - cloudinary-upload (Supabase Edge Function = the backend)

     browser -- multipart/form-data --> this function
                                          |  builds the owner's folder
                                          |  medlink/<role>/<name>-<id8>/<purpose>
                                          v
                                       Cloudinary
     browser <-- { url, publicId, folder } <---'

   The browser never names a folder directly: it sends WHO is uploading
   (role + subject) and WHAT the file is (purpose), and the path is built
   here so every asset lands under its owner's folder:

     medlink/customers/jane-doe-1a2b3c4d/profile
     medlink/suppliers/med-equip-9f8e7d6c/kyc
     medlink/suppliers/med-equip-9f8e7d6c/products
     medlink/suppliers/med-equip-9f8e7d6c/store/banner
     medlink/suppliers/med-equip-9f8e7d6c/store/logo
     medlink/admins/pat-mponda-0c1b2a39/profile

   <id8> is the first 8 characters of the account uuid, or a SHA-1 prefix of
   the email for anonymous KYC applicants, so two people with the same name
   can never share a folder.

   Only the returned HTTPS URL ("item path") is stored in Postgres. The API
   secret never reaches the browser.

   Deployment:
     1. Edge Functions -> cloudinary-upload -> Deploy (this file)
     2. Verify JWT OFF (the KYC form uploads before an account exists)
     3. Edge Functions -> Secrets -> CLOUDINARY_URL
   ============================================================ */

/** Hard server-side cap; the client also checks it for a friendlier message. */
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/** Every upload belongs to a role and a purpose. Nothing else is accepted. */
const ROLE_FOLDERS = {
  customer: "customers",
  supplier: "suppliers",
  admin: "admins",
} as const;

type Role = keyof typeof ROLE_FOLDERS;

const PURPOSES: Record<string, string> = {
  kyc: "kyc",
  products: "products",
  profile: "profile",
  "store-banner": "store/banner",
  "store-logo": "store/logo",
  documents: "documents",
  "support-files": "support",
};

function corsHeaders(req: Request): Record<string, string> {
  const requestedHeaders = req.headers.get("access-control-request-headers");

  return {
    "Access-Control-Allow-Origin": req.headers.get("origin") ?? "*",
    "Access-Control-Allow-Headers": requestedHeaders ?? "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin, Access-Control-Request-Headers",
  };
}

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

/** SHA-1 hex digest via Web Crypto - the same hash Cloudinary signs with. */
async function sha1Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** cloudinary://API_KEY:API_SECRET@CLOUD_NAME - parsed server-side only. */
function parseCloudinaryUrl(raw: string): { apiKey: string; apiSecret: string; cloud: string } | null {
  const match = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(raw.trim());
  if (!match) return null;
  return { apiKey: match[1], apiSecret: match[2], cloud: match[3] };
}

/** "Anthony Gwaza" -> "anthony-gwaza". Empty/symbol-only names become "". */
function slugSegment(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Build the one folder an upload may land in:
 *   medlink/<role>/<name-slug>-<id8>/<purpose>
 * The id suffix keeps two identically-named people apart.
 */
async function buildFolder(role: string, subject: string, name: string, purpose: string): Promise<string | null> {
  if (!(role in ROLE_FOLDERS)) return null;
  const purposePath = PURPOSES[purpose];
  if (!purposePath) return null;

  const trimmedSubject = subject.trim();
  if (!trimmedSubject) return null;

  const slug = slugSegment(name);
  let id8: string;
  if (UUID_RE.test(trimmedSubject)) {
    id8 = trimmedSubject.replace(/-/g, "").slice(0, 8).toLowerCase();
  } else {
    id8 = (await sha1Hex(trimmedSubject.trim().toLowerCase())).slice(0, 8);
  }

  // Fall back to the subject itself when no usable display name was given.
  const label = slug || slugSegment(trimmedSubject.split("@")[0] ?? "") || "account";
  return `medlink/${ROLE_FOLDERS[role as Role]}/${label}-${id8}/${purposePath}`;
}

Deno.serve(async (req) => {
  // The browser may check CORS before sending the multipart body.
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  if (req.method !== "POST") return json(req, { error: "Method not allowed." }, 405);

  try {
    const config = parseCloudinaryUrl(Deno.env.get("CLOUDINARY_URL") ?? "");
    if (!config) {
      return json(req, { error: "The CLOUDINARY_URL secret is missing on this function (Edge Functions -> Secrets)." }, 500);
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return json(req, { error: "No file was received." }, 400);
    if (file.size === 0) return json(req, { error: "That file is empty." }, 400);
    if (file.size > MAX_BYTES) {
      return json(req, { error: `File is too large - the limit is ${Math.round(MAX_BYTES / 1048576)} MB.` }, 413);
    }

    const text = (key: string) => {
      const value = form.get(key);
      return typeof value === "string" ? value.trim() : "";
    };

    const folder = await buildFolder(text("role"), text("subject"), text("name"), text("purpose"));
    if (!folder) {
      return json(
        req,
        { error: "An upload needs a role (customer/supplier/admin), a subject and a known purpose." },
        400,
      );
    }

    // Signed upload: SHA-1 of sorted "key=value" params + the secret.
    const timestamp = Math.floor(Date.now() / 1000);
    const params: Record<string, string> = { timestamp: String(timestamp), folder };
    const toSign = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join("&");
    const signature = await sha1Hex(toSign + config.apiSecret);

    // Pictures (by MIME or extension) go to the image endpoint so they render
    // inline; PDFs and other documents go to raw so they download as-is.
    const looksLikeImage =
      file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i.test(file.name);
    const resourceType = looksLikeImage ? "image" : "raw";

    const upstream = new FormData();
    upstream.append("file", file, file.name);
    upstream.append("api_key", config.apiKey);
    upstream.append("timestamp", params.timestamp);
    upstream.append("folder", folder);
    upstream.append("signature", signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${config.cloud}/${resourceType}/upload`, {
      method: "POST",
      body: upstream,
    });

    const payload = (await res.json().catch(() => null)) as {
      secure_url?: string;
      public_id?: string;
      bytes?: number;
      format?: string;
      error?: { message?: string };
    } | null;

    if (!res.ok || !payload?.secure_url) {
      return json(req, { error: payload?.error?.message ?? `Cloudinary responded with HTTP ${res.status}.` }, 502);
    }

    return json(req, {
      url: payload.secure_url,
      publicId: payload.public_id ?? "",
      folder,
      bytes: payload.bytes ?? file.size,
      format: payload.format ?? "",
    });
  } catch (err) {
    return json(req, { error: err instanceof Error ? err.message : "Upload failed." }, 500);
  }
});
