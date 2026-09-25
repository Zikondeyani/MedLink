# MedLink — Session Log

> Update this file at the end of every response: what was done, where we left off, and next steps.

## Status: environment wired to real Supabase project — ready for first live test

### Done in this session (2026-09-25)

- **`.env` is now the single source of env config.** Real vars are present:
  - `VITE_SUPABASE_URL=https://nzjfdszdpmaqtufjacuc.supabase.co`
  - `VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…` (value stays local; `.env` is git-ignored)
- **Deleted `.env.example`** and removed the `!.env.example` exception from `.gitignore`.
- **Fixed a key-name mismatch** that would have silently dropped the app into demo mode:
  - `src/lib/supabase.ts` now reads `VITE_SUPABASE_ANON_KEY ?? VITE_SUPABASE_PUBLISHABLE_KEY`.
  - `src/vite-env.d.ts` declares both names.
  - Updated `.env.local` / `.env.example` mentions in `src/lib/supabase.ts` and
    `src/pages/admin/AdminUsersPage.tsx` to say `.env`.
- Documented admin access/login (see below).

### How to access the admin page

1. Start the dev server: `npm run dev` → open `http://localhost:5173`.
2. Admin routes live at **`/admin`** (dashboard), with sub-routes:
   `/admin/applications`, `/admin/suppliers`, `/admin/products`, `/admin/orders`,
   `/admin/transactions`, `/admin/customers`, `/admin/users`, `/admin/categories`,
   `/admin/pricing`, `/admin/notifications` — all guarded by
   `RequireRole role="admin"` in `src/App.tsx`.
3. First admin account (Supabase mode):
   - Run every file in `supabase/migrations/` in the Supabase SQL Editor (creates
     `profiles`, RLS, `admin_*` RPCs), if not already applied.
   - Sign up at `/signup` with the email you want (e.g. `admin@medlink.mw`) — or
     create the user in Supabase → Authentication → Users. If email confirmation
     blocks sign-in, confirm the link or disable "Confirm email" in Auth settings.
   - In SQL Editor run the promote statement from `supabase/seed.sql`
     (swap in your email if different):
     ```sql
     update public.profiles
        set role = 'admin', status = 'active'
      where lower(email) = lower('admin@medlink.mw');
     ```
4. Sign in via the **"Sign in" button in the navbar** (or the sign-in tab at
   `/signup`). An admin is redirected to `/admin` automatically (HomePage +
   navbar show an "Admin dashboard" link).
5. Fallback demo mode (only if `.env` vars are ever missing): sign in as
   `admin@medlink.mw` / `admin123`.

### Next steps

1. Run `npm run dev` and confirm the app connects to Supabase (open browser
   console; `backend` should be `"supabase"`, not `"local"` — check `/admin/users`).
2. Verify migrations were applied on the project (`select role, status, count(*)
   from public.profiles group by role, status;`).
3. Create + promote the first admin, sign in, and smoke-test `/admin` pages:
   users, applications, orders.
4. Full check: `npm run build` and `npm run lint`.
5. Commit the changes (`.env` stays ignored — only code + `.gitignore` changes).
