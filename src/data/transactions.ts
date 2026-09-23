import type { PayoutRecord, PaymentTransaction, PricingConfig } from "./types";

/* ============================================================
   Escrow / payouts — seed state
   Buyer payments are held by MedLink until delivery is
   confirmed, then released to the supplier's operating account.
   ============================================================ */

/** Default MedLink service fee (10% of product value). Admins can change it. */
export const SERVICE_FEE_RATE = 0.1;

/** Default platform pricing — editable by admins from the Pricing page. */
export const seedPricing: PricingConfig = {
  serviceFeeRate: SERVICE_FEE_RATE,
  deliveryFees: { Lilongwe: 5000, Blantyre: 6000, Mzuzu: 8000, Zomba: 7000 },
  defaultDeliveryFee: 7500,
};

/**
 * Order ids whose escrow has already been released to each supplier.
 * Anything else (non-cancelled) is still held by MedLink.
 */
export const seedReleasedOrders: Record<string, string[]> = {
  "sup-medequip": [],
  // ord-001 still in escrow for MedEquip (out for delivery)
  "sup-safeguard": ["ord-004"], // ord-001 still held
  "sup-pharmaplus": ["ord-002", "ord-004"],
  "sup-labcare": ["ord-005"],
  // ord-003 delivered but funds not yet released to Apex (new supplier)
  "sup-apex": [],
};

/** Historical releases so the payout ledger has content on first load. */
export const seedPayouts: PayoutRecord[] = [
  {
    id: "pay-0003",
    supplierId: "sup-labcare",
    amount: 620000,
    serviceFee: 62000,
    orderNumbers: ["ML-20260812-005"],
    releasedAt: "2026-08-15T11:05:00.000Z",
    method: "Bank transfer",
    accountSummary: "FMB (First Capital Bank) · **7710",
  },
  {
    id: "pay-0002",
    supplierId: "sup-pharmaplus",
    amount: 95000,
    serviceFee: 9500,
    orderNumbers: ["ML-20260918-014", "ML-20260830-021"],
    releasedAt: "2026-09-03T09:40:00.000Z",
    method: "Bank transfer",
    accountSummary: "Standard Bank · **3321",
  },
  {
    id: "pay-0001",
    supplierId: "sup-safeguard",
    amount: 45000,
    serviceFee: 4500,
    orderNumbers: ["ML-20260830-021"],
    releasedAt: "2026-09-01T10:12:00.000Z",
    method: "Bank transfer",
    accountSummary: "NBS Bank · **2290",
  },
];

/**
 * Buyer payment attempts. Succeeded payments put goods value into escrow;
 * failed attempts never create an order and never enter escrow.
 */
export const seedPaymentTransactions: PaymentTransaction[] = [
  {
    id: "paytxn-001",
    orderId: "ord-001",
    orderNumber: "ML-20260922-001",
    customerName: "Thandiwe Banda",
    method: "Mobile Money",
    reference: "Airtel · xx3451",
    amount: 303100,
    goods: 271000,
    serviceFee: 27100,
    deliveryFee: 5000,
    status: "succeeded",
    paidAt: "2026-09-22T09:41:00.000Z",
  },
  {
    id: "paytxn-002",
    orderId: "ord-002",
    orderNumber: "ML-20260918-014",
    customerName: "Thandiwe Banda",
    method: "Bank Card",
    reference: "Mastercard · xx8820",
    amount: 66100,
    goods: 56000,
    serviceFee: 5600,
    deliveryFee: 4500,
    status: "succeeded",
    paidAt: "2026-09-18T14:02:00.000Z",
  },
  {
    id: "paytxn-003",
    orderId: "ord-003",
    orderNumber: "ML-20260910-008",
    customerName: "Thandiwe Banda",
    method: "Bank Transfer",
    reference: "Transfer from BandaCare Clinic",
    amount: 1152000,
    goods: 1040000,
    serviceFee: 104000,
    deliveryFee: 8000,
    status: "succeeded",
    paidAt: "2026-09-10T11:23:00.000Z",
  },
  {
    id: "paytxn-004",
    orderId: "ord-004",
    orderNumber: "ML-20260830-021",
    customerName: "Thandiwe Banda",
    method: "Mobile Money",
    reference: "TNM Mpamba · xx9021",
    amount: 97900,
    goods: 84000,
    serviceFee: 8400,
    deliveryFee: 5500,
    status: "succeeded",
    paidAt: "2026-08-30T10:15:00.000Z",
  },
  {
    id: "paytxn-005",
    orderId: "ord-005",
    orderNumber: "ML-20260812-005",
    customerName: "Thandiwe Banda",
    method: "Bank Transfer",
    reference: "Transfer from BandaCare Clinic",
    amount: 688000,
    goods: 620000,
    serviceFee: 62000,
    deliveryFee: 6000,
    status: "succeeded",
    paidAt: "2026-08-12T16:44:00.000Z",
  },
  {
    id: "paytxn-006",
    orderNumber: "ML-20260920-006",
    customerName: "BandaCare Clinic",
    method: "Bank Card",
    reference: "Visa · xx4410",
    amount: 445000,
    goods: 400000,
    serviceFee: 40000,
    deliveryFee: 5000,
    status: "failed",
    paidAt: "2026-09-20T11:02:00.000Z",
    failureReason: "Card declined — insufficient funds. Buyer retried with Airtel Money and completed the order.",
  },
  {
    id: "paytxn-007",
    orderNumber: "ML-20260917-013",
    customerName: "Mwale Family Clinic",
    method: "Mobile Money",
    reference: "Airtel · xx7733",
    amount: 96000,
    goods: 85000,
    serviceFee: 8500,
    deliveryFee: 2500,
    status: "failed",
    paidAt: "2026-09-17T15:48:00.000Z",
    failureReason: "Mobile money payment timed out after 15 minutes. No order was created.",
  },
];