import {
  Accessibility,
  Activity,
  BedDouble,
  FlaskConical,
  Package,
  Pill,
  ShieldCheck,
  Smile,
  Stethoscope,
  Syringe,
  type LucideIcon,
} from "lucide-react";

export const categoryIcons: Record<string, LucideIcon> = {
  stethoscope: Stethoscope,
  activity: Activity,
  flask: FlaskConical,
  pill: Pill,
  syringe: Syringe,
  shield: ShieldCheck,
  bed: BedDouble,
  smile: Smile,
  accessibility: Accessibility,
  package: Package,
};

export function CategoryIcon({
  name,
  size = 22,
  strokeWidth = 1.9,
}: {
  name: string;
  size?: number;
  strokeWidth?: number;
}) {
  const IconComponent = categoryIcons[name] ?? Package;
  return <IconComponent size={size} strokeWidth={strokeWidth} />;
}