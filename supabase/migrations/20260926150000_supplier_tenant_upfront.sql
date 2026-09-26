-- ============================================================
-- MedLink — 0004 · The supplier tenant exists from day one
--
-- Before this migration a `suppliers` row was created only when an
-- administrator approved a KYC application, and the applicant got a
-- generated one-time password they had to keep. That meant a supplier
-- could not sign in and work while the review was pending.
--
-- Now:
--   • Signing up from the application wizard creates the supplier
--     account immediately, with the password the applicant chose.
--   • A trigger on `profiles` creates the store tenant (and claims the
--     applicant's pending KYC row) the moment the account appears, so
--     the supplier can use the whole dashboard right away.
--   • `suppliers.verified` — set only by the admin review RPC — is what
--     makes the store and its products public. Until then they exist,
--     they are editable, and nobody but the owner and admins can see them.
--   • A rejected application can be corrected and resubmitted in place.
-- ============================================================

-- ------------------------------------------------------------
-- Is this store publicly listed? SECURITY DEFINER so the check does
-- not depend on which RLS policy happens to apply to the caller.
-- ------------------------------------------------------------
create or replace function public.supplier_is_published(target text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.suppliers s
     where s.id = target
       and s.verified
       and not s.suspended
  );
$$;

comment on function public.supplier_is_published(text) is
  'True when a store is verified and not suspended — the only condition that lists it publicly.';

-- ------------------------------------------------------------
-- Create the store tenant for every supplier account.
--
-- Runs as a SECURITY DEFINER trigger so it cannot be skipped by a
-- client that forgets to call anything, and so it can write the
-- suppliers row regardless of the caller's RLS.
-- ------------------------------------------------------------
-- ------------------------------------------------------------
-- Sign-up: create the profile AND the store tenant in one shot.
--
-- This replaces handle_new_user() rather than adding a second trigger on
-- `profiles`, for two reasons:
--   • profiles.supplier_id has to be set on the INSERT. A follow-up UPDATE
--     would run into guard_profile_privileges(), which refuses any change to
--     role/status/supplier_id that did not come from an admin.
--   • The tenant must exist for the row that links the account to it, or the
--     supplier dashboard opens onto an empty state.
--
-- SECURITY DEFINER, and triggered from auth.users where auth.uid() is still
-- null, so nothing here can be influenced by the caller.
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.user_role;
  v_full_name    text;
  v_app          public.supplier_applications;
  v_has_app      boolean := false;
  v_supplier     text;
  v_slug         text;
  v_store_name   text;
begin
  -- Only "supplier" is honoured from client metadata: an admin can never be
  -- self-provisioned, and any other value safely degrades to "customer".
  if new.raw_user_meta_data ->> 'role' = 'supplier' then
    requested_role := 'supplier'::public.user_role;
  else
    requested_role := 'customer'::public.user_role;
  end if;

  v_full_name := coalesce(
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    split_part(new.email, '@', 1)
  );

  -- The application wizard writes the KYC row first and signs up with the same
  -- email, so email is the join key. The review RPC falls back to it too.
  if requested_role = 'supplier' then
    select * into v_app
      from public.supplier_applications a
     where a.applicant_id is null
       and lower(a.contact_email) = lower(new.email)
     order by a.submitted_at desc
     limit 1;
    v_has_app := v_app.id is not null;
  end if;

  v_store_name := coalesce(
    case when v_has_app then nullif(btrim(v_app.business_name), '') end,
    v_full_name,
    'Supplier'
  );

  -- The same id the review RPC computes, so approving an application updates
  -- this row instead of creating a second store. With no application to key
  -- off, the account uuid names the store instead.
  v_supplier := coalesce(
    (select s.id from public.suppliers s where v_has_app and s.application_id = v_app.id),
    case when v_has_app
         then 'sup-' || substr(md5(lower(v_store_name) || v_app.id::text), 1, 10)
         else 'sup-' || substr(replace(new.id::text, '-', ''), 1, 10)
    end
  );
  v_slug := left(
    coalesce(nullif(public.slugify(v_store_name), ''), 'supplier'), 60
  ) || '-' || left(
    case when v_has_app
         then replace(v_app.id::text, '-', '')
         else replace(new.id::text, '-', '')
    end, 8);

  -- Store first, profile second. profiles.supplier_id is a plain text column
  -- today, but ordering it this way keeps the sign-up valid if anyone later
  -- adds the foreign key the schema comment promises.
  -- Only supplier accounts get a store, and only one.
  if requested_role = 'supplier'
     and not exists (select 1 from public.suppliers s where s.owner_id = new.id) then
    insert into public.suppliers (
      id, application_id, owner_id, name, slug, category, city, area,
      phone, email, description, verified, operating_account
    ) values (
      v_supplier,
      case when v_has_app then v_app.id else null end,
      new.id,
      v_store_name,
      v_slug,
      case when v_has_app then coalesce(v_app.category_focus, '') else '' end,
      case when v_has_app then coalesce(v_app.city, '') else '' end,
      case when v_has_app then coalesce(v_app.area, '') else '' end,
      case when v_has_app then coalesce(v_app.phone, '') else '' end,
      lower(new.email),
      case when not v_has_app then ''
           else v_app.business_name || ' is a ' || lower(v_app.business_type) ||
                ' registered on MedLink. Focused on ' || lower(v_app.category_focus) ||
                ' for healthcare buyers across Malawi.'
      end,
      -- Unverified: the store exists and is editable but is not public.
      false,
      case when v_has_app then v_app.operating_account else null end
    )
    -- No conflict target: `application_id` is unique too, so two sign-ups
    -- racing for the same application must not raise here.
    on conflict do nothing;
  end if;

  insert into public.profiles (id, email, full_name, phone, role, status, supplier_id)
  values (
    new.id,
    lower(new.email),
    v_full_name,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone', '')), ''),
    requested_role,
    'active',
    case when requested_role = 'supplier' then v_supplier else null end
  )
  on conflict (id) do nothing;

  if v_has_app then
    update public.supplier_applications
       set applicant_id = new.id
     where id = v_app.id and applicant_id is null;
  end if;

  return new;
end;
$$;

comment on table public.suppliers is
  'Marketplace stores. One row per supplier account, created when the account signs up; verified = false until an administrator approves the KYC, and only then is the store public.';

-- ------------------------------------------------------------
-- Public visibility — the whole point of the change.
--
-- `verified` is written only by admin_review_supplier_application(),
-- so a supplier can never publish their own store by writing a column.
-- Owner and admin policies are unchanged: the owner still sees and
-- edits everything, public sees only published stores.
-- ------------------------------------------------------------
drop policy if exists suppliers_select_public on public.suppliers;
create policy suppliers_select_public on public.suppliers
  for select to anon, authenticated using (public.supplier_is_published(id));

drop policy if exists products_select_public on public.products;
create policy products_select_public on public.products
  for select to anon, authenticated
  using (
    status = 'active'
    and not hidden
    and public.supplier_is_published(supplier_id)
  );

-- ------------------------------------------------------------
-- Rejected applications: the owner may correct and resubmit in place.
--
-- Only a *rejected* row is editable. A pending one is frozen so documents
-- cannot change under a reviewer who is already looking at them.
--
-- The check value is pinned, so an owner cannot set status='approved'
-- on their own row — the admin RPC is the only path to approval.
-- ------------------------------------------------------------
drop policy if exists supplier_applications_update_own on public.supplier_applications;
create policy supplier_applications_update_own on public.supplier_applications
  for update to authenticated
  using (
    applicant_id = auth.uid()
    and status = 'rejected'
  )
  with check (applicant_id = auth.uid() and status = 'pending');

-- ------------------------------------------------------------
-- Review RPC: link by applicant_id first, and un-publish on reject.
-- ------------------------------------------------------------
create or replace function public.admin_review_supplier_application(
  application_id uuid,
  decision public.kyc_status,
  note text default null,
  tenant_id text default null
)
returns public.supplier_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.supplier_applications;
  v_supplier_id text;
  v_profile_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required to review supplier applications.' using errcode = '42501';
  end if;

  update public.supplier_applications
     set status = decision,
         review_note = nullif(btrim(coalesce(note, '')), ''),
         reviewed_at = now(),
         reviewed_by = auth.uid()
   where id = application_id
  returning * into updated;

  if updated.id is null then
    raise exception 'Supplier application % was not found.', application_id using errcode = 'P0002';
  end if;

  -- applicant_id is the reliable link; the email is the fallback for an
  -- application filed before the account existed.
  select p.id into v_profile_id
    from public.profiles p
   where (p.id = updated.applicant_id)
      or (updated.applicant_id is null and lower(p.email) = lower(updated.contact_email))
   order by (p.id = updated.applicant_id) desc nulls last
   limit 1;

  -- The tenant the sign-up trigger created, if any. The client's `tenant_id`
  -- is only ever a last-resort hint: a store that already exists — whether it
  -- was created at sign-up or by an earlier review — always wins, so approval
  -- can never produce a second store for the same business.
  v_supplier_id := coalesce(
    (select s.id from public.suppliers s where s.application_id = updated.id),
    (select s.id from public.suppliers s where s.owner_id = v_profile_id),
    'sup-' || substr(md5(lower(updated.business_name) || updated.id::text), 1, 10),
    nullif(btrim(coalesce(tenant_id, '')), '')
  );

  if decision = 'approved' then
    insert into public.suppliers (
      id, application_id, owner_id, name, slug, category, city, area,
      phone, email, description, verified, operating_account
    ) values (
      v_supplier_id,
      updated.id,
      v_profile_id,
      updated.business_name,
      left(
        coalesce(nullif(public.slugify(updated.business_name), ''), 'supplier'),
        60
      ) || '-' || left(replace(updated.id::text, '-', ''), 8),
      updated.category_focus,
      updated.city,
      updated.area,
      updated.phone,
      updated.contact_email,
      updated.business_name || ' is a ' || lower(updated.business_type) ||
        ' registered on MedLink after passing KYC verification. Focused on ' ||
        lower(updated.category_focus) || ' for healthcare buyers across Malawi.',
      true,
      updated.operating_account
    )
    on conflict (id) do update
      set application_id  = excluded.application_id,
          owner_id        = coalesce(public.suppliers.owner_id, excluded.owner_id),
          name            = excluded.name,
          slug            = excluded.slug,
          category        = excluded.category,
          city            = excluded.city,
          area            = excluded.area,
          phone           = excluded.phone,
          email           = excluded.email,
          description     = excluded.description,
          verified        = true,
          operating_account = coalesce(public.suppliers.operating_account, excluded.operating_account),
          updated_at      = now();

    update public.profiles
       set role = 'supplier',
           supplier_id = v_supplier_id
     where id = v_profile_id;
  elsif decision = 'rejected' then
    -- A rejection takes the store back off the marketplace.
    -- The columns are table-qualified on purpose: `application_id` is also the
    -- name of this function's first parameter, and PL/pgSQL would silently
    -- resolve the bare name to the parameter instead of the column.
    update public.suppliers s
       set verified = false,
           updated_at = now()
     where s.application_id = updated.id
        or s.owner_id = v_profile_id;
  end if;

  return updated;
end;
$$;

-- ------------------------------------------------------------
-- Grants
--
-- The public "check your status by reference" box is gone: an applicant
-- signs in and reads their own banner instead, so the ref lookup is no
-- longer reachable by an anonymous caller.
-- ------------------------------------------------------------
revoke all on function public.supplier_is_published(text) from public, anon;
grant execute on function public.supplier_is_published(text) to anon, authenticated;
revoke all on function public.application_status_by_ref(text) from anon;
grant execute on function public.application_status_by_ref(text) to authenticated;
revoke all on function public.admin_review_supplier_application(uuid, public.kyc_status, text, text) from public, anon;
grant execute on function public.admin_review_supplier_application(uuid, public.kyc_status, text, text) to authenticated;
