/* ============================================================
   MedLink — the product taxonomy

   Categories are reference data, not marketplace content. The
   schema has always had a categories table with icon, gradient and
   sort_order columns for exactly this list, but the project was
   built "real data only", so the table shipped empty.

   An empty table is not a valid state for this app:

     • the KYC wizard requires a main product category, so supplier
       onboarding cannot be completed at all;
     • products.category_id is a foreign key into this table, so a
       supplier cannot list their first product;
     • the navbar, footer, home page, /categories, the shop filters
       and search all read from it.

   So this migration seeds the ten departments the marketplace is
   built around. They are real rows in the real table, editable and
   removable at /admin/categories like any other category — this is
   a starting taxonomy, not a fixture.

   Re-running is safe: the conflict target is the primary key, and
   nothing is overwritten, so a later admin rename always wins.

   The list is the one the app shipped with before the move to
   Supabase-backed data (see src/data/categories.ts at 99353f5), so
   no new taxonomy is being invented here.
   ============================================================ */

insert into public.categories (id, name, slug, description, icon, gradient, sort_order)
values
  (
    'cat-medical-equipment',
    'Medical Equipment',
    'medical-equipment',
    'Diagnostic and treatment devices for clinics, hospitals and labs.',
    'stethoscope',
    array['#0B1120', '#FFB74D'],
    10
  ),
  (
    'cat-diagnostic',
    'Diagnostic Equipment',
    'diagnostic-equipment',
    'Monitoring, testing and measurement instruments.',
    'activity',
    array['#EA580C', '#FFB74D'],
    20
  ),
  (
    'cat-laboratory',
    'Laboratory Supplies',
    'laboratory-supplies',
    'Lab instruments, reagents and consumables.',
    'flask',
    array['#B45309', '#F59E0B'],
    30
  ),
  (
    'cat-pharmacy',
    'Pharmacy Supplies',
    'pharmacy-supplies',
    'Medicines, sanitizers and pharmacy essentials.',
    'pill',
    array['#D97706', '#FFC868'],
    40
  ),
  (
    'cat-surgical',
    'Surgical Equipment',
    'surgical-equipment',
    'Surgical instruments, kits and theatre supplies.',
    'syringe',
    array['#0B1120', '#F59E0B'],
    50
  ),
  (
    'cat-ppe',
    'PPE & Safety',
    'ppe-and-safety',
    'Gloves, masks, gowns and protective gear.',
    'shield',
    array['#FB923C', '#F59E0B'],
    60
  ),
  (
    'cat-furniture',
    'Hospital Furniture',
    'hospital-furniture',
    'Beds, trolleys, couches and ward furniture.',
    'bed',
    array['#7C2D12', '#FB923C'],
    70
  ),
  (
    'cat-dental',
    'Dental Supplies',
    'dental-supplies',
    'Dental equipment, instruments and consumables.',
    'smile',
    array['#92400E', '#FFB74D'],
    80
  ),
  (
    'cat-rehab',
    'Rehabilitation Equipment',
    'rehabilitation-equipment',
    'Mobility aids and therapy equipment.',
    'accessibility',
    array['#C2410C', '#D97706'],
    90
  ),
  (
    'cat-consumables',
    'Consumables',
    'consumables',
    'Daily-use disposables and single-use items.',
    'package',
    array['#8A8F98', '#FFB74D'],
    100
  )
on conflict (id) do nothing;

comment on table public.categories is
  'Product taxonomy. Seeded with the ten departments the marketplace is built '
  'around; edit freely at /admin/categories. Categories gate what suppliers '
  'can sell, so the KYC form and the product form both read from here.';
