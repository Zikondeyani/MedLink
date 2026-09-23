/* ============================================================
   MedLink — shared live store
   Front-end only: module-level state + useSyncExternalStore so
   Admins, supplier applications and the public marketplace all
   observe the same data without a backend.
   ============================================================ */
import { useSyncExternalStore } from "react";
import type {
  Category,
  CustomerOrderStatus,
  DeliveryQuote,
  KycStatus,
  Order,
  PayoutRecord,
  PaymentTransaction,
  PricingConfig,
  Supplier,
  SupplierApplication,
  SupplierOperatingAccount,
} from "../data/types";
import { categories as seedCategories } from "../data/categories";
import { suppliers as seedSuppliers } from "../data/suppliers";
import { seedApplications } from "../data/applications";
import { customerOrders } from "../data/orders";
import { seedPayouts, seedPaymentTransactions, seedPricing, seedReleasedOrders } from "../data/transactions";

type Listener = () => void;
const listeners = new Set<Listener>();

let categories: Category[] = [...seedCategories];
let suppliers: Supplier[] = [...seedSuppliers];
let applications: SupplierApplication[] = [...seedApplications];

/* Escrow / payouts: which order ids have been settled per supplier */
let releasedOrders: Record<string, string[]> = { ...seedReleasedOrders };
let payouts: PayoutRecord[] = [...seedPayouts];
let paymentTransactions: PaymentTransaction[] = [...seedPaymentTransactions];

/* MedLink pricing — admin-editable via the Pricing page (no hard-coded fee). */
let pricing: PricingConfig = { ...seedPricing };

export function getPricing(): PricingConfig {
  return pricing;
}

/** Pick a live delivery fee quote for a buyer address city. */
export function quoteDelivery(city: string): DeliveryQuote {
  const p = pricing;
  const deliveryFees = p.deliveryFees ?? {};
  const fee = deliveryFees[city] ?? p.defaultDeliveryFee ?? 7500;
  return { baseFee: fee, estimated: "1–2 days" };
}

/** MedLink's share of the goods value on an order (live admin rate). */
export function serviceFee(subtotal: number): number {
  return Math.round(subtotal * getPricing().serviceFeeRate);
}

export function usePricing(): PricingConfig {
  return useStore(() => pricing);
}

/** Persist an admin's pricing change (rate + delivery fees) app-wide. */
export function updatePricingConfig(patch: Partial<PricingConfig>): void {
  pricing = { ...pricing, ...patch };
  emit();
}

/* Admin-only session flags (products, orders, customers) */
type ProductFlags = Record<string, { featured?: boolean; hidden?: boolean }>;
type OrderStatusMap = Record<string, CustomerOrderStatus>;
type CustomerFlags = Record<string, { blocked?: boolean }>;
let productFlags: ProductFlags = {};
let orderStatuses: OrderStatusMap = {};
let customerFlags: CustomerFlags = {};

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(): void {
  listeners.forEach((l) => l());
}

function useStore<T>(getSnapshot: () => T): T {
  return useSyncExternalStore(subscribe, getSnapshot);
}

/* ---------- helpers ---------- */

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const REF_COUNTER_SEED = 49;
let refCounter = REF_COUNTER_SEED;

function nextApplicationRef(): string {
  refCounter += 1;
  return `APL-2026-${String(refCounter).padStart(3, "0")}`;
}

/* ---------- categories ---------- */

export function useCategories(): Category[] {
  return useStore(() => categories);
}

export function getCategoryById(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

export function addCategory(input: {
  name: string;
  description: string;
  icon: string;
}): Category {
  const base = slugify(input.name) || "category";
  const category: Category = {
    id: `cat-${base}-${Date.now().toString(36)}`,
    name: input.name.trim(),
    slug: `${base}-${Date.now().toString(36).slice(-4)}`,
    description: input.description.trim(),
    icon: input.icon,
    productCount: 0,
    gradient: ["#0B1120", "#FFB74D"],
  };
  categories = [...categories, category];
  emit();
  return category;
}

export function updateCategory(id: string, patch: Partial<Pick<Category, "name" | "description" | "icon">>): void {
  categories = categories.map((c) =>
    c.id === id
      ? {
          ...c,
          name: patch.name?.trim() ?? c.name,
          description: patch.description?.trim() ?? c.description,
          icon: patch.icon ?? c.icon,
        }
      : c,
  );
  emit();
}

export function removeCategory(id: string): void {
  categories = categories.filter((c) => c.id !== id);
  emit();
}

/* ---------- suppliers ---------- */

export function useSuppliers(): Supplier[] {
  return useStore(() => suppliers);
}

export function getSupplierById(id: string): Supplier | undefined {
  return suppliers.find((s) => s.id === id);
}

export function getSupplierBySlug(slug: string): Supplier | undefined {
  return suppliers.find((s) => s.slug === slug);
}

export function setSupplierSuspended(id: string, suspended: boolean): void {
  suppliers = suppliers.map((s) => (s.id === id ? { ...s, suspended } : s));
  emit();
}

export function toggleSupplierVerified(id: string): void {
  suppliers = suppliers.map((s) => (s.id === id ? { ...s, verified: !s.verified } : s));
  emit();
}

export function removeSupplier(id: string): void {
  suppliers = suppliers.filter((s) => s.id !== id);
  emit();
}

function addSupplierFromApplication(app: SupplierApplication): void {
  const base = slugify(app.businessName);
  if (suppliers.some((s) => s.slug === base)) return;
  const supplier: Supplier = {
    id: `sup-${base}`,
    name: app.businessName,
    slug: base,
    color: "#F59E0B",
    verified: true,
    category: app.categoryFocus,
    rating: 0,
    reviewCount: 0,
    productCount: 0,
    location: { city: app.city, area: app.area },
    phone: app.phone,
    email: app.email,
    description:
      `${app.businessName} is a ${app.businessType.toLocaleLowerCase()} registered on MedLink after passing KYC verification. ` +
      `Focused on ${app.categoryFocus.toLocaleLowerCase()} for healthcare buyers across Malawi.`,
    bannerGradient: ["#0B1120", "#F59E0B"],
    delivery: { fee: 5000, estimate: "2–3 days" },
    joined: new Date().toLocaleString("en-GB", { month: "short", year: "numeric" }),
    art: 1 as Supplier["art"],
  };
  if (app.operatingAccount) supplier.operatingAccount = app.operatingAccount;
  suppliers = [...suppliers, supplier];
}

/* ---------- applications / KYC ---------- */

export function useApplications(): SupplierApplication[] {
  return useStore(() => applications);
}

export function getApplicationById(id: string): SupplierApplication | undefined {
  return applications.find((a) => a.id === id);
}

export function getApplicationByRef(ref: string): SupplierApplication | undefined {
  const term = ref.trim().toUpperCase();
  return applications.find((a) => a.ref.toUpperCase() === term);
}

export function submitSupplierApplication(
  input: Omit<SupplierApplication, "id" | "ref" | "status" | "submittedAt">,
): SupplierApplication {
  const application: SupplierApplication = {
    ...input,
    id: `app-${Date.now().toString(36)}`,
    ref: nextApplicationRef(),
    status: "pending",
    submittedAt: new Date().toISOString(),
  };
  applications = [application, ...applications];
  emit();
  return application;
}

export function reviewApplication(id: string, status: KycStatus, note?: string): void {
  const now = new Date().toISOString();
  applications = applications.map((a) =>
    a.id === id ? { ...a, status, reviewedAt: now, reviewNote: note?.trim() } : a,
  );
  if (status === "approved") {
    const app = applications.find((a) => a.id === id);
    if (app) addSupplierFromApplication(app);
  }
  emit();
}

/* ---------- product flags (admin) ---------- */

export function useProductFlags(): ProductFlags {
  return useStore(() => productFlags);
}

export function toggleProductFeatured(id: string): void {
  productFlags = { ...productFlags, [id]: { ...productFlags[id], featured: !productFlags[id]?.featured } };
  emit();
}

export function setProductHidden(id: string, hidden: boolean): void {
  productFlags = { ...productFlags, [id]: { ...productFlags[id], hidden } };
  emit();
}

/* ---------- order status overrides (admin) ---------- */

export function useOrderStatuses(): OrderStatusMap {
  return useStore(() => orderStatuses);
}

export function setOrderStatus(id: string, status: CustomerOrderStatus): void {
  orderStatuses = { ...orderStatuses, [id]: status };
  emit();
}

/* ---------- customer flags (admin) ---------- */

export function useCustomerFlags(): CustomerFlags {
  return useStore(() => customerFlags);
}

export function toggleCustomerBlocked(id: string): void {
  customerFlags = { ...customerFlags, [id]: { blocked: !customerFlags[id]?.blocked } };
  emit();
}

/* ---------- escrow & payouts (admin) ---------- */

function supplierGoods(order: Order, supplierId: string): number {
  return order.lines
    .filter((l) => l.supplierId === supplierId)
    .reduce((sum, l) => sum + l.price * l.quantity, 0);
}

export interface SupplierEscrow {
  heldAmount: number;
  orderCount: number;
  orderIds: string[];
  orderNumbers: string[];
  /** MedLink 10% service fee retained on the held value */
  serviceFee: number;
}

/** Buyer funds still held by MedLink for a supplier (non-cancelled, unreleased orders). */
export function supplierEscrow(supplierId: string, released?: Record<string, string[]>): SupplierEscrow {
  const releasedMap = released ?? releasedOrders;
  const releasedSet = new Set(releasedMap[supplierId] ?? []);
  const held = customerOrders.filter(
    (o) => o.status !== "cancelled" && !releasedSet.has(o.id) && o.lines.some((l) => l.supplierId === supplierId),
  );
  const heldAmount = held.reduce((sum, o) => sum + supplierGoods(o, supplierId), 0);
  return {
    heldAmount,
    orderCount: held.length,
    orderIds: held.map((o) => o.id),
    orderNumbers: held.map((o) => o.number),
    serviceFee: Math.round(heldAmount * getPricing().serviceFeeRate),
  };
}

/** Which order ids have been settled (released) per supplier. */
export function useReleasedOrders(): Record<string, string[]> {
  return useStore(() => releasedOrders);
}

/** Masked payout destination for display, e.g. "National Bank of Malawi · **4451". */
export function payoutAccountSummary(account?: SupplierOperatingAccount | undefined): string {
  if (!account) return "No payout account on file";
  const masked = `**${account.accountNumber.trim().slice(-4)}`;
  return `${account.bankName} · ${masked}`;
}

/** Release all held buyer funds for a supplier to their operating account. */
export function releaseSupplierFunds(supplierId: string): PayoutRecord | null {
  const escrow = supplierEscrow(supplierId);
  if (escrow.orderCount === 0 || escrow.heldAmount <= 0) return null;
  const supplier = suppliers.find((s) => s.id === supplierId);
  if (!supplier) return null;

  const record: PayoutRecord = {
    id: `pay-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    supplierId,
    amount: escrow.heldAmount,
    serviceFee: escrow.serviceFee,
    orderNumbers: escrow.orderNumbers,
    releasedAt: new Date().toISOString(),
    method: "Bank transfer",
    accountSummary: payoutAccountSummary(supplier.operatingAccount),
  };

  payouts = [record, ...payouts];
  releasedOrders = {
    ...releasedOrders,
    [supplierId]: [...(releasedOrders[supplierId] ?? []), ...escrow.orderIds],
  };
  emit();
  return record;
}

export function usePayouts(): PayoutRecord[] {
  return useStore(() => payouts);
}

/** Buyer payment attempts (succeeded / failed). Succeeded funds enter escrow. */
export function usePaymentTransactions(): PaymentTransaction[] {
  return useStore(() => paymentTransactions);
}

export function getPaymentTransaction(id: string): PaymentTransaction | undefined {
  return paymentTransactions.find((t) => t.id === id);
}