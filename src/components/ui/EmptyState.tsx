import type { ReactNode } from "react";
import { PackageOpen, SearchX } from "lucide-react";

export default function EmptyState({
  icon = "box",
  title,
  message,
  action,
}: {
  icon?: "box" | "search";
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        {icon === "box" ? <PackageOpen size={28} strokeWidth={1.7} /> : <SearchX size={28} strokeWidth={1.7} />}
      </div>
      <h3>{title}</h3>
      <p>{message}</p>
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}