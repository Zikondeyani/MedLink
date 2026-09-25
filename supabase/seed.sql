-- ============================================================
-- MedLink — seed / operational helpers
--
-- Create the first administrator:
--   1. Sign up normally through the app (any role) — for example from
--      /signup, or create the user in Supabase → Authentication → Users.
--      The sign-up trigger writes their public.profiles row automatically.
--   2. Run the statement below once with their email address.
-- After that, every further admin action (promoting a user, suspending an
-- account, reviewing KYC) is available in the UI at /admin/users.
-- ============================================================

-- promote_first_admin
update public.profiles
   set role = 'admin',
       status = 'active'
 where lower(email) = lower('admin@medlink.mw');

-- Optional: grant supplier access to an existing account by hand when the
-- KYC application was submitted outside the app.
-- update public.profiles
--    set role = 'supplier',
--        supplier_id = 'sup-medequip'
--  where lower(email) = lower('supplier@medlink.mw');

-- Health check: what roles exist on this project?
-- select role, status, count(*) from public.profiles group by role, status order by role;
