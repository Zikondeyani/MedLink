-- ============================================================
-- MedLink — 0007 · An applicant can actually be handed a reference
--
-- `supplier_applications.ref` defaults to `next_application_ref()`, and a
-- column default is evaluated with the privileges of the role running the
-- INSERT — `anon` on the public /become-a-supplier form. Migrations 0002
-- (auth_roles) and 0003 (marketplace) revoked EXECUTE on that helper from
-- anon/authenticated because it sat in the same "revoke the internals"
-- block as handle_new_user() and the admin RPCs, so every submission
-- failed with:
--
--     submit → { code: "42501",
--                message: "permission denied for function next_application_ref" }
--
-- The helper is not privileged: it only formats 'APL-<year>-<serial>' from
-- the application sequence. It becomes SECURITY DEFINER with a pinned
-- search_path so the sequence is read as the owner (the insert does not
-- depend on the sequence grant Supabase hands out by default), and EXECUTE
-- goes to exactly the two roles that file an application.
-- ============================================================

create or replace function public.next_application_ref()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  return format(
    'APL-%s-%s',
    to_char(now(), 'YYYY'),
    lpad(nextval('public.supplier_application_ref_seq')::text, 3, '0')
  );
end;
$$;

comment on function public.next_application_ref() is
  'Public reference generator for supplier applications (APL-YYYY-NNN). Callable by anon/authenticated because it is the DEFAULT of supplier_applications.ref, which is evaluated as the inserting role.';

-- The PUBLIC pseudo-role stays out. The only thing an anonymous caller can
-- do with this function is mint a reference string — the format is public
-- and the insert policy already lets anyone file an application.
revoke all on function public.next_application_ref() from public;
grant execute on function public.next_application_ref() to anon, authenticated;
