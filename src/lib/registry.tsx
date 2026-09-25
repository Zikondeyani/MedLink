/* ============================================================
   MedLink — shared live store
   Front-end only: module-level state + useSyncExternalStore so
   Admins, supplier applications and the public marketplace all
   observe the same data without a backend.
   ============================================================ */
import { useSyncExternalStore } from "react";
import type {
  ApplicationDocument,
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
import { getAllOrders, updateCustomerOrderStatus } from "./customerData";
import { seedPayouts, seedPaymentTransactions, seedPricing, seedReleasedOrders } from "../data/transactions";

type Listener = () => void;
const listeners = new Set<Listener>();
const PAYMENT_TRANSACTIONS_KEY = "medlink.registry.payment-transactions.v1";
const RELEASED_ORDERS_KEY = "medlink.registry.released-orders.v1";
const PAYOUTS_KEY = "medlink.registry.payouts.v1";
const APPLICATIONS_KEY = "medlink.registry.applications.v1";
const SUPPLIERS_KEY = "medlink.registry.suppliers.v1";

/* ---------- persistence helpers ----------
   Registry collections are merged on top of their localStorage copies so admin
   actions (KYC review, suspension, escrow release) survive a page reload. */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/* ---------- suppliers ---------- */

function isSupplierDelivery(value: unknown): value is Supplier["delivery"] {
  if (!isRecord(value)) return false;
  return isFiniteNonNegative(value.fee) && typeof value.estimate === "string";
}

function isOperatingAccount(value: unknown): value is SupplierOperatingAccount {
  if (!isRecord(value)) return false;
  return (
    typeof value.bankName === "string" &&
    typeof value.accountName === "string" &&
    typeof value.accountNumber === "string" &&
    (value.branch === undefined || typeof value.branch === "string") &&
    (value.mobileMoney === undefined || typeof value.mobileMoney === "string")
  );
}

function isSupplier(value: unknown): value is Supplier {
  if (!isRecord(value)) return false;
  const location = value.location;
  const bannerGradient = value.bannerGradient;
  return (
    typeof value.id === "string" &&
    (value.applicationId === undefined || typeof value.applicationId === "string") &&
    typeof value.name === "string" &&
    typeof value.slug === "string" &&
    typeof value.color === "string" &&
    typeof value.verified === "boolean" &&
    (value.suspended === undefined || typeof value.suspended === "boolean") &&
    typeof value.category === "string" &&
    isFiniteNonNegative(value.rating) &&
    isFiniteNonNegative(value.reviewCount) &&
    isFiniteNonNegative(value.productCount) &&
    isRecord(location) &&
    typeof location.city === "string" &&
    typeof location.area === "string" &&
    typeof value.phone === "string" &&
    typeof value.email === "string" &&
    typeof value.description === "string" &&
    Array.isArray(bannerGradient) &&
    bannerGradient.length === 2 &&
    bannerGradient.every((stop) => typeof stop === "string") &&
    isSupplierDelivery(value.delivery) &&
    typeof value.joined === "string" &&
    isFiniteNonNegative(value.art) &&
    (value.operatingAccount === undefined || isOperatingAccount(value.operatingAccount))
  );
}

function readSuppliers(): Supplier[] {
  try {
    const raw = localStorage.getItem(SUPPLIERS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const stored = Array.isArray(parsed) ? parsed.filter(isSupplier) : [];
    const byId = new Map<string, Supplier>(seedSuppliers.map((supplier) => [supplier.id, supplier]));
    for (const supplier of stored) byId.set(supplier.id, supplier);
    return [...byId.values()];
  } catch {
    return [...seedSuppliers];
  }
}

function persistSuppliers(): void {
  try {
    localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(suppliers));
  } catch {
    /* storage unavailable — keep the in-memory demo working */
  }
}

/* ---------- supplier applications / KYC ---------- */

const KYC_STATUSES: KycStatus[] = ["pending", "approved", "rejected"];

function isKycStatus(value: unknown): value is KycStatus {
  return typeof value === "string" && KYC_STATUSES.includes(value as KycStatus);
}

function isApplicationDocument(value: unknown): value is ApplicationDocument {
  if (!isRecord(value)) return false;
  return (
    typeof value.label === "string" &&
    typeof value.name === "string" &&
    typeof value.size === "string" &&
    typeof value.uploadedAt === "string"
  );
}

function isSupplierApplication(value: unknown): value is SupplierApplication {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.ref === "string" &&
    typeof value.businessName === "string" &&
    typeof value.businessType === "string" &&
    typeof value.categoryFocus === "string" &&
    (value.website === undefined || typeof value.website === "string") &&
    typeof value.email === "string" &&
    typeof value.phone === "string" &&
    typeof value.city === "string" &&
    typeof value.area === "string" &&
    typeof value.registrationNumber === "string" &&
    typeof value.directorName === "string" &&
    typeof value.directorIdType === "string" &&
    typeof value.directorIdNumber === "string" &&
    Array.isArray(value.documents) &&
    value.documents.every(isApplicationDocument) &&
    isKycStatus(value.status) &&
    typeof value.submittedAt === "string" &&
    (value.reviewedAt === undefined || typeof value.reviewedAt === "string") &&
    (value.reviewNote === undefined || typeof value.reviewNote === "string") &&
    (value.operatingAccount === undefined || isOperatingAccount(value.operatingAccount))
  );
}

/** Newest first, so an application submitted this session keeps its place at the top. */
function readApplications(): SupplierApplication[] {
  try {
    const raw = localStorage.getItem(APPLICATIONS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const stored = Array.isArray(parsed) ? parsed.filter(isSupplierApplication) : [];
    const known = new Set(seedApplications.map((application) => application.id));
    const byId = new Map<string, SupplierApplication>(
      seedApplications.map((application) => [application.id, application]),
    );
    const submitted: SupplierApplication[] = [];
    for (const application of stored) {
      if (known.has(application.id)) byId.set(application.id, application);
      else submitted.push(application);
    }
    return [...submitted, ...byId.values()];
  } catch {
    return [...seedApplications];
  }
}

function persistApplications(): void {
  try {
    localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(applications));
  } catch {
    /* storage unavailable — keep the in-memory demo working */
  }
}

let categories: Category[] = [...seedCategories];
let suppliers: Supplier[] = readSuppliers();
let applications: SupplierApplication[] = readApplications();

/* ---------- escrow releases & payouts ---------- */

function readReleasedOrders(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(RELEASED_ORDERS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!isRecord(parsed)) return { ...seedReleasedOrders };
    const merged: Record<string, string[]> = { ...seedReleasedOrders };
    for (const [supplierId, orderIds] of Object.entries(parsed)) {
      if (!isStringList(orderIds)) continue;
      merged[supplierId] = [...new Set([...(seedReleasedOrders[supplierId] ?? []), ...orderIds])];
    }
    return merged;
  } catch {
    return { ...seedReleasedOrders };
  }
}

function persistReleasedOrders(): void {
  try {
    localStorage.setItem(RELEASED_ORDERS_KEY, JSON.stringify(releasedOrders));
  } catch {
    /* storage unavailable — keep the in-memory demo working */
  }
}

function isPayoutRecord(value: unknown): value is PayoutRecord {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.supplierId === "string" &&
    isFiniteNonNegative(value.amount) &&
    isFiniteNonNegative(value.serviceFee) &&
    isStringList(value.orderNumbers) &&
    typeof value.releasedAt === "string" &&
    typeof value.method === "string" &&
    typeof value.accountSummary === "string"
  );
}

/** Newest first, so a release made this session keeps its place at the top. */
function readPayouts(): PayoutRecord[] {
  try {
    const raw = localStorage.getItem(PAYOUTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const stored = Array.isArray(parsed) ? parsed.filter(isPayoutRecord) : [];
    const known = new Set(seedPayouts.map((payout) => payout.id));
    const byId = new Map<string, PayoutRecord>(seedPayouts.map((payout) => [payout.id, payout]));
    const released: PayoutRecord[] = [];
    for (const payout of stored) {
      if (known.has(payout.id)) byId.set(payout.id, payout);
      else released.push(payout);
    }
    return [...released, ...byId.values()];
  } catch {
    return [...seedPayouts];
  }
}

function persistPayouts(): void {
  try {
    localStorage.setItem(PAYOUTS_KEY, JSON.stringify(payouts));
  } catch {
    /* storage unavailable — keep the in-memory demo working */
  }
}

/* Escrow / payouts: which order ids have been settled per supplier */
let releasedOrders: Record<string, string[]> = readReleasedOrders();
let payouts: PayoutRecord[] = readPayouts();

function isPaymentTransaction(value: unknown): value is PaymentTransaction {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    (value.orderId === undefined || typeof value.orderId === "string") &&
    typeof value.orderNumber === "string" &&
    typeof value.customerName === "string" &&
    typeof value.method === "string" &&
    typeof value.reference === "string" &&
    typeof value.amount === "number" &&
    typeof value.goods === "number" &&
    typeof value.serviceFee === "number" &&
    typeof value.deliveryFee === "number" &&
    (value.status === "succeeded" || value.status === "failed" || value.status === "refunded") &&
    typeof value.paidAt === "string"
  );
}

function readPaymentTransactions(): PaymentTransaction[] {
  try {
    const raw = localStorage.getItem(PAYMENT_TRANSACTIONS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const stored = Array.isArray(parsed) ? parsed.filter(isPaymentTransaction) : [];
    const byId = new Map<string, PaymentTransaction>(
      [...seedPaymentTransactions, ...stored].map((transaction) => [transaction.id, transaction]),
    );
    return [...byId.values()];
  } catch {
    return [...seedPaymentTransactions];
  }
}

let paymentTransactions: PaymentTransaction[] = readPaymentTransactions();

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
  persistSuppliers();
  emit();
}

export function toggleSupplierVerified(id: string): void {
  suppliers = suppliers.map((s) => (s.id === id ? { ...s, verified: !s.verified } : s));
  persistSuppliers();
  emit();
}

export function removeSupplier(id: string): void {
  suppliers = suppliers.filter((s) => s.id !== id);
  persistSuppliers();
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
  persistSuppliers();
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

/**
 * Create the local projection of a supplier application. `refOverride` lets the
 * caller reuse the reference number issued by the Postgres backend so the admin
 * queue and the server row stay addressable by the same reference.
 */
export function submitSupplierApplication(
  input: Omit<SupplierApplication, "id" | "ref" | "status" | "submittedAt">,
  refOverride?: string,
): SupplierApplication {
  const application: SupplierApplication = {
    ...input,
    id: `app-${Date.now().toString(36)}`,
    ref: refOverride?.trim() || nextApplicationRef(),
    status: "pending",
    submittedAt: new Date().toISOString(),
  };
  applications = [application, ...applications];
  persistApplications();
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
  persistApplications();
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
  // Write through to the canonical buyer order so the change is persisted and the
  // buyer timeline records that MedLink moved the fulfilment status.
  updateCustomerOrderStatus(id, status, "Status updated by MedLink admin");
  emit();
}

export function effectiveOrderStatus(order: Order): CustomerOrderStatus {
  return orderStatuses[order.id] ?? order.status;
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
  const held = getAllOrders().filter(
    (order) =>
      effectiveOrderStatus(order) !== "cancelled" &&
      !releasedSet.has(order.id) &&
      order.lines.some((line) => line.supplierId === supplierId),
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
  persistPayouts();
  persistReleasedOrders();
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

function persistPaymentTransactions(): void {
  try {
    localStorage.setItem(PAYMENT_TRANSACTIONS_KEY, JSON.stringify(paymentTransactions));
  } catch {
    /* storage unavailable — keep the in-memory demo working */
  }
}

/** Record the safe payment reference already stored on a completed order. */
export function recordOrderPayment(order: Order): PaymentTransaction {
  const existing = order.id ? paymentTransactions.find((transaction) => transaction.orderId === order.id) : undefined;
  if (existing) return existing;

  const serviceFee = order.serviceFee ?? Math.round(order.subtotal * getPricing().serviceFeeRate);
  const transaction: PaymentTransaction = {
    id: `paytxn-${order.id}`,
    orderId: order.id,
    orderNumber: order.number,
    customerName: order.customerName,
    method: order.payment.method,
    reference: order.payment.reference,
    amount: order.total,
    goods: order.subtotal,
    serviceFee,
    deliveryFee: order.deliveryFee,
    status: "succeeded",
    paidAt: order.placedAt,
  };
  paymentTransactions = [transaction, ...paymentTransactions];
  persistPaymentTransactions();
  emit();
  return transaction;
}

export function getPaymentTransaction(id: string): PaymentTransaction | undefined {
  return paymentTransactions.find((t) => t.id === id);
}