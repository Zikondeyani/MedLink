import { Package, Truck } from "lucide-react";
import { mwk } from "../../lib/format";
import type { DeliveryAddress, DeliveryQuote } from "../../data/types";
import { getPricing, quoteDelivery, serviceFee } from "../../lib/registry";

export type { DeliveryQuote };
export { quoteDelivery, serviceFee };

/** MedLink delivery fee quote + service fee, driven by live admin pricing. */

export default function DeliveryFeeCard({
  address,
  subtotal,
}: {
  address: DeliveryAddress | null;
  subtotal: number;
}) {
  const ratePct = Math.round(getPricing().serviceFeeRate * 100);
  const quote = address ? quoteDelivery(address.city) : null;
  const fee = serviceFee(subtotal);

  return (
    <div className="card delivery-card">
      <div className="between">
        <h3 className="h-card row" style={{ gap: 8 }}>
          <Truck size={18} className="teal" /> Delivery by MedLink
        </h3>
        <span className="badge badge-teal">Managed by MedLink</span>
      </div>
      {quote ? (
        <>
          <p className="small muted" style={{ marginTop: 10 }}>
            Your order will be delivered by <strong className="ink">MedLink</strong>. Every order carries a {ratePct}%
            MedLink service fee plus a delivery fee based on your delivery location.
          </p>
          <div className="summary-row" style={{ marginTop: 14 }}>
            <span>Order subtotal</span>
            <b>{mwk(subtotal)}</b>
          </div>
          <div className="summary-row">
            <span>MedLink service fee ({ratePct}%)</span>
            <b>{mwk(fee)}</b>
          </div>
          <div className="summary-row">
            <span>MedLink delivery · {address?.city}</span>
            <b>{mwk(quote.baseFee)}</b>
          </div>
          <div className="divider" style={{ margin: "14px 0" }} />
          <div className="summary-row summary-total">
            <span>Total</span>
            <b>{mwk(subtotal + fee + quote.baseFee)}</b>
          </div>
          <p className="xs muted" style={{ marginTop: 10 }}>
            Estimated delivery: <strong>{quote.estimated}</strong>
          </p>
          <div className="delivery-who" style={{ marginTop: 14 }}>
            <span>
              <Package size={14} /> Supplier prepares
            </span>
            <span className="delivery-who-arrow">→</span>
            <span>
              <Truck size={14} /> MedLink delivers
            </span>
            <span className="delivery-who-arrow">→</span>
            <span>Customer receives</span>
          </div>
        </>
      ) : (
        <p className="small muted" style={{ marginTop: 10 }}>
          Enter a delivery address in the checkout form to calculate your MedLink delivery fee.
        </p>
      )}
    </div>
  );
}