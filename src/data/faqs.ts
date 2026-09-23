/* FAQ content shared by the homepage snippet and the full /faq page. */

export type FaqGroupId = "general" | "buying" | "delivery" | "payments" | "selling" | "support";

export interface FaqItem {
  group: FaqGroupId;
  q: string;
  a: string;
}

export const faqGroups: { id: FaqGroupId; label: string }[] = [
  { id: "general", label: "General" },
  { id: "buying", label: "Buying & orders" },
  { id: "delivery", label: "Delivery & fees" },
  { id: "payments", label: "Payments" },
  { id: "selling", label: "Selling on MedLink" },
  { id: "support", label: "Account & support" },
];

export const faqs: FaqItem[] = [
  {
    group: "general",
    q: "What is MedLink?",
    a: "MedLink is Malawi's medical supplies and equipment marketplace. We connect verified suppliers to hospitals, clinics, pharmacies, laboratories and individuals, and handle delivery from the supplier's door to yours.",
  },
  {
    group: "general",
    q: "Who can buy on MedLink?",
    a: "Anyone — healthcare facilities, institutions, NGOs and individuals. You don't need an account to browse, but an account makes ordering, tracking and reordering faster.",
  },
  {
    group: "general",
    q: "Are all suppliers verified?",
    a: "Every supplier on MedLink passes a KYC review — we check their business registration, tax clearance and director identity documents before their store goes live. Verified suppliers carry the MedLink verification badge.",
  },
  {
    group: "buying",
    q: "How do I place an order?",
    a: "Add products to your cart, go to checkout, choose your delivery address and payment method, then confirm. MedLink handles payment and coordinates with the supplier to prepare your order.",
  },
  {
    group: "buying",
    q: "Can I order from multiple suppliers in one checkout?",
    a: "Yes. Your cart can contain items from several stores. We group them by supplier behind the scenes so each supplier prepares their part and you pay once through a single MedLink checkout.",
  },
  {
    group: "buying",
    q: "Can I change or cancel an order?",
    a: "You can cancel an order in My Orders as long as the supplier hasn't started preparing it. Once preparation begins, please contact support — we'll help arrange a return or exchange.",
  },
  {
    group: "buying",
    q: "What if an item is out of stock?",
    a: "Items show live stock levels. If something runs out, the checkout will flag it and you can pick a similar product or be notified when it's restocked.",
  },
  {
    group: "delivery",
    q: "How does delivery work?",
    a: "MedLink operates its own delivery service. The supplier prepares your order, MedLink collects it, and our riders deliver it to your address — with status updates at every step.",
  },
  {
    group: "delivery",
    q: "What are the delivery fees?",
    a: "Delivery fees are calculated at checkout based on your location and the size of the order. Fees are shown clearly before you pay — there are no hidden charges.",
  },
  {
    group: "delivery",
    q: "How long does delivery take?",
    a: "Delivery usually takes 1–3 days depending on your city and the supplier's location. The estimated delivery date appears on your order and updates as it moves.",
  },
  {
    group: "delivery",
    q: "Is there free delivery?",
    a: "MedLink doesn't offer free delivery. Delivery is a core service MedLink provides, and the fee is how it stays reliable — it's always shown up front in your cart and at checkout.",
  },
  {
    group: "delivery",
    q: "Do you deliver outside major cities?",
    a: "Yes. We deliver nationwide across Malawi, including rural and remote areas. Delivery outside the main cities may take a little longer and the fee is calculated at checkout.",
  },
  {
    group: "payments",
    q: "What payment methods are accepted?",
    a: "Mobile Money (Airtel Money, TNM Mpamba), bank cards (Visa/Mastercard), and bank transfer. Payment is completed securely through MedLink checkout.",
  },
  {
    group: "payments",
    q: "What is the MedLink service fee?",
    a: "MedLink charges a 10% service fee on the value of products you buy through the marketplace. It covers payment processing, platform operations and consumer protection. It is shown as a separate line at checkout.",
  },
  {
    group: "payments",
    q: "Is it safe to pay on MedLink?",
    a: "Yes. You pay MedLink directly rather than individual sellers, so your money is protected until your order is delivered. If an order fails, we process your refund.",
  },
  {
    group: "selling",
    q: "How do I become a supplier on MedLink?",
    a: "Click 'Become a supplier', complete the application, and submit your KYC documents — business registration certificate, tax clearance certificate and the director's identity document. Our team reviews and verifies you, usually within 2–3 working days.",
  },
  {
    group: "selling",
    q: "What is KYC and why is it required?",
    a: "KYC (Know Your Customer) is the identity and business verification we run on every supplier. It protects buyers from counterfeit and unregistered sellers, and it's a legal requirement for selling medical goods.",
  },
  {
    group: "selling",
    q: "What documents do I need to submit?",
    a: "Three documents: your business registration certificate, your tax clearance certificate, and a copy of the director's ID (national ID, passport or driving licence).",
  },
  {
    group: "selling",
    q: "How long does supplier verification take?",
    a: "Most applications are reviewed within 2–3 working days. You'll get a reference number after submitting, and you can check your application status anytime on the Become a Supplier page.",
  },
  {
    group: "selling",
    q: "How much does it cost to sell on MedLink?",
    a: "There is no fixed listing fee. MedLink earns a 10% service fee on products sold through the marketplace, plus delivery income — so you only pay when you actually sell.",
  },
  {
    group: "support",
    q: "How do I track my order?",
    a: "Open 'My Orders' from your account to see live status — confirmed, preparing, out for delivery and delivered. You'll also get notifications as your order moves.",
  },
  {
    group: "support",
    q: "How do I contact support?",
    a: "Reach us on +265 888 000 123, email hello@medlink.mw, or via WhatsApp. Support is available Monday to Saturday, 8:00 – 17:00.",
  },
  {
    group: "support",
    q: "How do I return a product?",
    a: "If an item arrives damaged, faulty or different from what you ordered, contact support within 48 hours of delivery with your order number and photos. We'll arrange a pickup, refund or replacement.",
  },
  {
    group: "support",
    q: "How do I manage my account settings?",
    a: "Go to My Account → Settings to update your profile, notification preferences, saved addresses and preferred payment methods.",
  },
];