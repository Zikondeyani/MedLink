import { BadgeCheck } from "lucide-react";

export default function VerificationBadge({ verified = true, label = "Verified" }: { verified?: boolean; label?: string }) {
  if (!verified) return (
    <span className="verify-badge verify-off" title="Not verified yet">
      <BadgeCheck size={15} strokeWidth={2} />
      Unverified
    </span>
  );
  return (
    <span className="verify-badge" title="Verified supplier">
      <BadgeCheck size={15} strokeWidth={2} />
      {label}
    </span>
  );
}