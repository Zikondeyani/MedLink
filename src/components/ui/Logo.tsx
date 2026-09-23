import { Link } from "react-router-dom";

export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#0B1120" />
      <path
        d="M14 26h8.5l4 14 7-28 4.5 18 2.5-4h7.5"
        stroke="#FFB74D"
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="51" cy="44" r="5.5" fill="#10B981" />
      <circle cx="17" cy="42" r="3.4" fill="#FFD28A" />
    </svg>
  );
}

export default function Logo({
  to = "/",
  size = 34,
  light = false,
  compact = false,
}: {
  to?: string;
  size?: number;
  light?: boolean;
  compact?: boolean;
}) {
  return (
    <Link to={to} className="logo" aria-label="MedLink home">
      <LogoMark size={size} />
      {!compact && (
        <span className={`logo-word ${light ? "logo-word-light" : ""}`}>
          Med<span className="logo-link">Link</span>
        </span>
      )}
    </Link>
  );
}