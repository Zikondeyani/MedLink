-- ============================================================
-- MedLink — 0002 · Marketplace data (real records, no mock data)
--
-- Everything the app used to fake in localStorage now lives here:
--   suppliers · products · categories · orders · order_items
--   supplier_orders · payments · payouts · released_orders
--   addresses · notifications · pricing_config
--
-- Rules of this schema
--   • Nothing is seeded. Tables start empty; rows only exist because a
--     real person signed up, applied for KYC, added a product or bought.
--   • The browser never chooses prices, fees or totals: `place_order()`
--     and `admin_release_supplier_funds()` are SECURITY DEFINER and
--     recompute every money value from the tables.
--   • RLS is deny-by-default. Customers see their own rows, suppliers see
--     their own tenant, admins see everything, the public marketplace sees
--     only published rows.
--   • Cloudinary holds the bytes; Postgres holds only the HTTPS URL
--     (products.image/images, suppliers.banner_image/logo_image,
--     profiles.avatar_url, supplier_applications.documents).
-- ============================================================

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------
do $$ begin create type public.product_status as enum ('active', 'draft', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin create type public.customer_order_status as enum
  ('confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin create type public.supplier_order_status as enum
  ('new', 'confirmed', 'preparing', 'ready', 'completed');
exception when duplicate_object then null; end $$;

do $$ begin create type public.payment_method as enum ('Mobile Money', 'Bank Card', 'Bank Transfer');
exception when duplicate_object then null; end $$;

do $$ begin create type public.payment_status as enum ('succeeded', 'failed', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin create type public.notification_type as enum ('order', 'delivery', 'payment', 'system');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- profile additions: avatar (Cloudinary URL) + customer block flag
-- ------------------------------------------------------------
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists blocked boolean not null default false;

comment on column public.profiles.avatar_url is
  'Cloudinary HTTPS URL of the account profile photo.';
comment on column public.profiles.blocked is
  'Administrator block flag for customer accounts (distinct from suspension).';

-- ------------------------------------------------------------
-- categories — administrator-managed taxonomy
-- ------------------------------------------------------------
create table if not exists public.categories (
  id          text primary key,
  name        text not null,
  slug        text not null unique,
  description text not null default '',
  icon        text not null default 'package',
  gradient    text[] not null default array['#0B1120', '#FFB74D'],
  sort_order  int  not null default 100,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint categories_name_not_blank check (btrim(name) <> '')
);

comment on table public.categories is 'Product taxonomy. Empty until an admin adds the first one.';
create index if not exists categories_sort_idx on public.categories (sort_order, name);

-- ------------------------------------------------------------
-- suppliers — one marketplace tenant per approved KYC application
-- ------------------------------------------------------------
create table if not exists public.suppliers (
  id                text primary key default ('sup-' || substr(gen_random_uuid()::text, 1, 10)),
  application_id    uuid unique references public.supplier_applications (id) on delete set null,
  -- The account that owns this store. NULL until the applicant signs up.
  owner_id          uuid references auth.users (id) on delete set null,
  name              text not null,
  slug              text not null unique,
  category          text not null default '',
  color             text not null default '#F59E0B',
  verified          boolean not null default false,
  suspended         boolean not null default false,
  rating            numeric(2, 1) not null default 0,
  review_count      int not null default 0,
  city              text not null default '',
  area              text not null default '',
  phone             text not null default '',
  email             text not null default '',
  description       text not null default '',
  banner_gradient   text[] not null default array['#0B1120', '#F59E0B'],
  banner_image      text,
  logo_image        text,
  delivery_fee      numeric(12, 2) not null default 0,
  delivery_estimate text not null default '1–2 days',
  operating_account jsonb,
  joined            timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint suppliers_name_not_blank check (btrim(name) <> '')
);

comment on table public.suppliers is
  'Marketplace stores. A row is created only when an administrator approves a KYC application.';
create index if not exists suppliers_owner_idx on public.suppliers (owner_id);
create index if not exists suppliers_visible_idx on public.suppliers (suspended, verified desc);

-- ------------------------------------------------------------
-- products — owned by a supplier tenant
-- ------------------------------------------------------------
create table if not exists public.products (
  id           text primary key default ('prd-' || substr(gen_random_uuid()::text, 1, 10)),
  supplier_id  text not null references public.suppliers (id) on delete cascade,
  category_id  text references public.categories (id) on delete set null,
  name         text not null,
  slug         text not null unique,
  description  text not null default '',
  price        numeric(12, 2) not null default 0 check (price >= 0),
  unit         text not null default 'unit',
  stock        int not null default 0 check (stock >= 0),
  brand        text not null default '',
  model        text not null default '',
  sku          text not null default '',
  specs        jsonb not null default '[]'::jsonb,
  warranty     text not null default '',
  is_new       boolean not null default false,
  featured     boolean not null default false,
  hidden       boolean not null default false,
  tags         text[] not null default '{}',
  image        text,
  images       text[] not null default '{}',
  status       public.product_status not null default 'draft',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint products_name_not_blank check (btrim(name) <> '')
);

comment on table public.products is
  'Catalogue rows written by suppliers. Only status=''active'' and not hidden are public.';
create index if not exists products_supplier_idx on public.products (supplier_id);
create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_public_idx on public.products (status, hidden, created_at desc);

-- ------------------------------------------------------------
-- orders (buyer facing) + order_items
-- ------------------------------------------------------------
create table if not exists public.orders (
  id                 uuid primary key default gen_random_uuid(),
  number             text not null unique,
  customer_id        uuid references auth.users (id) on delete set null,
  customer_email     text not null,
  customer_name      text not null default '',
  address            jsonb not null default '{}'::jsonb,
  subtotal           numeric(12, 2) not null default 0,
  service_fee        numeric(12, 2) not null default 0,
  delivery_fee       numeric(12, 2) not null default 0,
  total              numeric(12, 2) not null default 0,
  status             public.customer_order_status not null default 'confirmed',
  payment_method     public.payment_method not null default 'Mobile Money',
  payment_reference  text not null default '',
  estimated_delivery text not null default '1–2 days',
  timeline           jsonb not null default '[]'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.orders is 'Buyer orders. Created only by the place_order() RPC.';
create index if not exists orders_customer_idx on public.orders (customer_id, created_at desc);
create index if not exists orders_email_idx on public.orders (lower(customer_email), created_at desc);
create index if not exists orders_status_idx on public.orders (status, created_at desc);

create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  product_id  text references public.products (id) on delete set null,
  supplier_id text not null references public.suppliers (id) on delete cascade,
  name        text not null,
  unit        text not null default 'unit',
  price       numeric(12, 2) not null,
  quantity    int not null check (quantity > 0),
  image       text
);

create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_items_supplier_idx on public.order_items (supplier_id);

-- ------------------------------------------------------------
-- supplier_orders — per-store fulfilment projection of an order
-- ------------------------------------------------------------
create table if not exists public.supplier_orders (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid references public.orders (id) on delete cascade,
  supplier_id    text not null references public.suppliers (id) on delete cascade,
  number         text not null,
  customer_id    uuid references auth.users (id) on delete set null,
  customer_email text not null default '',
  customer_name  text not null default '',
  customer_org   text not null default '',
  customer_phone text not null default '',
  city           text not null default '',
  area           text not null default '',
  subtotal       numeric(12, 2) not null default 0,
  delivery_fee   numeric(12, 2) not null default 0,
  total          numeric(12, 2) not null default 0,
  status         public.supplier_order_status not null default 'new',
  items_total    int not null default 0,
  payment_method public.payment_method not null default 'Mobile Money',
  note           text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists supplier_orders_supplier_idx on public.supplier_orders (supplier_id, created_at desc);
create index if not exists supplier_orders_order_idx on public.supplier_orders (order_id);

-- ------------------------------------------------------------
-- payments · payouts · escrow release ledger
-- ------------------------------------------------------------
create table if not exists public.payments (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid references public.orders (id) on delete set null,
  order_number   text not null,
  customer_id    uuid references auth.users (id) on delete set null,
  customer_email text not null default '',
  customer_name  text not null default '',
  method         public.payment_method not null,
  reference      text not null default '',
  amount         numeric(12, 2) not null default 0,
  goods          numeric(12, 2) not null default 0,
  service_fee    numeric(12, 2) not null default 0,
  delivery_fee   numeric(12, 2) not null default 0,
  status         public.payment_status not null default 'succeeded',
  failure_reason text,
  paid_at        timestamptz not null default now(),
  refunded_at    timestamptz
);

create index if not exists payments_order_idx on public.payments (order_id);
create index if not exists payments_email_idx on public.payments (lower(customer_email), paid_at desc);

create table if not exists public.payouts (
  id             uuid primary key default gen_random_uuid(),
  supplier_id    text not null references public.suppliers (id) on delete cascade,
  amount         numeric(12, 2) not null default 0,
  service_fee    numeric(12, 2) not null default 0,
  order_numbers  text[] not null default '{}',
  method         text not null default 'Bank transfer',
  account_summary text not null default '',
  released_by    uuid references auth.users (id) on delete set null,
  released_at    timestamptz not null default now()
);

create index if not exists payouts_supplier_idx on public.payouts (supplier_id, released_at desc);

create table if not exists public.released_orders (
  supplier_id text not null references public.suppliers (id) on delete cascade,
  order_id    uuid not null references public.orders (id) on delete cascade,
  payout_id   uuid references public.payouts (id) on delete set null,
  released_at timestamptz not null default now(),
  primary key (supplier_id, order_id)
);

-- ------------------------------------------------------------
-- addresses (buyer delivery book)
-- ------------------------------------------------------------
create table if not exists public.addresses (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid references auth.users (id) on delete cascade,
  customer_email text not null,
  full_name      text not null default '',
  phone          text not null default '',
  address        text not null default '',
  city           text not null default '',
  area           text not null default '',
  instructions   text not null default '',
  label          text,
  is_default     boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists addresses_customer_idx on public.addresses (customer_id);

-- ------------------------------------------------------------
-- notifications
-- ------------------------------------------------------------
create table if not exists public.notifications (
  id             uuid primary key default gen_random_uuid(),
  type           public.notification_type not null default 'system',
  title          text not null,
  message        text not null default '',
  icon           text not null default 'info',
  read           boolean not null default false,
  customer_id    uuid references auth.users (id) on delete cascade,
  customer_email text,
  supplier_id    text references public.suppliers (id) on delete cascade,
  order_id       uuid references public.orders (id) on delete cascade,
  order_number   text,
  created_at     timestamptz not null default now()
);

create index if not exists notifications_customer_idx on public.notifications (customer_id, created_at desc);
create index if not exists notifications_supplier_idx on public.notifications (supplier_id, created_at desc);

-- ------------------------------------------------------------
-- pricing_config — one row, platform pricing the admin controls
-- ------------------------------------------------------------
create table if not exists public.pricing_config (
  id                  boolean primary key default true,
  service_fee_rate    numeric(4, 3) not null default 0.1 check (service_fee_rate >= 0 and service_fee_rate < 1),
  default_delivery_fee numeric(12, 2) not null default 7500 check (default_delivery_fee >= 0),
  delivery_fees       jsonb not null default '{}'::jsonb,
  updated_at          timestamptz not null default now(),
  constraint pricing_config_singleton check (id)
);

comment on table public.pricing_config is
  'Single-row platform pricing. Defaults only — real delivery fees are added by an admin.';

insert into public.pricing_config (id) values (true) on conflict (id) do nothing;

-- ------------------------------------------------------------
-- updated_at triggers
-- ------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'categories', 'suppliers', 'products', 'orders', 'supplier_orders',
    'addresses'
  ] loop
    execute format('drop trigger if exists %I_touch_updated_at on public.%I', t, t);
    execute format(
      'create trigger %I_touch_updated_at before update on public.%I '
      'for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- Helpers
-- ------------------------------------------------------------

-- Slug helper: lowercase, dash-only. Used for supplier slugs (KYC approval).
create or replace function public.slugify(text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(btrim(coalesce($1, ''))), '[^a-z0-9]+', '-', 'g'));
$$;

-- Does the caller own this store? SECURITY DEFINER avoids recursing through
-- the suppliers RLS policy.
create or replace function public.owns_supplier(target text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.suppliers s
     where s.id = target
       and s.owner_id = auth.uid()
  );
$$;

-- A supplier owner may edit the presentation of their own store, never its
-- trust columns. Mirrors guard_profile_privileges().
create or replace function public.guard_supplier_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.verified is distinct from old.verified
     or new.suspended is distinct from old.suspended
     or new.rating is distinct from old.rating
     or new.review_count is distinct from old.review_count
     or new.owner_id is distinct from old.owner_id
     or new.joined is distinct from old.joined then
    raise exception 'Changing verification, suspension or ratings requires an administrator.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists suppliers_guard_privileges on public.suppliers;
create trigger suppliers_guard_privileges
  before update on public.suppliers
  for each row execute function public.guard_supplier_privileges();

-- ------------------------------------------------------------
-- Row level security
-- ------------------------------------------------------------
alter table public.categories      enable row level security;
alter table public.suppliers       enable row level security;
alter table public.products        enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;
alter table public.supplier_orders enable row level security;
alter table public.payments        enable row level security;
alter table public.payouts         enable row level security;
alter table public.released_orders enable row level security;
alter table public.addresses       enable row level security;
alter table public.notifications   enable row level security;
alter table public.pricing_config  enable row level security;

-- categories — public read, admin write
drop policy if exists categories_select_public on public.categories;
create policy categories_select_public on public.categories
  for select to anon, authenticated using (true);

drop policy if exists categories_insert_admin on public.categories;
create policy categories_insert_admin on public.categories
  for insert to authenticated with check (public.is_admin());

drop policy if exists categories_update_admin on public.categories;
create policy categories_update_admin on public.categories
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists categories_delete_admin on public.categories;
create policy categories_delete_admin on public.categories
  for delete to authenticated using (public.is_admin());

-- suppliers — public read of live stores; owner reads/edits own; admin all
drop policy if exists suppliers_select_public on public.suppliers;
create policy suppliers_select_public on public.suppliers
  for select to anon, authenticated using (not suspended);

drop policy if exists suppliers_select_owner on public.suppliers;
create policy suppliers_select_owner on public.suppliers
  for select to authenticated using (public.owns_supplier(id));

drop policy if exists suppliers_update_owner on public.suppliers;
create policy suppliers_update_owner on public.suppliers
  for update to authenticated
  using (public.owns_supplier(id))
  with check (public.owns_supplier(id));

drop policy if exists suppliers_update_admin on public.suppliers;
create policy suppliers_update_admin on public.suppliers
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists suppliers_delete_admin on public.suppliers;
create policy suppliers_delete_admin on public.suppliers
  for delete to authenticated using (public.is_admin());

-- products — public read of published rows; supplier owner manages own
drop policy if exists products_select_public on public.products;
create policy products_select_public on public.products
  for select to anon, authenticated
  using (status = 'active' and not hidden);

drop policy if exists products_select_owner on public.products;
create policy products_select_owner on public.products
  for select to authenticated using (public.owns_supplier(supplier_id));

drop policy if exists products_insert_owner on public.products;
create policy products_insert_owner on public.products
  for insert to authenticated
  with check (public.owns_supplier(supplier_id) or public.is_admin());

drop policy if exists products_update_owner on public.products;
create policy products_update_owner on public.products
  for update to authenticated
  using (public.owns_supplier(supplier_id) or public.is_admin())
  with check (public.owns_supplier(supplier_id) or public.is_admin());

drop policy if exists products_delete_owner on public.products;
create policy products_delete_owner on public.products
  for delete to authenticated
  using (public.owns_supplier(supplier_id) or public.is_admin());

-- orders — buyer reads own; admin all
drop policy if exists orders_select_own on public.orders;
create policy orders_select_own on public.orders
  for select to authenticated
  using (customer_id = auth.uid() or public.is_admin());

drop policy if exists orders_update_admin on public.orders;
create policy orders_update_admin on public.orders
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- order_items — visible with the parent order, or to the store that must fulfil it
drop policy if exists order_items_select_parent on public.order_items;
create policy order_items_select_parent on public.order_items
  for select to authenticated
  using (
    exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or public.is_admin()))
    or public.owns_supplier(supplier_id)
  );

-- supplier_orders — the store sees its own fulfilment queue; admin all
drop policy if exists supplier_orders_select_owner on public.supplier_orders;
create policy supplier_orders_select_owner on public.supplier_orders
  for select to authenticated
  using (public.owns_supplier(supplier_id) or public.is_admin());

drop policy if exists supplier_orders_update_owner on public.supplier_orders;
create policy supplier_orders_update_owner on public.supplier_orders
  for update to authenticated
  using (public.owns_supplier(supplier_id) or public.is_admin())
  with check (public.owns_supplier(supplier_id) or public.is_admin());

-- payments — buyer + admin only (no public exposure of references)
drop policy if exists payments_select_own on public.payments;
create policy payments_select_own on public.payments
  for select to authenticated
  using (customer_id = auth.uid() or public.is_admin());

drop policy if exists payments_update_admin on public.payments;
create policy payments_update_admin on public.payments
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- payouts + escrow ledger — admin only
drop policy if exists payouts_select_admin on public.payouts;
create policy payouts_select_admin on public.payouts
  for select to authenticated using (public.is_admin());

drop policy if exists payouts_insert_admin on public.payouts;
create policy payouts_insert_admin on public.payouts
  for insert to authenticated with check (public.is_admin());

drop policy if exists released_orders_select_admin on public.released_orders;
create policy released_orders_select_admin on public.released_orders
  for select to authenticated using (public.is_admin());

-- addresses — owner only
drop policy if exists addresses_select_own on public.addresses;
create policy addresses_select_own on public.addresses
  for select to authenticated
  using (customer_id = auth.uid() or public.is_admin());

drop policy if exists addresses_insert_own on public.addresses;
create policy addresses_insert_own on public.addresses
  for insert to authenticated
  with check (customer_id is null or customer_id = auth.uid());

drop policy if exists addresses_update_own on public.addresses;
create policy addresses_update_own on public.addresses
  for update to authenticated
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());

drop policy if exists addresses_delete_own on public.addresses;
create policy addresses_delete_own on public.addresses
  for delete to authenticated using (customer_id = auth.uid());

-- notifications — recipient only
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (
    customer_id = auth.uid()
    or public.is_admin()
    or public.owns_supplier(supplier_id)
  );

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (customer_id = auth.uid() or public.owns_supplier(supplier_id) or public.is_admin())
  with check (customer_id = auth.uid() or public.owns_supplier(supplier_id) or public.is_admin());

-- pricing_config — public read, admin write
drop policy if exists pricing_config_select_public on public.pricing_config;
create policy pricing_config_select_public on public.pricing_config
  for select to anon, authenticated using (true);

drop policy if exists pricing_config_update_admin on public.pricing_config;
create policy pricing_config_update_admin on public.pricing_config
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- place_order() — the only way an order can be created
--
-- The client sends product ids + quantities only. Prices, stock, fees and
-- totals are recomputed here, then the order, its items, the per-store
-- fulfilment rows, the payment and the notifications are written in one
-- transaction. SECURITY DEFINER so RLS cannot block the projection rows.
-- ------------------------------------------------------------
create or replace function public.next_order_number()
returns text
language plpgsql
as $$
begin
  return 'MDL-' || to_char(now(), 'YYYY') || '-' ||
         lpad((nextval('public.order_number_seq'))::text, 5, '0');
end;
$$;

create sequence if not exists public.order_number_seq start 1;

create or replace function public.place_order(
  p_items jsonb,
  p_address jsonb,
  p_payment_method public.payment_method,
  p_payment_reference text,
  p_estimated_delivery text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_email     text;
  v_name      text;
  v_row       public.profiles;
  v_pricing   public.pricing_config;
  v_item      jsonb;
  v_product   public.products;
  v_order     public.orders;
  v_payment   public.payments;
  v_so        public.supplier_orders;
  v_order_id  uuid;
  v_number    text;
  v_qty       int;
  v_subtotal  numeric(12, 2) := 0;
  v_fee       numeric(12, 2) := 0;
  v_delivery  numeric(12, 2);
  v_total     numeric(12, 2);
  v_sid       text;
  v_sub       numeric(12, 2);
  v_items     int;
  v_addr      jsonb := coalesce(p_address, '{}'::jsonb);
  v_method    public.payment_method := coalesce(p_payment_method, 'Mobile Money');
  v_estimate  text := coalesce(nullif(p_estimated_delivery, ''), '1–2 days');
begin
  if v_uid is null then
    raise exception 'Sign in to place an order.' using errcode = '42501';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Your order has no items.' using errcode = '22023';
  end if;

  select * into v_row from public.profiles where id = v_uid;
  if v_row.id is null then
    raise exception 'Your account profile is missing.' using errcode = '42501';
  end if;
  if v_row.status <> 'active' or v_row.blocked then
    raise exception 'This account cannot place orders.' using errcode = '42501';
  end if;
  v_email := v_row.email;
  v_name  := v_row.full_name;

  select * into v_pricing from public.pricing_config where id;
  v_delivery := v_pricing.default_delivery_fee;

  -- Recompute every line from the catalogue.
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := coalesce((v_item ->> 'quantity')::int, 0);
    if v_qty <= 0 then
      raise exception 'Every order line needs a quantity of at least 1.' using errcode = '22023';
    end if;

    select * into v_product
      from public.products
     where id = (v_item ->> 'product_id') and status = 'active' and not hidden;

    if v_product.id is null then
      raise exception 'One of the products is no longer available.' using errcode = '22023';
    end if;
    if v_product.stock < v_qty then
      raise exception 'Only % of % % left in stock.', v_product.stock, v_product.name, v_product.unit;
    end if;

    v_subtotal := v_subtotal + (v_product.price * v_qty);

    update public.products
       set stock = stock - v_qty
     where id = v_product.id;
  end loop;

  v_fee   := round(v_subtotal * v_pricing.service_fee_rate);
  v_total := v_subtotal + v_fee + v_delivery;

  v_number := public.next_order_number();

  insert into public.orders (
    number, customer_id, customer_email, customer_name, address,
    subtotal, service_fee, delivery_fee, total, status,
    payment_method, payment_reference, estimated_delivery, timeline
  ) values (
    v_number, v_uid, v_email, v_name, v_addr,
    v_subtotal, v_fee, v_delivery, v_total, 'confirmed',
    v_method, coalesce(nullif(btrim(p_payment_reference), ''), 'pending'), v_estimate,
    jsonb_build_array(jsonb_build_object('status', 'confirmed', 'at', now(), 'note', 'Order placed'))
  )
  returning * into v_order;
  v_order_id := v_order.id;

  -- Items, inserted in the order the cart held them.
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := coalesce((v_item ->> 'quantity')::int, 0);
    select * into v_product from public.products where id = (v_item ->> 'product_id');

    insert into public.order_items (order_id, product_id, supplier_id, name, unit, price, quantity, image)
    values (v_order_id, v_product.id, v_product.supplier_id, v_product.name, v_product.unit,
            v_product.price, v_qty, v_product.image);
  end loop;

  -- One fulfilment row per store involved.
  for v_sid in
    select distinct supplier_id from public.order_items where order_id = v_order_id
  loop
    select sum(oi.price * oi.quantity), count(*)
      into v_sub, v_items
      from public.order_items oi
     where oi.order_id = v_order_id and oi.supplier_id = v_sid;

    insert into public.supplier_orders (
      order_id, supplier_id, number, customer_id, customer_email, customer_name,
      customer_org, customer_phone, city, area, subtotal, delivery_fee, total,
      status, items_total, payment_method, note
    ) values (
      v_order_id, v_sid, v_number, v_uid, v_email, v_name,
      coalesce(v_addr ->> 'full_name', v_name), coalesce(v_addr ->> 'phone', ''),
      coalesce(v_addr ->> 'city', ''), coalesce(v_addr ->> 'area', ''),
      v_sub, 0, v_sub, 'new', v_items, v_method, coalesce(v_addr ->> 'instructions', '')
    );
  end loop;

  -- Escrow entry: the buyer payment MedLink holds for the stores.
  insert into public.payments (
    order_id, order_number, customer_id, customer_email, customer_name,
    method, reference, amount, goods, service_fee, delivery_fee, status
  ) values (
    v_order_id, v_number, v_uid, v_email, v_name,
    v_method, coalesce(nullif(btrim(p_payment_reference), ''), 'pending'),
    v_total, v_subtotal, v_fee, v_delivery, 'succeeded'
  );

  insert into public.notifications (type, title, message, icon, customer_id, customer_email, order_id, order_number)
  values ('order', 'Order ' || v_number || ' confirmed',
          'We received your order and are confirming stock with the stores.', 'package',
          v_uid, v_email, v_order_id, v_number);

  return jsonb_build_object(
    'order_id', v_order_id,
    'number', v_number,
    'subtotal', v_subtotal,
    'service_fee', v_fee,
    'delivery_fee', v_delivery,
    'total', v_total
  );
end;
$$;

-- ------------------------------------------------------------
-- admin_release_supplier_funds() — escrow release / payout
-- ------------------------------------------------------------
create or replace function public.admin_release_supplier_funds(target_supplier text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_supplier  public.suppliers;
  v_payout    public.payouts;
  v_so        record;
  v_held      numeric(12, 2);
  v_numbers   text[] := '{}';
  v_order_ids uuid[] := '{}';
  v_fee       numeric(12, 2);
  v_pricing   public.pricing_config;
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required to release escrow.' using errcode = '42501';
  end if;

  select * into v_supplier from public.suppliers where id = target_supplier;
  if v_supplier.id is null then
    raise exception 'Supplier % was not found.', target_supplier using errcode = 'P0002';
  end if;

  for v_so in
    select so.id, so.order_id, so.number, so.subtotal
      from public.supplier_orders so
      join public.orders o on o.id = so.order_id
      left join public.released_orders ro
             on ro.supplier_id = so.supplier_id and ro.order_id = so.order_id
     where so.supplier_id = target_supplier
       and so.status <> 'completed'
       and o.status <> 'cancelled'
       and ro.order_id is null
  loop
    v_held      := coalesce(v_held, 0) + v_so.subtotal;
    v_numbers   := array_append(v_numbers, v_so.number);
    v_order_ids := array_append(v_order_ids, v_so.order_id);
  end loop;

  if coalesce(v_held, 0) <= 0 then
    return jsonb_build_object('released', false, 'reason', 'No held funds to release.');
  end if;

  select * into v_pricing from public.pricing_config where id;
  v_fee := round(v_held * v_pricing.service_fee_rate);

  insert into public.payouts (supplier_id, amount, service_fee, order_numbers, method, account_summary, released_by)
  values (
    target_supplier, v_held, v_fee, v_numbers, 'Bank transfer',
    case when v_supplier.operating_account ->> 'accountNumber' is null
         then 'No payout account on file'
         else v_supplier.operating_account ->> 'bankName' || ' · **' ||
              right(v_supplier.operating_account ->> 'accountNumber', 4)
    end,
    auth.uid()
  )
  returning * into v_payout;

  insert into public.released_orders (supplier_id, order_id, payout_id)
  select target_supplier, unnest(v_order_ids), v_payout.id;

  return jsonb_build_object(
    'released', true,
    'payout_id', v_payout.id,
    'amount', v_payout.amount,
    'service_fee', v_payout.service_fee,
    'order_numbers', to_jsonb(v_numbers)
  );
end;
$$;

-- ------------------------------------------------------------
-- KYC approval now also creates the supplier tenant
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

  if decision = 'approved' then
    select id into v_profile_id
      from public.profiles
     where lower(email) = lower(updated.contact_email);

    v_supplier_id := coalesce(
      nullif(btrim(coalesce(tenant_id, '')), ''),
      (select s.id from public.suppliers s where s.application_id = updated.id),
      'sup-' || substr(md5(lower(updated.business_name) || updated.id::text), 1, 10)
    );

    insert into public.suppliers (
      id, application_id, owner_id, name, slug, category, city, area,
      phone, email, description, verified, operating_account
    ) values (
      v_supplier_id,
      updated.id,
      v_profile_id,
      updated.business_name,
      -- readable but collision-proof: business name + a slice of the application id
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
      set application_id = excluded.application_id,
          owner_id        = coalesce(public.suppliers.owner_id, excluded.owner_id),
          name            = excluded.name,
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
  end if;

  return updated;
end;
$$;

-- The slug column needs a lowercase, dash-only form of the business name.
alter table public.suppliers drop constraint if exists suppliers_slug_format;
alter table public.suppliers add constraint suppliers_slug_format
  check (slug = lower(slug) and slug ~ '^[a-z0-9][a-z0-9-]*$');

-- ------------------------------------------------------------
-- Admin: block / unblock a customer account
-- ------------------------------------------------------------
create or replace function public.admin_set_customer_blocked(target uuid, blocked boolean)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required to block accounts.' using errcode = '42501';
  end if;

  update public.profiles set blocked = blocked where id = target returning * into updated;
  if updated.id is null then
    raise exception 'Account % was not found.', target using errcode = 'P0002';
  end if;
  return updated;
end;
$$;

-- The profiles privilege guard must not block the blocked-flag write, but it
-- must still protect role/status/supplier_id/email from owners.
-- (guard_profile_privileges already ignores `blocked`.)

-- ------------------------------------------------------------
-- Function grants
-- ------------------------------------------------------------
revoke all on function public.next_order_number() from public, anon, authenticated;
revoke all on function public.next_application_ref() from public, anon, authenticated;
revoke all on function public.admin_review_supplier_application(uuid, public.kyc_status, text, text) from public, anon;
revoke all on function public.admin_release_supplier_funds(text) from public, anon;
revoke all on function public.admin_set_customer_blocked(uuid, boolean) from public, anon;
revoke all on function public.owns_supplier(text) from public, anon;
revoke all on function public.slugify(text) from public, anon, authenticated;

grant execute on function public.owns_supplier(text) to authenticated;
grant execute on function public.slugify(text) to authenticated;
grant execute on function public.next_order_number() to authenticated;
grant execute on function public.place_order(jsonb, jsonb, public.payment_method, text, text) to authenticated;
grant execute on function public.admin_release_supplier_funds(text) to authenticated;
grant execute on function public.admin_set_customer_blocked(uuid, boolean) to authenticated;
grant execute on function public.admin_review_supplier_application(uuid, public.kyc_status, text, text) to authenticated;
