-- ============================================================
-- MedLink — 0008 · The public form files its application through the server
--
-- The wizard stores the application and shows the reference the *server*
-- issued, so it asks PostgREST for the row back (`Prefer: return=representation`
-- — `.insert(...).select(...).single()` in `src/lib/onboarding.ts`). That is an
-- `INSERT ... RETURNING`, and Postgres checks a RETURNING row against the SELECT
-- policies. `anon` deliberately has none on `supplier_applications` — a guest
-- application carries contact details, a bank account and KYC document URLs —
-- so a signed-out applicant got, right after the function-privilege fix:
--
--     { code: "42501",
--       message: "new row violates row-level security policy for table \"supplier_applications\"" }
--
-- Widening a SELECT policy would publish every guest application to every
-- anonymous visitor, so the write moves to the server instead:
-- `submit_supplier_application()` inserts the row as the table owner, takes the
-- applicant from the *session* (`auth.uid()` — null for a guest, whose row the
-- sign-up trigger then claims by email) and returns the stored row. The public
-- INSERT policy stays for API completeness, now pinned to un-reviewed rows so a
-- caller cannot file an application that claims to be approved already.
-- ============================================================

create or replace function public.submit_supplier_application(
  p_business_name       text,
  p_business_type       text,
  p_category_focus      text,
  p_contact_email       text,
  p_phone               text,
  p_city                text,
  p_area                text,
  p_registration_number text,
  p_director_name       text,
  p_director_id_type    text,
  p_director_id_number  text,
  p_website             text default null,
  p_operating_account   jsonb default null,
  p_documents           jsonb default '[]'::jsonb
)
returns public.supplier_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  created public.supplier_applications;
begin
  insert into public.supplier_applications (
    applicant_id, business_name, business_type, category_focus, website,
    contact_email, phone, city, area, registration_number,
    director_name, director_id_type, director_id_number,
    operating_account, documents
  ) values (
    -- The applicant comes from the session, never from the caller.
    auth.uid(),
    btrim(p_business_name),
    p_business_type,
    p_category_focus,
    nullif(btrim(coalesce(p_website, '')), ''),
    lower(btrim(p_contact_email)),
    btrim(p_phone),
    p_city,
    btrim(p_area),
    btrim(p_registration_number),
    btrim(p_director_name),
    p_director_id_type,
    btrim(p_director_id_number),
    p_operating_account,
    coalesce(p_documents, '[]'::jsonb)
  )
  -- `ref`, `status`, `submitted_at` are the table's own defaults: the server
  -- issues the reference and the row starts 'pending'. The table's NOT NULL
  -- constraints are the server-side validation.
  returning * into created;

  return created;
end;
$$;

comment on function public.submit_supplier_application(
  text, text, text, text, text, text, text, text, text, text, text, text, jsonb, jsonb
) is
  'Files one supplier KYC application for the public form and returns the stored row, reference included. The applicant is taken from the session, so a guest leaves an unowned row that the sign-up trigger claims by email.';

revoke all on function public.submit_supplier_application(
  text, text, text, text, text, text, text, text, text, text, text, text, jsonb, jsonb
) from public;
grant execute on function public.submit_supplier_application(
  text, text, text, text, text, text, text, text, text, text, text, text, jsonb, jsonb
) to anon, authenticated;

-- ------------------------------------------------------------
-- The direct public insert may only file an un-reviewed application.
-- `status`, `reviewed_at` and `reviewed_by` are set by the applicant's actions
-- never: approving is admin_review_supplier_application()'s job.
-- ------------------------------------------------------------
drop policy if exists supplier_applications_insert_public on public.supplier_applications;
create policy supplier_applications_insert_public on public.supplier_applications
  for insert to anon, authenticated
  with check (
    (applicant_id is null or applicant_id = auth.uid())
    and status = 'pending'
    and reviewed_at is null
    and reviewed_by is null
  );
