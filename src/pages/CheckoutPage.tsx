import { useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Landmark,
  Package,
  Smartphone,
  Truck,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { DeliveryAddress, PaymentMethod } from "../data/types";
import { mwk } from "../lib/format";
import { useCart, type CartSummary } from "../lib/cart";
import { useToast } from "../lib/toast";
import { useAuth } from "../lib/auth";
import { createCustomerOrder, getDefaultCustomerAddress, saveCustomerAddress } from "../lib/customerData";
import { getPricing, recordOrderPayment } from "../lib/registry";
import { quoteDelivery, serviceFee } from "../components/marketplace/DeliveryFeeCard";
import CheckoutSummary from "../components/marketplace/CheckoutSummary";
import ProductImage from "../components/ui/ProductImage";
import { SupplierAvatar } from "../components/marketplace/SupplierCard";
import { supplierById } from "../data/suppliers";

const steps = ["Delivery", "Delivery Fee", "Payment", "Review"] as const;
type Step = (typeof steps)[number];

interface PaymentFields {
  method: PaymentMethod;
  mobileNumber: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvc: string;
  bankRef: string;
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function safePaymentReference(payment: PaymentFields): string {
  if (payment.method === "Mobile Money") {
    const digits = onlyDigits(payment.mobileNumber);
    return `Mobile Money · xx${digits.slice(-4) || "0000"}`;
  }
  if (payment.method === "Bank Card") {
    const digits = onlyDigits(payment.cardNumber);
    return `Bank Card · xx${digits.slice(-4) || "0000"}`;
  }
  return "Bank Transfer · reference submitted";
}

export default function CheckoutPage() {
  const { summary, clear } = useCart();
  const { push } = useToast();
  const { user } = useAuth();
  const customerEmail = user?.email ?? "";

  const [step, setStep] = useState<Step>("Delivery");
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placed, setPlaced] = useState<CartSummary | null>(null);
  const [placedOrderId, setPlacedOrderId] = useState("");
  const [placedOrderNumber, setPlacedOrderNumber] = useState("");

  const [address, setAddress] = useState<DeliveryAddress>(() => {
    const saved = customerEmail ? getDefaultCustomerAddress(customerEmail) : undefined;
    return {
      fullName: saved?.fullName ?? user?.name ?? "",
      phone: saved?.phone ?? "",
      address: saved?.address ?? "",
      city: saved?.city ?? "Lilongwe",
      area: saved?.area ?? "",
      instructions: saved?.instructions ?? "",
    };
  });
  const [errors, setErrors] = useState<Partial<Record<keyof DeliveryAddress, string>>>({});

  const [payment, setPayment] = useState<PaymentFields>({
    method: "Mobile Money",
    mobileNumber: "",
    cardNumber: "",
    cardExpiry: "",
    cardCvc: "",
    bankRef: "",
  });
  const [paymentError, setPaymentError] = useState("");

  const delivery = useMemo(() => quoteDelivery(address.city), [address.city]);
  const fee = serviceFee(summary.subtotal);
  const ratePct = Math.round(getPricing().serviceFeeRate * 100);
  const total = summary.subtotal + fee + delivery.baseFee;
  const stepIndex = steps.indexOf(step);

  const validateAddress = (): boolean => {
    const next: Partial<Record<keyof DeliveryAddress, string>> = {};
    if (!address.fullName.trim()) next.fullName = "Full name is required";
    if (!address.phone.trim()) next.phone = "Phone number is required";
    if (!address.address.trim()) next.address = "Delivery address is required";
    if (!address.city.trim()) next.city = "City is required";
    if (!address.area.trim()) next.area = "Area is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validatePayment = (): boolean => {
    let error = "";
    if (payment.method === "Mobile Money" && onlyDigits(payment.mobileNumber).length < 9) {
      error = "Enter a valid mobile money number.";
    } else if (payment.method === "Bank Card") {
      if (onlyDigits(payment.cardNumber).length < 12) error = "Enter a valid card number.";
      else if (!payment.cardExpiry.trim()) error = "Enter the card expiry date.";
      else if (!/^\d{3,4}$/.test(payment.cardCvc.trim())) error = "Enter a valid card security code.";
    } else if (payment.method === "Bank Transfer" && payment.bankRef.trim().length < 3) {
      error = "Enter the account name or payment reference.";
    }
    setPaymentError(error);
    return !error;
  };

  const next = () => {
    if (step === "Delivery" && !validateAddress()) return;
    if (step === "Payment" && !validatePayment()) return;
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) {
      setStep(steps[idx + 1]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const placeOrder = () => {
    if (!user || user.role !== "customer" || !validatePayment()) return;

    const order = createCustomerOrder({
      customerEmail: user.email,
      customerName: address.fullName,
      address,
      lines: summary.groups.flatMap((group) =>
        group.lines.map(({ product, quantity }) => ({
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity,
          unit: product.unit,
          supplierId: group.supplierId,
          supplierName: group.supplierName || "MedLink supplier",
          image: product.id,
        })),
      ),
      subtotal: summary.subtotal,
      serviceFee: fee,
      deliveryFee: delivery.baseFee,
      total,
      payment: { method: payment.method, reference: safePaymentReference(payment) },
    });
    saveCustomerAddress(user.email, address);
    recordOrderPayment(order);
    setPlaced(summary);
    setPlacedOrderId(order.id);
    setPlacedOrderNumber(order.number);
    setOrderPlaced(true);
    clear();
    push({
      title: "Order placed",
      message: `Your order ${order.number} has been successfully placed.`,
      icon: "order",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (summary.items === 0 && !orderPlaced) {
    return (
      <div className="container page">
        <div className="empty">
          <div className="empty-icon"><Package size={28} strokeWidth={1.7} /></div>
          <h3>Your cart is empty</h3>
          <p>Add some products before heading to checkout.</p>
          <Link to="/products" className="btn btn-primary">Browse Products</Link>
        </div>
      </div>
    );
  }

  if (orderPlaced) {
    const placedSummary = placed ?? summary;
    const suppliers = placedSummary.groups.map((g) => supplierById(g.supplierId)?.name ?? g.supplierName);
    return (
      <div className="container page checkout-success">
        <div className="card card-pad success-card">
          <span className="success-icon"><CheckCircle2 size={44} strokeWidth={1.6} /></span>
          <h1 className="h-section">Order Confirmed</h1>
          <p className="muted" style={{ maxWidth: 480 }}>
            Your order <b>{placedOrderNumber}</b> has been successfully placed. The supplier has been notified and MedLink will handle delivery.
          </p>
          <div className="success-grid">
            <div className="success-item"><small className="muted">Supplier</small><b>{suppliers.join(", ")}</b></div>
            <div className="success-item"><small className="muted">Products</small><b>{placedSummary.items} items</b></div>
            <div className="success-item"><small className="muted">Delivery</small><b>MedLink Delivery</b></div>
            <div className="success-item"><small className="muted">Estimated delivery</small><b>Today / Tomorrow</b></div>
          </div>
          <div className="row" style={{ justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
            <Link to={`/orders/${placedOrderId}`} className="btn btn-primary"><Truck size={16} /> Track order</Link>
            <Link to="/products" className="btn btn-outline">Continue shopping</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page checkout-page container">
      <div className="page-head">
        <span className="eyebrow">Secure checkout</span>
        <h1 className="h-display" style={{ fontSize: "clamp(24px,4vw,34px)" }}>Checkout</h1>
        <p className="muted">Pay once through MedLink. We collect from suppliers and deliver to your door.</p>
      </div>

      {/* Stepper */}
      <ol className="stepper">
        {steps.map((s, i) => (
          <li key={s} className={`stepper-step${i <= stepIndex ? " active" : ""}${i === stepIndex ? " current" : ""}`}>
            <span className="stepper-dot">{i < stepIndex ? <CheckCircle2 size={15} /> : i + 1}</span>
            <b>{s}</b>
            {i < steps.length - 1 && <span className="stepper-line" />}
          </li>
        ))}
      </ol>

      <div className="split checkout-layout">
        <div className="stack">
          {/* ---- Step 1: Delivery ---- */}
          {step === "Delivery" && (
            <div className="card card-pad">
              <div className="between" style={{ marginBottom: 18 }}>
                <h2 className="h-card row" style={{ gap: 8 }}>
                  <Truck size={18} className="teal" /> Delivery information
                </h2>
                <span className="badge badge-teal">Delivery by MedLink</span>
              </div>
              <div className="form-grid">
                <div className="field">
                  <label className="label" htmlFor="fullName">Full name</label>
                  <input id="fullName" className={`input${errors.fullName ? " field-error" : ""}`} value={address.fullName} onChange={(e) => setAddress({ ...address, fullName: e.target.value })} />
                  {errors.fullName && <span className="error-msg">{errors.fullName}</span>}
                </div>
                <div className="field">
                  <label className="label" htmlFor="phone">Phone number</label>
                  <input id="phone" className={`input${errors.phone ? " field-error" : ""}`} value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} placeholder="+265 ..." />
                  {errors.phone && <span className="error-msg">{errors.phone}</span>}
                </div>
                <div className="field full">
                  <label className="label" htmlFor="address">Delivery address</label>
                  <input id="address" className={`input${errors.address ? " field-error" : ""}`} value={address.address} onChange={(e) => setAddress({ ...address, address: e.target.value })} placeholder="Street / plot / house number" />
                  {errors.address && <span className="error-msg">{errors.address}</span>}
                </div>
                <div className="field">
                  <label className="label" htmlFor="city">City</label>
                  <select id="city" className={`select${errors.city ? " field-error" : ""}`} value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })}>
                    <option>Lilongwe</option>
                    <option>Blantyre</option>
                    <option>Mzuzu</option>
                    <option>Zomba</option>
                  </select>
                  {errors.city && <span className="error-msg">{errors.city}</span>}
                </div>
                <div className="field">
                  <label className="label" htmlFor="area">Area / Zone</label>
                  <input id="area" className={`input${errors.area ? " field-error" : ""}`} value={address.area} onChange={(e) => setAddress({ ...address, area: e.target.value })} placeholder="e.g. Area 9, Chichiri" />
                  {errors.area && <span className="error-msg">{errors.area}</span>}
                </div>
                <div className="field full">
                  <label className="label" htmlFor="instructions">Additional delivery instructions <span>(optional)</span></label>
                  <textarea id="instructions" className="textarea" value={address.instructions} onChange={(e) => setAddress({ ...address, instructions: e.target.value })} placeholder="e.g. Call ahead, deliver to reception..." />
                </div>
              </div>
            </div>
          )}

          {/* ---- Step 2: Delivery fee ---- */}
          {step === "Delivery Fee" && (
            <div className="card card-pad">
              <div className="between" style={{ marginBottom: 14 }}>
                <h2 className="h-card row" style={{ gap: 8 }}>
                  <Truck size={18} className="teal" /> Delivery fee
                </h2>
              </div>
              <div className="summary-row"><span>Delivery to</span><b>{address.area}, {address.city}</b></div>
              <div className="summary-row"><span>Order subtotal</span><b>{mwk(summary.subtotal)}</b></div>
              <div className="summary-row"><span>MedLink service fee ({ratePct}%)</span><b>{mwk(fee)}</b></div>
              <div className="summary-row"><span>MedLink delivery</span><b>{mwk(delivery.baseFee)}</b></div>
              <div className="summary-row summary-total"><span>Total</span><b>{mwk(total)}</b></div>
              <div className="delivery-note">
                <Truck size={17} />
                <p className="small muted">
                  Your order value is paid to the supplier. MedLink charges a <strong>{ratePct}% service fee</strong> on top of
                  your order, plus a delivery fee based on your delivery location. MedLink delivers every order — no
                  free delivery thresholds.
                </p>
              </div>
              <div className="delivery-who">
                <span><Package size={13} /> Supplier prepares</span>
                <span className="delivery-who-arrow">→</span>
                <span><Truck size={13} /> MedLink collects & delivers</span>
                <span className="delivery-who-arrow">→</span>
                <span>You receive</span>
              </div>
            </div>
          )}

          {/* ---- Step 3: Payment ---- */}
          {step === "Payment" && (
            <div className="card card-pad">
              <h2 className="h-card" style={{ marginBottom: 16 }}>Payment method</h2>
              <p className="small muted" style={{ marginBottom: 16 }}>
                Payments are processed by MedLink. The supplier receives payment for their products and MedLink delivers
                your order. This is a simulated checkout — no real payment is taken.
              </p>
              {paymentError && <p className="small red" style={{ marginBottom: 12 }}>{paymentError}</p>}
              <div className="pay-methods">
                <button className={`pay-method${payment.method === "Mobile Money" ? " pay-method-active" : ""}`} onClick={() => { setPaymentError(""); setPayment({ ...payment, method: "Mobile Money" }); }}>
                  <Smartphone size={20} />
                  <div className="grow"><b>Mobile Money</b><small>Airtel Money · TNM Mpamba</small></div>
                  <span className="pill-check">{payment.method === "Mobile Money" && "✓"}</span>
                </button>
                <button className={`pay-method${payment.method === "Bank Card" ? " pay-method-active" : ""}`} onClick={() => { setPaymentError(""); setPayment({ ...payment, method: "Bank Card" }); }}>
                  <CreditCard size={20} />
                  <div className="grow"><b>Bank Card</b><small>Visa · Mastercard</small></div>
                  <span className="pill-check">{payment.method === "Bank Card" && "✓"}</span>
                </button>
                <button className={`pay-method${payment.method === "Bank Transfer" ? " pay-method-active" : ""}`} onClick={() => { setPaymentError(""); setPayment({ ...payment, method: "Bank Transfer" }); }}>
                  <Landmark size={20} />
                  <div className="grow"><b>Bank Transfer</b><small>National Bank · Standard Bank · FDH</small></div>
                  <span className="pill-check">{payment.method === "Bank Transfer" && "✓"}</span>
                </button>
              </div>

              {payment.method === "Mobile Money" && (
                <div className="field" style={{ marginTop: 16 }}>
                  <label className="label" htmlFor="momnum">Mobile Money number</label>
                  <input id="momnum" className="input" placeholder="+265 999 000 000" value={payment.mobileNumber} onChange={(e) => setPayment({ ...payment, mobileNumber: e.target.value })} />
                </div>
              )}
              {payment.method === "Bank Card" && (
                <div className="form-grid" style={{ marginTop: 16 }}>
                  <div className="field full">
                    <label className="label" htmlFor="cardnum">Card number</label>
                    <input id="cardnum" className="input" placeholder="4242 4242 4242 4242" value={payment.cardNumber} onChange={(e) => setPayment({ ...payment, cardNumber: e.target.value })} />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="exp">Expiry</label>
                    <input id="exp" className="input" placeholder="MM / YY" value={payment.cardExpiry} onChange={(e) => setPayment({ ...payment, cardExpiry: e.target.value })} />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="cvc">CVC</label>
                    <input id="cvc" className="input" placeholder="123" value={payment.cardCvc} onChange={(e) => setPayment({ ...payment, cardCvc: e.target.value })} />
                  </div>
                </div>
              )}
              {payment.method === "Bank Transfer" && (
                <div className="field" style={{ marginTop: 16 }}>
                  <label className="label" htmlFor="bankref">Account name / reference</label>
                  <input id="bankref" className="input" placeholder="e.g. BandaCare Clinic" value={payment.bankRef} onChange={(e) => setPayment({ ...payment, bankRef: e.target.value })} />
                  <span className="xs muted">MedLink will share account details to complete the transfer.</span>
                </div>
              )}
            </div>
          )}

          {/* ---- Step 4: Review ---- */}
          {step === "Review" && (
            <div className="stack">
              <div className="card card-pad">
                <h2 className="h-card" style={{ marginBottom: 14 }}>Review your order</h2>
                {summary.groups.map((g) => {
                  const supplier = supplierById(g.supplierId);
                  return (
                    <div key={g.supplierId} className="review-group">
                      <div className="row" style={{ gap: 8, marginBottom: 10 }}>
                        {supplier && <SupplierAvatar supplier={supplier} size={26} />}
                        <b className="small">{g.supplierName || supplier?.name}</b>
                      </div>
                      <div className="stack-sm">
                        {g.lines.map(({ product, quantity }) => (
                          <div key={product.id} className="review-line">
                            <ProductImage productId={product.id} categoryId={product.categoryId} name={product.name} height={52} className="review-line-img" />
                            <div className="grow">
                              <b className="small">{product.name}</b>
                              <div className="xs muted">{mwk(product.price)} × {quantity}</div>
                            </div>
                            <b className="small">{mwk(product.price * quantity)}</b>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="card card-pad">
                <h2 className="h-card" style={{ marginBottom: 12 }}>Delivery & payment</h2>
                <div className="summary-row"><span>Deliver to</span><b>{address.area}, {address.city}</b></div>
                <div className="summary-row"><span>Address</span><b className="small">{address.address}</b></div>
                <div className="summary-row"><span>Recipient</span><b>{address.fullName} · {address.phone}</b></div>
                <div className="summary-row"><span>Payment</span><b>{payment.method}</b></div>
                <div className="summary-row"><span>Delivery</span><b>MedLink</b></div>
                <div className="summary-row"><span>Service fee ({ratePct}%)</span><b>{mwk(fee)}</b></div>
                <div className="summary-row"><span>Delivery fee</span><b>{mwk(delivery.baseFee)}</b></div>
              </div>
            </div>
          )}

          {/* Primary action — full width of the column so it matches the cards */}
          <div className="checkout-nav">
            {step !== "Review" ? (
              <button className="btn btn-primary btn-lg" onClick={next}>
                Continue <ChevronRight size={16} />
              </button>
            ) : (
              <button className="btn btn-green btn-lg" onClick={placeOrder}>
                <Banknote size={17} /> Place Order — {mwk(total)}
              </button>
            )}
          </div>
        </div>

        {/* Summary sidebar */}
        <aside className="checkout-aside">
          <CheckoutSummary subtotal={summary.subtotal} serviceFee={fee} deliveryFee={delivery.baseFee} total={total} note="" />
          <div className="card card-pad secure-note">
            <span className="success-icon" style={{ width: 40, height: 40 }}><CheckCircle2 size={20} /></span>
            <p className="xs muted">
              <b className="ink">Marketplace payment.</b> You pay MedLink at checkout. The supplier receives their
              payment, and MedLink delivers your order to your door.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}