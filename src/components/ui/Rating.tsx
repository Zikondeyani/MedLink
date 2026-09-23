import { Star } from "lucide-react";

export default function Rating({
  value,
  count,
  size = "sm",
}: {
  value: number;
  count?: number;
  size?: "sm" | "md";
}) {
  const width = (value / 5) * 100;
  return (
    <span className={`rating rating-${size}`} title={`${value} out of 5`}>
      <span className="rating-bg">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={size === "sm" ? 13 : 15} strokeWidth={1.8} fill="currentColor" />
        ))}
      </span>
      <span className="rating-fill" style={{ width: `${width}%` }}>
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={size === "sm" ? 13 : 15} strokeWidth={1.8} fill="currentColor" />
        ))}
      </span>
      <span className="rating-value">{value}</span>
      {count != null && <span className="rating-count">({count})</span>}
    </span>
  );
}