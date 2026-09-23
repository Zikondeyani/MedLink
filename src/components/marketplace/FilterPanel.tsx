import { useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { categories } from "../../data/categories";
import { suppliers } from "../../data/suppliers";
import { activeProducts } from "../../data/products";
import type { Product } from "../../data/types";
import { mwk } from "../../lib/format";

export interface ProductFilters {
  search: string;
  categoryId: string;
  supplierId: string;
  minPrice: number;
  maxPrice: number;
  inStockOnly: boolean;
  sort: "relevance" | "newest" | "price_asc" | "price_desc" | "popular";
}

export const defaultFilters: ProductFilters = {
  search: "",
  categoryId: "",
  supplierId: "",
  minPrice: 0,
  maxPrice: 6000000,
  inStockOnly: false,
  sort: "relevance",
};

export function applyFilters(list: Product[], f: ProductFilters): Product[] {
  let out = [...list];
  const q = f.search.trim().toLowerCase();
  if (q) {
    out = out.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.tags.some((t) => t.includes(q)) ||
        (suppliers.find((s) => s.id === p.supplierId)?.name.toLowerCase().includes(q) ?? false) ||
        p.brand.toLowerCase().includes(q),
    );
  }
  if (f.categoryId) out = out.filter((p) => p.categoryId === f.categoryId);
  if (f.supplierId) out = out.filter((p) => p.supplierId === f.supplierId);
  out = out.filter((p) => p.price >= f.minPrice && p.price <= f.maxPrice);
  if (f.inStockOnly) out = out.filter((p) => p.stock > 0);

  switch (f.sort) {
    case "newest":
      out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      break;
    case "price_asc":
      out.sort((a, b) => a.price - b.price);
      break;
    case "price_desc":
      out.sort((a, b) => b.price - a.price);
      break;
    case "popular":
      out.sort((a, b) => b.reviewCount - a.reviewCount);
      break;
    default:
      out.sort((a, b) => Number(b.popular) - Number(a.popular) || b.rating - a.rating);
  }
  return out;
}

const PRICE_BRACKETS = [
  { min: 0, max: 50000, label: "Under MWK 50,000" },
  { min: 50000, max: 200000, label: "MWK 50,000 – 200,000" },
  { min: 200000, max: 1000000, label: "MWK 200,000 – 1,000,000" },
  { min: 1000000, max: 6000000, label: "Above MWK 1,000,000" },
];

export default function FilterPanel({
  filters,
  onChange,
}: {
  filters: ProductFilters;
  onChange: (f: ProductFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  const maxSupplierCount = 5000000;

  const availableCount = useMemo(() => activeProducts.length, []);

  const set = (patch: Partial<ProductFilters>) => onChange({ ...filters, ...patch });

  return (
    <>
      {/* Mobile toggle */}
      <button className="btn btn-outline filter-toggle" onClick={() => setOpen(true)}>
        <SlidersHorizontal size={16} /> Filters
      </button>

      <div className={`filter-panel slim-scroll${open ? " filter-open" : ""}`}>
        <div className="filter-head">
          <h3 className="h-card">Filters</h3>
          <button className="btn btn-ghost btn-icon filter-close" aria-label="Close filters" onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {filters.search && (
          <p className="xs muted" style={{ marginBottom: 8 }}>
            Showing results for <strong>“{filters.search}”</strong> · {availableCount} products available
          </p>
        )}

        <div className="filter-group">
          <h4>Category</h4>
          <div className="filter-options">
            <button className={filters.categoryId === "" ? "chip chip-active" : "chip"} onClick={() => set({ categoryId: "" })}>
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                className={filters.categoryId === c.id ? "chip chip-active" : "chip"}
                onClick={() => set({ categoryId: c.id })}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <h4>Supplier</h4>
          <select
            className="select"
            value={filters.supplierId}
            onChange={(e) => set({ supplierId: e.target.value })}
          >
            <option value="">All suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <h4>Price range</h4>
          <div className="filter-options">
            {PRICE_BRACKETS.map((b) => (
              <button
                key={b.label}
                className={
                  filters.minPrice === b.min && filters.maxPrice === b.max ? "chip chip-active" : "chip"
                }
                onClick={() => set({ minPrice: b.min, maxPrice: b.max })}
              >
                {b.label}
              </button>
            ))}
          </div>
          <div className="price-slider">
            <input
              type="range"
              min={0}
              max={maxSupplierCount}
              step={10000}
              value={filters.maxPrice}
              onChange={(e) => set({ maxPrice: Number(e.target.value) })}
              aria-label="Maximum price"
            />
            <div className="between xs muted">
              <span>{mwk(filters.minPrice)}</span>
              <span>{mwk(filters.maxPrice)}</span>
            </div>
          </div>
        </div>

        <div className="filter-group">
          <h4>Availability</h4>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={filters.inStockOnly}
              onChange={(e) => set({ inStockOnly: e.target.checked })}
            />
            In stock only
          </label>
        </div>

        <div className="filter-group">
          <h4>Sort by</h4>
          <select className="select" value={filters.sort} onChange={(e) => set({ sort: e.target.value as ProductFilters["sort"] })}>
            <option value="relevance">Relevance</option>
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="popular">Most popular</option>
          </select>
        </div>

        <button
          className="btn btn-ghost btn-sm btn-block"
          onClick={() => onChange(defaultFilters)}
        >
          Reset all filters
        </button>
      </div>
      {open && <div className="filter-scrim" onClick={() => setOpen(false)} />}
    </>
  );
}