-- ============================================================
-- MedLink — 0003 · admin read access to every marketplace row
--
-- 0002 gave the admin console write access to suppliers/products but
-- no SELECT policy, so a suspended store or a draft product was
-- invisible to the administrators who must moderate it. RLS policies
-- are OR-ed, so these two policies widen reads only for admins.
-- ============================================================

drop policy if exists suppliers_select_admin on public.suppliers;
create policy suppliers_select_admin on public.suppliers
  for select to authenticated using (public.is_admin());

drop policy if exists products_select_admin on public.products;
create policy products_select_admin on public.products
  for select to authenticated using (public.is_admin());

-- A supplier account must be able to read its own store row even while
-- an administrator has suspended it, otherwise the owner loses access to
-- the dashboard that would let them fix the problem.
drop policy if exists suppliers_select_own_read on public.suppliers;
create policy suppliers_select_own_read on public.suppliers
  for select to authenticated using (owner_id = auth.uid());
