import { Minus, Plus } from "lucide-react";
import { clamp } from "../../lib/format";

export default function QuantitySelector({
  value,
  onChange,
  max = 99,
  size = "md",
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  max?: number;
  size?: "sm" | "md";
  label?: string;
}) {
  return (
    <div
      className={`qty qty-${size}`}
      role="group"
      aria-label={label ?? "Quantity"}
    >
      <button
        type="button"
        className="qty-btn"
        aria-label="Decrease quantity"
        onClick={() => onChange(clamp(value - 1, 1, max))}
      >
        <Minus size={size === "sm" ? 14 : 16} />
      </button>
      <span className="qty-value">{value}</span>
      <button
        type="button"
        className="qty-btn"
        aria-label="Increase quantity"
        onClick={() => onChange(clamp(value + 1, 1, max))}
      >
        <Plus size={size === "sm" ? 14 : 16} />
      </button>
    </div>
  );
}