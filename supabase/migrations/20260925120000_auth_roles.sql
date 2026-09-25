-- ============================================================
-- MedLink — 0001 · Authentication, roles & supplier onboarding
--
-- Backend: Supabase (Postgres + GoTrue Auth).
--
-- Design decisions
--   • The role is decided by HOW an account is created, not by the
--     sign-in form:
--       customer → self sign-up            (SignUpPage)
--       supplier → supplier KYC application (BecomeASupplierPage)
--       admin    → provisioned by an existing admin (AdminUsersPage)
--   • auth.users stays untouched; public.profiles is the single
--     server-side source of truth for role, status and tenant.
--   • Every client is treated as hostile: RLS denies by default and
--     only exposes "your own row" plus explicit admin RPCs.
--   • Role/status/supplier columns can never be written by the
--     account owner — a BEFORE UPDATE trigger blocks privilege
--     escalation even if a policy were ever loosened.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------
do $$
begin
  create type public.user_role as enum ('customer', 'supplier', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  -- An account is either usable or frozen by an administrator.
  create type public.account_status as enum ('active', 'suspended');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.kyc_status as enum ('pending', 'approved', 'rejected');
exception
  when duplicate_object then null;
end $$;

-- ------------------------------------------------------------
-- profiles — 1:1 with auth.users
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  phone       text,
  role        public.user_role not null default 'customer',
  status      public.account_status not null default 'active',
  -- Marketplace tenant this supplier account trades as. The FK to
  -- public.suppliers(id) is added by the marketplace migration; until then
  -- it holds the deterministic tenant id (e.g. "sup-lilongwe-meds").
  supplier_id text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint profiles_email_not_blank check (btrim(email) <> '')
);

comment on table public.profiles is
  'Server-side source of truth for a MedLink account role, status and supplier tenant.';

create unique index if not exists profiles_email_key on public.profiles (lower(email));
create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_status_idx on public.profiles (status);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- Sign-up trigger: create the profile with the role requested at sign-up
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.user_role;
begin
  -- Only "supplier" is honoured from client metadata: an admin can never be
  -- self-provisioned, and any other value safely degrades to "customer".
  if new.raw_user_meta_data ->> 'role' = 'supplier' then
    requested_role := 'supplier'::public.user_role;
  else
    requested_role := 'customer'::public.user_role;
  end if;

  insert into public.profiles (id, email, full_name, phone, role, status)
  values (
    new.id,
    lower(new.email),
    coalesce(nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''), split_part(new.email, '@', 1)),
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone', '')), ''),
    requested_role,
    'active'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- Privilege guard: owners may edit their own profile but never their role,
-- status or supplier tenant. Only admin RPCs / the service role may.
-- ------------------------------------------------------------
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- The service role (migrations, server-side jobs) bypasses the guard.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.status is distinct from old.status
     or new.supplier_id is distinct from old.supplier_id
     or new.email is distinct from old.email then
    raise exception 'Changing role, status or supplier access requires an administrator.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_privileges on public.profiles;
create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- ------------------------------------------------------------
-- Helpers
-- ------------------------------------------------------------

-- Is the caller an administrator? SECURITY DEFINER so RLS policies on
-- profiles can call it without recursing into their own policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.profiles p
     where p.id = auth.uid()
       and p.role = 'admin'
       and p.status = 'active'
  );
$$;

-- The caller's own profile, resolved server-side (used by the app shell).
create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select p.* from public.profiles p where p.id = auth.uid();
$$;

-- ------------------------------------------------------------
-- Row level security — profiles
-- ------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid());

drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles
  for select to authenticated
  using (public.is_admin());

-- Owners may edit their own details; the guard trigger rejects role/status
-- changes, so this policy cannot be used to escalate privileges.
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- No insert/delete policy: rows are created by the sign-up trigger and can
-- only be removed by an administrator via the service role.

-- ------------------------------------------------------------
-- supplier_applications — the KYC form behind the supplier role
-- ------------------------------------------------------------
create sequence if not exists public.supplier_application_ref_seq start 1;

create or replace function public.next_application_ref()
returns text
language plpgsql
as $$
begin
  return format(
    'APL-%s-%s',
    to_char(now(), 'YYYY'),
    lpad(nextval('public.supplier_application_ref_seq')::text, 3, '0')
  );
end;
$$;

create table if not exists public.supplier_applications (
  id                  uuid primary key default gen_random_uuid(),
  ref                 text not null default public.next_application_ref(),
  -- Set when the applicant already had a session while applying.
  applicant_id        uuid references auth.users (id) on delete set null,
  business_name       text not null,
  business_type       text not null,
  category_focus      text not null,
  website             text,
  contact_email       text not null,
  phone               text not null,
  city                text not null,
  area                text not null,
  registration_number text not null,
  director_name       text not null,
  director_id_type    text not null,
  director_id_number  text not null,
  operating_account   jsonb,
  documents           jsonb not null default '[]'::jsonb,
  status              public.kyc_status not null default 'pending',
  submitted_at        timestamptz not null default now(),
  reviewed_at         timestamptz,
  reviewed_by         uuid references auth.users (id) on delete set null,
  review_note         text,
  constraint supplier_applications_ref_not_blank check (btrim(ref) <> '')
);

comment on table public.supplier_applications is
  'Supplier KYC applications. Public form (anonymous insert), readable by its applicant and by administrators.';

create unique index if not exists supplier_applications_ref_key on public.supplier_applications (upper(ref));
create index if not exists supplier_applications_status_idx on public.supplier_applications (status, submitted_at desc);
create index if not exists supplier_applications_email_idx on public.supplier_applications (lower(contact_email));

alter table public.supplier_applications enable row level security;

-- Anyone may apply (the marketing form is public). An anonymous applicant can
-- only ever create an unowned row; a signed-in applicant may claim their own.
drop policy if exists supplier_applications_insert_public on public.supplier_applications;
create policy supplier_applications_insert_public on public.supplier_applications
  for insert to anon, authenticated
  with check (applicant_id is null or applicant_id = auth.uid());

drop policy if exists supplier_applications_select_own on public.supplier_applications;
create policy supplier_applications_select_own on public.supplier_applications
  for select to authenticated
  using (applicant_id = auth.uid());

drop policy if exists supplier_applications_select_admin on public.supplier_applications;
create policy supplier_applications_select_admin on public.supplier_applications
  for select to authenticated
  using (public.is_admin());

drop policy if exists supplier_applications_update_admin on public.supplier_applications;
create policy supplier_applications_update_admin on public.supplier_applications
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Status lookup by reference number (used by the public "check your status"
-- box). SECURITY DEFINER returns only the non-sensitive columns.
create or replace function public.application_status_by_ref(application_ref text)
returns table (
  ref text,
  business_name text,
  status public.kyc_status,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  review_note text
)
language sql
stable
security definer
set search_path = public
as $$
  select a.ref, a.business_name, a.status, a.submitted_at, a.reviewed_at, a.review_note
    from public.supplier_applications a
   where upper(a.ref) = upper(btrim(application_ref))
   limit 1;
$$;

-- ------------------------------------------------------------
-- Admin RPCs — every privileged action the admin UI performs
-- ------------------------------------------------------------

-- Promote / demote an account between customer and admin (suppliers are
-- promoted by approving their KYC application).
create or replace function public.admin_set_account_role(
  target uuid,
  new_role public.user_role
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required to change account roles.' using errcode = '42501';
  end if;

  if target = auth.uid() and new_role <> 'admin' then
    raise exception 'You cannot remove your own administrator access.' using errcode = '42501';
  end if;

  -- Never strand the platform without an administrator.
  if new_role <> 'admin' then
    if exists (select 1 from public.profiles p where p.id = target and p.role = 'admin')
       and (select count(*) from public.profiles p where p.role = 'admin') <= 1 then
      raise exception 'MedLink must keep at least one administrator account.' using errcode = '42501';
    end if;
  end if;

  update public.profiles
     set role = new_role,
         -- A demoted supplier loses tenant access; other transitions keep theirs.
         supplier_id = case when new_role = 'customer' then null else supplier_id end
   where id = target
  returning * into updated;

  if updated.id is null then
    raise exception 'Account % was not found.', target using errcode = 'P0002';
  end if;

  return updated;
end;
$$;

-- Suspend (revoke sign-in for) or reactivate an account.
create or replace function public.admin_set_account_status(
  target uuid,
  new_status public.account_status
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required to change account status.' using errcode = '42501';
  end if;

  if target = auth.uid() and new_status = 'suspended' then
    raise exception 'You cannot suspend your own administrator account.' using errcode = '42501';
  end if;

  update public.profiles
     set status = new_status
   where id = target
  returning * into updated;

  if updated.id is null then
    raise exception 'Account % was not found.', target using errcode = 'P0002';
  end if;

  return updated;
end;
$$;

-- Approve or reject a KYC application. Approval is what actually grants the
-- supplier role and attaches the marketplace tenant to the applicant.
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
  normalized_tenant text;
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required to review supplier applications.' using errcode = '42501';
  end if;

  normalized_tenant := nullif(btrim(coalesce(tenant_id, '')), '');

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

  if decision = 'approved' then
    -- Link the applicant through the email the application was submitted with:
    -- the account may have been created before or after the application.
    update public.profiles
       set role = 'supplier',
           supplier_id = coalesce(profiles.supplier_id, normalized_tenant)
     where lower(profiles.email) = lower(updated.contact_email);
  end if;

  return updated;
end;
$$;

-- ------------------------------------------------------------
-- Function grants — privileged RPCs are never callable anonymously
-- ------------------------------------------------------------
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.next_application_ref() from public, anon, authenticated;
revoke all on function public.admin_set_account_role(uuid, public.user_role) from public, anon;
revoke all on function public.admin_set_account_status(uuid, public.account_status) from public, anon;
revoke all on function public.admin_review_supplier_application(uuid, public.kyc_status, text, text) from public, anon;
revoke all on function public.application_status_by_ref(text) from public;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.current_profile() to authenticated;
grant execute on function public.admin_set_account_role(uuid, public.user_role) to authenticated;
grant execute on function public.admin_set_account_status(uuid, public.account_status) to authenticated;
grant execute on function public.admin_review_supplier_application(uuid, public.kyc_status, text, text) to authenticated;
grant execute on function public.application_status_by_ref(text) to anon, authenticated;

