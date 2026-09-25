import { useMemo, useSyncExternalStore } from "react";
import { customerOrders as seedOrders, savedAddresses as seedAddresses, DEMO_BUYER_EMAIL } from "../data/orders";
import type {
  CustomerOrderStatus,
  DeliveryAddress,
  Order,
  OrderLine,
  OrderTimelineEntry,
  PaymentInfo,
  PaymentMethod,
  SavedAddress,
} from "../data/types";

/**
 * Customer-owned data lives behind a small client-side store in this demo.
 * The production equivalent must enforce the same ownership rules on the
 * server; localStorage is not an authorization boundary.
 */
const ORDERS_KEY = "medlink.customer.orders.v1";
const ADDRESSES_KEY = "medlink.customer.addresses.v1";

type Listener = () => void;
const listeners = new Set<Listener>();

let orders: Order[] = readOrders();
let addresses: SavedAddress[] = readAddresses();

const ORDER_STATUSES: CustomerOrderStatus[] = [
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
];
const PAYMENT_METHODS: PaymentMethod[] = ["Mobile Money", "Bank Card", "Bank Transfer"];

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Subscribe to customer-store changes for financial/admin projections. */
export function subscribeCustomerData(listener: Listener): () => void {
  return subscribe(listener);
}

function emit(): void {
  listeners.forEach((listener) => listener());
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === "string" && PAYMENT_METHODS.includes(value as PaymentMethod);
}

function isOrderStatus(value: unknown): value is CustomerOrderStatus {
  return typeof value === "string" && ORDER_STATUSES.includes(value as CustomerOrderStatus);
}

function isDeliveryAddress(value: unknown): value is DeliveryAddress {
  if (!isRecord(value)) return false;
  return (
    typeof value.fullName === "string" &&
    typeof value.phone === "string" &&
    typeof value.address === "string" &&
    typeof value.city === "string" &&
    typeof value.area === "string" &&
    typeof value.instructions === "string" &&
    (value.label === undefined || typeof value.label === "string")
  );
}

function isOrderLine(value: unknown): value is OrderLine {
  if (!isRecord(value)) return false;
  return (
    typeof value.productId === "string" &&
    typeof value.name === "string" &&
    isFiniteNonNegative(value.price) &&
    typeof value.quantity === "number" &&
    Number.isInteger(value.quantity) &&
    value.quantity > 0 &&
    typeof value.unit === "string" &&
    typeof value.supplierId === "string" &&
    typeof value.supplierName === "string" &&
    typeof value.image === "string"
  );
}

function isTimelineEntry(value: unknown): value is OrderTimelineEntry {
  if (!isRecord(value)) return false;
  return isOrderStatus(value.status) && typeof value.at === "string" && (value.note === undefined || typeof value.note === "string");
}

function isPaymentInfo(value: unknown): value is PaymentInfo {
  return isRecord(value) && isPaymentMethod(value.method) && typeof value.reference === "string" && value.reference.length <= 120;
}

/**
 * Keep only a display-safe payment reference in client persistence. Raw
 * mobile-money numbers, card numbers and bank details must never be stored in
 * an order or transaction record.
 */
export function maskPaymentReference(method: PaymentMethod, reference: string): string {
  const value = reference.trim();
  if (method === "Mobile Money") {
    const digits = value.replace(/\D/g, "");
    return `Mobile Money · xx${digits.slice(-4) || "0000"}`;
  }
  if (method === "Bank Card") {
    const digits = value.replace(/\D/g, "");
    return `Bank Card · xx${digits.slice(-4) || "0000"}`;
  }
  return "Bank Transfer · reference submitted";
}

function isOrder(value: unknown): value is Order {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.customerEmail === "string" &&
    typeof value.number === "string" &&
    typeof value.placedAt === "string" &&
    typeof value.customerName === "string" &&
    isDeliveryAddress(value.address) &&
    Array.isArray(value.lines) &&
    value.lines.length > 0 &&
    value.lines.every(isOrderLine) &&
    isFiniteNonNegative(value.subtotal) &&
    (value.serviceFee === undefined || isFiniteNonNegative(value.serviceFee)) &&
    isFiniteNonNegative(value.deliveryFee) &&
    isFiniteNonNegative(value.total) &&
    isOrderStatus(value.status) &&
    isPaymentInfo(value.payment) &&
    typeof value.estimatedDelivery === "string" &&
    Array.isArray(value.timeline) &&
    value.timeline.every(isTimelineEntry)
  );
}

function isAddress(value: unknown): value is SavedAddress {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.customerEmail === "string" &&
    typeof value.fullName === "string" &&
    typeof value.phone === "string" &&
    typeof value.address === "string" &&
    typeof value.city === "string" &&
    typeof value.area === "string" &&
    typeof value.instructions === "string" &&
    (value.label === undefined || typeof value.label === "string") &&
    typeof value.isDefault === "boolean"
  );
}

function orderSort(a: Order, b: Order): number {
  const aTime = Date.parse(a.placedAt);
  const bTime = Date.parse(b.placedAt);
  if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
  if (Number.isNaN(aTime)) return 1;
  if (Number.isNaN(bTime)) return -1;
  return bTime - aTime;
}

function normalizeOrder(order: Order): Order {
  return {
    ...order,
    customerEmail: normalizeEmail(order.customerEmail),
    address: { ...order.address },
    lines: order.lines.map((line) => ({ ...line })),
    payment: {
      method: order.payment.method,
      reference: maskPaymentReference(order.payment.method, order.payment.reference),
    },
    timeline: order.timeline.map((entry) => ({ ...entry })),
  };
}

function readOrders(): Order[] {
  const seed = seedOrders.map(normalizeOrder);
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const stored = Array.isArray(parsed) ? parsed.filter(isOrder) : [];
    const byId = new Map<string, Order>(seed.map((order) => [order.id, order]));
    for (const order of stored) byId.set(order.id, normalizeOrder(order));
    return [...byId.values()].sort(orderSort);
  } catch {
    return seed.sort(orderSort);
  }
}

function readAddresses(): SavedAddress[] {
  const seed = seedAddresses.map((address) => ({
    ...address,
    customerEmail: normalizeEmail(address.customerEmail || DEMO_BUYER_EMAIL),
  }));
  try {
    const raw = localStorage.getItem(ADDRESSES_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const stored = Array.isArray(parsed) ? parsed.filter(isAddress) : [];
    const byId = new Map<string, SavedAddress>(seed.map((address) => [address.id, address]));
    for (const address of stored) byId.set(address.id, { ...address, customerEmail: normalizeEmail(address.customerEmail) });
    return [...byId.values()];
  } catch {
    return seed;
  }
}

function persistOrders(): void {
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  } catch {
    /* storage unavailable — keep the in-memory demo working */
  }
}

function persistAddresses(): void {
  try {
    localStorage.setItem(ADDRESSES_KEY, JSON.stringify(addresses));
  } catch {
    /* storage unavailable — keep the in-memory demo working */
  }
}

/** All marketplace orders. This selector is intentionally for admin/escrow surfaces. */
export function useOrders(): Order[] {
  return useSyncExternalStore(subscribe, () => orders, () => orders);
}

/** Orders belonging to one authenticated customer only. */
export function useCustomerOrders(customerEmail: string): Order[] {
  const allOrders = useOrders();
  const email = normalizeEmail(customerEmail);
  return useMemo(
    () => allOrders.filter((order) => normalizeEmail(order.customerEmail) === email).sort(orderSort),
    [allOrders, email],
  );
}

/** Reactive, ownership-scoped order lookup for customer detail routes. */
export function useCustomerOrderById(id: string | undefined, customerEmail: string): Order | undefined {
  const ownedOrders = useCustomerOrders(customerEmail);
  return useMemo(() => (id ? ownedOrders.find((order) => order.id === id) : undefined), [id, ownedOrders]);
}

export function useCustomerAddresses(customerEmail: string): SavedAddress[] {
  const allAddresses = useSyncExternalStore(subscribe, () => addresses, () => addresses);
  const email = normalizeEmail(customerEmail);
  return useMemo(
    () => allAddresses.filter((address) => normalizeEmail(address.customerEmail) === email),
    [allAddresses, email],
  );
}

/** Admin/registry snapshot. Customer pages must use the scoped selectors above. */
export function getAllOrders(): Order[] {
  return orders;
}

export function getOrderById(id: string): Order | undefined {
  return orders.find((order) => order.id === id);
}

export function getCustomerOrderById(id: string, customerEmail: string): Order | undefined {
  const email = normalizeEmail(customerEmail);
  return orders.find((order) => order.id === id && normalizeEmail(order.customerEmail) === email);
}

export function getCustomerAddresses(customerEmail: string): SavedAddress[] {
  const email = normalizeEmail(customerEmail);
  return addresses.filter((address) => normalizeEmail(address.customerEmail) === email);
}

export function getDefaultCustomerAddress(customerEmail: string): SavedAddress | undefined {
  const owned = getCustomerAddresses(customerEmail);
  return owned.find((address) => address.isDefault) ?? owned[0];
}

function nextOrderId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `ord-${crypto.randomUUID()}`;
  }
  return `ord-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nextOrderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  let sequence = orders.length + 1;
  let number = `ML-${date}-${String(sequence).padStart(3, "0")}`;
  while (orders.some((order) => order.number === number)) {
    sequence += 1;
    number = `ML-${date}-${String(sequence).padStart(3, "0")}`;
  }
  return number;
}

export interface CreateCustomerOrderInput {
  customerEmail: string;
  customerName: string;
  address: DeliveryAddress;
  lines: OrderLine[];
  /** Captured at checkout; the demo store does not recalculate historical fees. */
  serviceFee: number;
  deliveryFee: number;
  /** Accepted for call-site compatibility; totals are recalculated from lines and captured fees. */
  subtotal?: number;
  total?: number;
  payment: PaymentInfo;
}

/** Persist a newly placed demo order to its authenticated customer. */
export function createCustomerOrder(input: CreateCustomerOrderInput): Order {
  if (!input.lines.length) throw new Error("An order must contain at least one product line.");
  const now = new Date().toISOString();
  const lines = input.lines.map((line) => ({
    ...line,
    name: line.name.trim(),
    supplierId: line.supplierId.trim(),
    supplierName: line.supplierName.trim(),
  }));
  const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const serviceFee = Math.max(0, Math.round(input.serviceFee));
  const deliveryFee = Math.max(0, Math.round(input.deliveryFee));
  const order: Order = {
    id: nextOrderId(),
    customerEmail: normalizeEmail(input.customerEmail),
    number: nextOrderNumber(),
    placedAt: now,
    customerName: input.customerName.trim() || nameFromEmail(input.customerEmail),
    address: { ...input.address },
    lines,
    subtotal,
    serviceFee,
    deliveryFee,
    total: subtotal + serviceFee + deliveryFee,
    status: "confirmed",
    payment: {
      method: input.payment.method,
      reference: maskPaymentReference(input.payment.method, input.payment.reference),
    },
    estimatedDelivery: "1–2 days",
    timeline: [{ status: "confirmed", at: now, note: "Order confirmed by MedLink" }],
  };
  orders = [order, ...orders].sort(orderSort);
  persistOrders();
  emit();
  return order;
}

/** Persist a canonical fulfilment status and append an audit timeline entry. */
export function updateCustomerOrderStatus(id: string, status: CustomerOrderStatus, note?: string): Order | undefined {
  const now = new Date().toISOString();
  let updated: Order | undefined;
  orders = orders.map((order) => {
    if (order.id !== id) return order;
    updated = {
      ...order,
      status,
      timeline: [
        ...order.timeline,
        { status, at: now, note: note?.trim() || undefined },
      ],
    };
    return updated;
  });
  if (!updated) return undefined;
  persistOrders();
  emit();
  return updated;
}

function addressMatches(left: DeliveryAddress, right: DeliveryAddress): boolean {
  return (
    left.fullName.trim() === right.fullName.trim() &&
    left.phone.trim() === right.phone.trim() &&
    left.address.trim() === right.address.trim() &&
    left.city.trim() === right.city.trim() &&
    left.area.trim() === right.area.trim()
  );
}

/** Save the address used at checkout under the same customer account. */
export function saveCustomerAddress(
  customerEmail: string,
  address: DeliveryAddress,
  label = "Delivery address",
): SavedAddress {
  const email = normalizeEmail(customerEmail);
  const existing = getCustomerAddresses(email);
  const duplicate = existing.find((item) => addressMatches(item, address));
  if (duplicate) return duplicate;
  const saved: SavedAddress = {
    ...address,
    id: `addr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    customerEmail: email,
    label,
    isDefault: existing.length === 0 || !existing.some((item) => item.isDefault),
  };
  addresses = [
    saved,
    ...addresses.map((item) =>
      normalizeEmail(item.customerEmail) === email && saved.isDefault ? { ...item, isDefault: false } : item,
    ),
  ];
  persistAddresses();
  emit();
  return saved;
}

export function updateCustomerAddress(
  customerEmail: string,
  id: string,
  patch: Partial<DeliveryAddress> & { label?: string },
): SavedAddress | undefined {
  const email = normalizeEmail(customerEmail);
  let updated: SavedAddress | undefined;
  addresses = addresses.map((address) => {
    if (normalizeEmail(address.customerEmail) !== email || address.id !== id) return address;
    updated = { ...address, ...patch, customerEmail: email, id: address.id };
    return updated;
  });
  if (!updated) return undefined;
  persistAddresses();
  emit();
  return updated;
}

export function deleteCustomerAddress(customerEmail: string, id: string): void {
  const email = normalizeEmail(customerEmail);
  const owned = getCustomerAddresses(email);
  const removed = owned.find((address) => address.id === id);
  if (!removed) return;
  addresses = addresses.filter((address) => !(normalizeEmail(address.customerEmail) === email && address.id === id));
  if (removed.isDefault) {
    const replacement = getCustomerAddresses(email)[0];
    if (replacement) {
      addresses = addresses.map((address) =>
        normalizeEmail(address.customerEmail) === email && address.id === replacement.id
          ? { ...address, isDefault: true }
          : address,
      );
    }
  }
  persistAddresses();
  emit();
}

export function setDefaultCustomerAddress(customerEmail: string, id: string): void {
  const email = normalizeEmail(customerEmail);
  if (!getCustomerAddresses(email).some((address) => address.id === id)) return;
  addresses = addresses.map((address) =>
    normalizeEmail(address.customerEmail) === email ? { ...address, isDefault: address.id === id } : address,
  );
  persistAddresses();
  emit();
}

function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "customer";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Customer";
}
