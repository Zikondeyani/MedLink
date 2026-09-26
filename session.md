# MedLink — Session Log

> Update this file at the end of every response: what was done, where we left off, and next steps.

## Status: no mock data anywhere. Every page reads the real Supabase database;
## writes go through the server (SECURITY DEFINER RPCs for money). ⏭️ NEXT: end-to-end
## test with real accounts (supplier apply → approve → list product → order →
## release escrow).

### Session 5 — 2026-09-26: mock data removed, every page on the real database

**1. The data layer is now the only source of truth**

- `src/lib/db.ts` — row → domain mappers + read helpers (`fetchPublicSnapshot`,
  `fetchApplications`, `fetchOwnApplication`, `fetchMoney`, `fetchBlockedAccounts`,
  `slugify`, `maskPaymentReference`).
- `src/lib/registry.tsx` — the Supabase-backed marketplace store (one
  `useSyncExternalStore` cache, `loadMarketplace()` on mount/sign-in/sign-out,
  re-read after every mutation) + non-hook getters (`getProducts`, `getSuppliers`,
  `getActiveProducts`, `getCategories`) for module-level helpers.
- `src/lib/customerData.ts` — orders, fulfilment and addresses;
  `placeCustomerOrder` calls the `place_order` RPC.
- `src/lib/analytics.ts` — aggregators take an optional `supplierId` and read
  `supplier_orders` when scoped, so a supplier dashboard can never show platform
  numbers. `usePlatformSummary()` counts distinct order emails as customers;
  `useSupplierDashboardStats` reports fulfilment %, not a made-up conversion rate.
- `src/lib/accounts.ts` — shared account cache (`useAccounts`, `refreshAccounts`).

**2. Mock data deleted** — `src/data/{products,suppliers,categories,orders,sales,
notifications,transactions,applications}.ts` are gone. Only static content remains
in `src/data`: `faqs.ts` (FAQ copy) and `types.ts` (domain types). 33 files were
remapped onto the hooks. Fake numbers went too: dashboard `trend={18.2}` props,
`products.length * 12 + "medical products"`, `4,800+ orders delivered`,
`"245 listed"`, and AdminPricing's "Reset to defaults" (→ "Reload from server").

**3. Writes are real and report failure**

Checkout places the order through `place_order()` (the server recomputes prices,
stock and fees). Every other write is awaited and toasts an error when the
database refuses: admin supplier suspend/verify/delete, product feature/hide,
category add/edit/delete, order status, KYC approve/reject, customer block,
supplier order advance, product stock/delete, store settings. `useDataStatus()` is
finally consumed by a new `DataGate` around the router, so no page renders a
zero-filled marketplace while the load is in flight. `DataTable` and
`ProductGrid` take an `empty` message for the genuinely-empty case.

**4. Verified**

- `npx tsc -b` clean · `npm run build` clean · `npm run lint` 0 errors
  (24 pre-existing fast-refresh / exhaustive-deps warnings).
- Live DB read back with the publishable key: categories, suppliers, products,
  orders, supplier_orders, payouts, supplier_applications all **0 rows**;
  `pricing_config` has its one configuration row (10% fee, MWK 7,500 default).
  Nothing is seeded.
- Dev server serves the app (HTTP 200 on `/`, `/src/App.tsx`, DataGate).

**Known limits**

- No in-browser UI verification (desktop browser disconnected) — verification was
  `tsc`, `vite build`, `oxlint`, HTTP and SQL only.
- The Supabase access token pasted in chat earlier should be revoked/regenerated;
  it is no longer in the environment.
- New file this session: `src/components/ui/DataGate.tsx`.

### Session 4 — 2026-09-26: per-user upload folders + real-data schema

**1. Per-user Cloudinary folders (the browser can no longer name a folder)**

The edge function now builds the path server-side from *who* + *what*:

```
medlink/<role>/<name-slug>-<id8>/<purpose>
  customers/jane-doe-9f8e7d6c/profile
  suppliers/med-equip-supplies-1a2b3c4d/kyc      ← KYC
  suppliers/med-equip-supplies-1a2b3c4d/products ← product photos
  suppliers/med-equip-supplies-1a2b3c4d/store/banner|logo
  admins/pat-mponda-0c1b2a39/profile
```

`<id8>` = first 8 of the account uuid, or `sha1(email)[0..8]` for anonymous KYC
applicants, so two people with the same name never share a folder. `role` and
`purpose` are allow-listed server-side; anything else is a 400. Deployed as
function **v3** (`verify_jwt: false`) and live-tested: PNG+PDF, all 3 roles, all
purposes, plus the two rejection paths. Test assets destroyed from Cloudinary.

- `src/lib/cloudinary.ts` rewritten: `uploadFile(file, {purpose, owner, maxBytes})`,
  `useUploadOwner()` (signed-in account), `applicantOwner()` (KYC, email identity),
  `describeOwnerFolder()` (UI hint). `KYC_MAX_BYTES` / `IMAGE_MAX_BYTES` (5 MB).
- `src/components/ui/FileUploader.tsx` — one picker for every file (label, hint,
  preview, spinner, error) + `.uploader*` styles in `styles/extras.css`.
- Wired: KYC docs (`BecomeASupplierPage`), product photos
  (`SupplierProductFormPage`), **profile photo** (`AccountPage` → writes
  `profiles.avatar_url`), **store banner + logo** (`supplier/SupplierStorePage` →
  writes `suppliers.banner_image` / `logo_image`).
- `AuthUser.avatarUrl` + `AccountRecord.blocked/avatarUrl` added; profile selects
  now include `avatar_url`.

**2. Marketplace schema — `supabase/migrations/20260926090000_marketplace.sql` (APPLIED)**

`categories · suppliers · products · orders · order_items · supplier_orders ·
payments · payouts · released_orders · addresses · notifications · pricing_config`
plus `profiles.avatar_url` / `profiles.blocked` and 6 new enums. RLS deny-by-default
(public reads only published rows; customers own their orders/addresses/notifications;
suppliers own their store + products + fulfilment queue; admins see all).

Money is never trusted from the browser:
- `place_order(items, address, method, reference)` — SECURITY DEFINER; recomputes
  prices/stock/fees from `products` + `pricing_config`, writes order + items +
  per-store `supplier_orders` + `payments` + notification in one transaction.
- `admin_release_supplier_funds(supplier_id)` — escrow → `payouts` + `released_orders`.
- `admin_review_supplier_application(...)` — **now also creates the `suppliers` row**
  (readable collision-proof slug) and links `profiles.supplier_id`.
- `admin_set_customer_blocked`, `owns_supplier()`, `slugify()`.

**Nothing is seeded** — verified: every marketplace table has **0 rows**; the only
rows in the project are the 3 real `profiles`. `src/lib/database.types.ts` rewritten
to match (typed tables + RPC results).

**Still mock (phase 2, not started):** `src/lib/registry.tsx` (709 lines) and
`src/lib/customerData.ts` (434 lines) are still localStorage stores fed by
`src/data/{products,suppliers,orders,transactions,sales,notifications,applications,categories}.ts`
≈ 40 import sites across ~30 files. Static content that must stay static:
`src/data/faqs.ts` (FAQ copy), `types.ts` (domain types), `supplyOrderStatusSteps`
(status labels). Conversion order: data layer → marketplace pages → checkout via
`place_order` → supplier pages → admin pages → delete mock modules.

### Session 3 — 2026-09-26: deployed the backend (uploads now work)

**Problem reported:** "Screenshot (1).png · 296 KB — Could not reach the MedLink upload
backend…" on the KYC upload (`BecomeASupplierPage` line 189 renders
`` `${doc.name} · ${doc.size} — ${doc.error}` ``).

**Diagnosis (verified with curl, not guessed):**

- `POST/GET https://nzjfdszdpmaqtufjacuc.supabase.co/functions/v1/cloudinary-upload`
  → **HTTP 404 `{"code":"NOT_FOUND","message":"Requested function was not found"}`**.
  The function simply was never deployed — no CLI login, no token, no `supabase/config.toml`
  on this machine, so nothing had ever pushed it.
- Kong's *undeployed* 404 also lacks `Access-Control-Allow-Methods`, so a client that sends
  custom headers (`apikey`/`Authorization`) fails the preflight with a `TypeError` → the
  "could not reach / check your internet connection" wording. The current client sends **no**
  custom headers (simple `FormData` POST), so it always got a readable 404.
- Local dev server (`localhost:5173`, Vite) confirmed serving the **current** `src` — the
  quoted "check your internet connection" string does not exist anywhere in this repo, so
  that toast came from a stale tab/build. Hard-refresh (Ctrl+Shift+R) if you see it again.

**What I did (Management API, using the Supabase access token you provided):**

- `POST /v1/projects/nzjfdszdpmaqtufjacuc/functions` → created `cloudinary-upload`,
  `verify_jwt: false`, `status: ACTIVE`, `version: 1`, body = `supabase/functions/cloudinary-upload/index.ts`.
- `POST /v1/projects/{ref}/secrets` → `CLOUDINARY_URL` set (payload shape is
  `[{"name": "...", "value": "..."}]` — an object or `{key,value}` is rejected with 400).
- Cleanup: my 2 test uploads destroyed via **signed** Cloudinary `destroy` (200 ok) —
  `medlink/kyc/afhvkosklifqcbkc5mjq`, `medlink/kyc/o7vl9zdtvqjzycjxnll5.pdf`.

**Live test results (all PASS):**

| Check | Result |
|---|---|
| `OPTIONS` preflight (origin `http://localhost:5173`) | 204 · `allow-origin` echoes origin · `allow-methods: POST, OPTIONS` · `allow-headers: content-type,apikey,authorization` |
| 1×1 PNG → `image` endpoint | 200 `{ url: res.cloudinary.com/…/medlink/kyc/….png, publicId, bytes, format }` |
| tiny PDF → `raw` endpoint | 200 `{ url: …/raw/upload/…/medlink/kyc/….pdf }` |
| 11 MB file | 413 `{ "error": "File is too large - the limit is 10 MB." }` |
| GET (wrong method) | 405 (function reachable) |

**Nothing changed in the app code** — `src/lib/cloudinary.ts` already had the right endpoint,
size checks and friendly-error mapping; it was purely an undeployed backend.

⚠️ The Supabase access token pasted in chat should be **revoked/regenerated** afterwards
(supabase.com → Account → Access Tokens) — treat it as exposed.

### Session 2 — 2026-09-25: Cloudinary file storage (revised architecture)

**Architecture (per user request: "frontend sends the file to your backend, the backend uploads to Cloudinary")**

```
browser ── multipart/form-data ──▶ Supabase Edge Function `cloudinary-upload`
                                        │ reads CLOUDINARY_URL secret (server-side only)
                                        │ SHA-1-signs the upload params + secret
                                        ▼
                                   Cloudinary  ──▶ stores the file
browser ◀── { url, publicId } ◀──────────┘
                │
                └── only the URL ("item path") is stored in Postgres
                    (supplier_applications.documents → url, jsonb — no migration)
```

- No `VITE_CLOUDINARY_*` vars (removed at user's request). The API secret never
  reaches the browser — verified by bundle scan: secret ABSENT from `dist` JS,
  no `api.cloudinary.com` in the bundle.

**What exists now**

- **`supabase/functions/cloudinary-upload/index.ts` (NEW — the backend):**
  parses `CLOUDINARY_URL`, 10 MB server cap, SHA-1 signature over sorted params +
  secret, uploads to `image` (pictures) or `raw` (PDFs/docs) endpoint, returns
  `{ url, publicId, bytes, format }`, CORS + OPTIONS preflight, never logs the secret.
- **`src/lib/cloudinary.ts` (frontend client):** POSTs the file as FormData to
  `${VITE_SUPABASE_URL}/functions/v1/cloudinary-upload` with `apikey`/`Authorization`
  headers. Friendly errors: 404 → "not deployed", 401 → "turn Verify JWT off",
  signature/key errors → "re-copy CLOUDINARY_URL", size/format messages.
  `notConfigured` (demo fallback) only when Supabase env is missing.
  **(Correction, session 3: the client sends NO `apikey`/`Authorization` headers — a plain
  `FormData` POST, which avoids the CORS preflight entirely. That is intentional and works.)**
- **KYC docs (`BecomeASupplierPage`):** real upload to folder `medlink/kyc`
  (5 MB, PDF/PNG/JPG), spinner/success/error per slot, failed uploads block step 4,
  `url`+`publicId` saved per document → `supplier_applications.documents` jsonb.
- **Admin KYC detail:** per-document **"Open file"** link (old rows keep the badge).
- **Product form:** 4 tiles wired (picker, parallel uploads to `medlink/products`,
  previews, remove, spinners). ⚠️ No `products` table exists, and the product form
  doesn't persist products at all — image URLs live only while the form is open.
- **`.env`:** `CLOUDINARY_URL=cloudinary://138981699598836:58I-…@dmnumuw3o` (value
  verified working; server-side only). `VITE_CLOUDINARY_*` lines removed.
- **`src/vite-env.d.ts`** cleaned; toast texts now use `result.error` (no stale hints).

**Validation performed**

- `npm run build` ✅ · `npm run lint` ✅ 0 errors (21 pre-existing warnings).
- Bundle scan: secret NOT in JS ✅ · calls `functions/v1/cloudinary-upload` ✅.
- **Backend flow tested for real (Node mirror of the exact function logic): URL parse ✓,
  SHA-1 matches RFC vector ✓, signed upload → HTTP 200 with secure_url ✓ PASS.**
- Correction to an earlier finding: the credentials ARE valid — Cloudinary now rejects
  *plain query-string* auth on admin endpoints (usage/resources/delete → 401), but
  **signed** requests (what our backend uses) succeed.
- Test artifacts in Cloudinary (harmless 1×1 PNGs, deletable from Media Library UI —
  API delete is blocked on this account): `medlink/fblrqwyp7ujxilejgcnc.png`,
  `medlink/dws0uv7mqd86foxfonx5.png`.

### ~~⏭️ Your next steps — deploy the backend~~ ✅ DONE (session 3, deployed via Management API)

> The 3 dashboard steps below were carried out programmatically on 2026-09-26:
> function created (`verify_jwt: false`), `CLOUDINARY_URL` secret set, live-tested → PASS.

1. **Edge Functions → Create a new function** → name it exactly `cloudinary-upload`
   → paste the contents of `supabase/functions/cloudinary-upload/index.ts` → **Deploy**.
2. Open the function and **turn Verify JWT OFF** (default is ON; must be OFF because
   the KYC form uploads anonymously from a public page).
3. **Edge Functions → Secrets** → add Key `CLOUDINARY_URL` = the exact value from
   `.env` → Save (takes effect immediately, no redeploy needed).
4. Then tell me — I will run the live end-to-end test.

### Live test plan (after deployment)

1. `npm run dev` → `/become-a-supplier` → step 4 → upload a PDF/JPG → expect
   "uploaded ✓" (NOT the "Uploads unavailable" demo toast).
2. Submit → check the `supplier_applications.documents` jsonb contains `url` →
   open `/admin/applications/:id` → click **Open file**.
3. `/supplier/products/new` → add an image → preview appears → remove works.
4. Cloudinary Media Library → files appear under `medlink/kyc/` and `medlink/products/`.

### Open items / next steps (beyond deployment)

1. **Products table** — migration + RLS + registry wiring so product image URLs (and
   the products themselves) persist; today they cannot.
2. Optional hardening on the function (Verify JWT is off by design): rate limiting or
   an internal auth check later if abuse becomes a concern.
3. Commit the changes (`.env` stays git-ignored).

### Carried over — admin access (still valid)

- `.env` is the single env file (`.env.example` deleted). Supabase vars:
  `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Admin area: `/admin`, guarded by `RequireRole role="admin"`. First admin: sign up →
  run the promote statement from `supabase/seed.sql` (`admin@medlink.mw`) in the SQL
  Editor → sign in via the navbar → auto-redirect to `/admin`.
- Demo-mode login (only when Supabase env is missing): `admin@medlink.mw` / `admin123`.
