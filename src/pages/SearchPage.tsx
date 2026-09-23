import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { categories } from "../data/categories";
import { suppliers } from "../data/suppliers";
import { activeProducts } from "../data/products";
import ProductGrid from "../components/marketplace/ProductGrid";
import SupplierCard from "../components/marketplace/SupplierCard";
import EmptyState from "../components/ui/EmptyState";
import SearchBar from "../components/ui/SearchBar";

export default function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const term = q.trim().toLowerCase();

  const results = useMemo(() => {
    if (!term) {
      return { products: [], suppliers: [], categories: [] };
    }
    const products = activeProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.tags.some((t) => t.includes(term)) ||
        p.brand.toLowerCase().includes(term),
    );
    const sups = suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.category.toLowerCase().includes(term) ||
        s.location.city.toLowerCase().includes(term),
    );
    const cats = categories.filter((c) => c.name.toLowerCase().includes(term) || c.description.toLowerCase().includes(term));
    return { products, suppliers: sups, categories: cats };
  }, [term]);

  const supplierCount = new Set(results.products.map((p) => p.supplierId)).size;

  return (
    <div className="page search-page container">
      <div className="page-head">
        <span className="eyebrow">Search</span>
        <h1 className="h-display" style={{ fontSize: "clamp(22px,4vw,32px)" }}>
          {term ? <>Results for “{q}”</> : "Search MedLink"}
        </h1>
        <p className="muted">Find products, suppliers and categories across the marketplace.</p>
        <div style={{ maxWidth: 560, marginTop: 18 }}>
          <SearchBar variant="hero" initial={q} placeholder="Search medical equipment, suppliers..." autoFocus={!term} />
        </div>
      </div>

      {!term && (
        <EmptyState icon="search" title="Search the marketplace" message="Try searching “blood pressure”, “gloves”, “microscope” or “Lilongwe”." />
      )}

      {term && results.products.length === 0 && results.suppliers.length === 0 && results.categories.length === 0 && (
        <EmptyState
          icon="search"
          title="No matches found"
          message={`We couldn't find anything for “${q}”. Try a broader term.`}
        />
      )}

      {results.products.length > 0 && (
        <section style={{ marginTop: 8 }}>
          <div className="section-head">
            <div>
              <h2 className="h-section">Products</h2>
              <p className="small muted">
                {results.products.length} product{results.products.length === 1 ? "" : "s"} ·{" "}
                <b>{supplierCount} supplier{supplierCount === 1 ? "" : "s"}</b> selling matching products
              </p>
            </div>
          </div>
          <ProductGrid products={results.products} cols={4} />
        </section>
      )}

      {results.suppliers.length > 0 && (
        <section style={{ marginTop: 44 }}>
          <div className="section-head">
            <div>
              <h2 className="h-section">Suppliers</h2>
              <p className="small muted"><b>{results.suppliers.length}</b> suppliers match your search</p>
            </div>
          </div>
          <div className="grid grid-3">
            {results.suppliers.map((s) => (
              <SupplierCard key={s.id} supplier={s} />
            ))}
          </div>
        </section>
      )}

      {results.categories.length > 0 && (
        <section style={{ marginTop: 44 }}>
          <div className="section-head">
            <div>
              <h2 className="h-section">Categories</h2>
            </div>
          </div>
          <div className="row wrap">
            {results.categories.map((c) => (
              <a key={c.id} href={`/categories/${c.slug}`} className="chip">
                {c.name} · {c.productCount} products →
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}