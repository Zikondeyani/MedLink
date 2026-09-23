import { mwk } from "../../lib/format";

export default function PriceDisplay({
  price,
  unit,
  size = "md",
  strike,
}: {
  price: number;
  unit?: string;
  size?: "sm" | "md" | "lg";
  strike?: number;
}) {
  return (
    <span className={`price price-${size}`}>
      {strike != null && <span className="price-strike">{mwk(strike)}</span>}
      {mwk(price)}
      {unit && <span className="price-unit"> / {unit}</span>}
    </span>
  );
}