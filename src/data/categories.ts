import type { Category } from "./types";

export const categories: Category[] = [
  {
    id: "cat-medical-equipment",
    name: "Medical Equipment",
    slug: "medical-equipment",
    description: "Diagnostic and treatment devices for clinics, hospitals and labs.",
    icon: "stethoscope",
    productCount: 14,
    gradient: ["#0B1120", "#FFB74D"],
  },
  {
    id: "cat-diagnostic",
    name: "Diagnostic Equipment",
    slug: "diagnostic-equipment",
    description: "Monitoring, testing and measurement instruments.",
    icon: "activity",
    productCount: 12,
    gradient: ["#EA580C", "#FFB74D"],
  },
  {
    id: "cat-laboratory",
    name: "Laboratory Supplies",
    slug: "laboratory-supplies",
    description: "Lab instruments, reagents and consumables.",
    icon: "flask",
    productCount: 11,
    gradient: ["#B45309", "#F59E0B"],
  },
  {
    id: "cat-pharmacy",
    name: "Pharmacy Supplies",
    slug: "pharmacy-supplies",
    description: "Medicines, sanitizers and pharmacy essentials.",
    icon: "pill",
    productCount: 9,
    gradient: ["#D97706", "#FFC868"],
  },
  {
    id: "cat-surgical",
    name: "Surgical Equipment",
    slug: "surgical-equipment",
    description: "Surgical instruments, kits and theatre supplies.",
    icon: "syringe",
    productCount: 7,
    gradient: ["#0B1120", "#F59E0B"],
  },
  {
    id: "cat-ppe",
    name: "PPE & Safety",
    slug: "ppe-and-safety",
    description: "Gloves, masks, gowns and protective gear.",
    icon: "shield",
    productCount: 10,
    gradient: ["#FB923C", "#F59E0B"],
  },
  {
    id: "cat-furniture",
    name: "Hospital Furniture",
    slug: "hospital-furniture",
    description: "Beds, trolleys, couches and ward furniture.",
    icon: "bed",
    productCount: 6,
    gradient: ["#7C2D12", "#FB923C"],
  },
  {
    id: "cat-dental",
    name: "Dental Supplies",
    slug: "dental-supplies",
    description: "Dental equipment, instruments and consumables.",
    icon: "smile",
    productCount: 6,
    gradient: ["#92400E", "#FFB74D"],
  },
  {
    id: "cat-rehab",
    name: "Rehabilitation Equipment",
    slug: "rehabilitation-equipment",
    description: "Mobility aids and therapy equipment.",
    icon: "accessibility",
    productCount: 6,
    gradient: ["#C2410C", "#D97706"],
  },
  {
    id: "cat-consumables",
    name: "Consumables",
    slug: "consumables",
    description: "Daily-use disposables and single-use items.",
    icon: "package",
    productCount: 12,
    gradient: ["#8A8F98", "#FFB74D"],
  },
];

export function categoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

export function categoryById(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}

export function categoryName(id: string): string {
  return categoryById(id)?.name ?? "General";
}