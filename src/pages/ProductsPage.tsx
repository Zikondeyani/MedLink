import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useActiveProducts } from "../lib/registry";
import FilterPanel, { applyFilters, defaultFilters, type ProductFilters } from "../components/marketplace/FilterPanel";
import ProductGrid from "../components/marketplace/ProductGrid";
import EmptyState from "../components/ui/EmptyState";
import { SlidersHorizontal } from "lucide-react";

export default function ProductsPage() {
  const [params] = useSearchParams();
  const initialCategory = params.get("category") ?? "";
  const [filters, setFilters] = useState<ProductFilters>({
    ...defaultFilters,
    categoryId: params.get("categoryId") ?? initialCategory,
    search: params.get("q") ?? "",
    supplierId: params.get("supplier") ?? "",
  });

  const activeProducts = useActiveProducts();
  const results = useMemo(() => applyFilters(activeProducts, filters), [filters, activeProducts]);
  const activeCount = useMemo(() => {
    let n = 0;
    if (filters.categoryId) n++;
    if (filters.supplierId) n++;
    if (filters.search) n++;
    if (filters.inStockOnly) n++;
    if (filters.minPrice !== defaultFilters.minPrice || filters.maxPrice !== defaultFilters.maxPrice) n++;
    return n;
  }, [filters]);

  return (
    <div className="page products-page">
      <div className="page-head container">
        <span className="eyebrow">Marketplace</span>
        <h1 className="h-display" style={{ fontSize: "clamp(24px,4vw,34px)" }}>Medical Products</h1>
        <p className="muted">Order medical equipment, supplies and essentials from verified suppliers — delivered by MedLink.</p>
      </div>

      <div className="container">
        <div className="between" style={{ marginBottom: 16, flexWrap: "wrap" }}>
          <span className="small muted">
            <b>{results.length}</b> products found
            {activeCount > 0 && <span className="badge badge-soft" style={{ marginLeft: 8 }}>{activeCount} filters active</span>}
          </span>
          <span className="small muted hide-mobile">
            <SlidersHorizontal size={13} /> Refine results with filters
          </span>
        </div>

        <div className="split">
          <FilterPanel filters={filters} onChange={setFilters} />
          <div>
            {results.length === 0 ? (
              <EmptyState
                icon="search"
                title="No products found"
                message="Try changing your filters or search terms."
                action={
                  <button className="btn btn-outline" onClick={() => setFilters(defaultFilters)}>
                    Reset filters
                  </button>
                }
              />
            ) : (
              <ProductGrid products={results} cols={3} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}