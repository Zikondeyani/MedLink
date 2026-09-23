import { useMemo, useState } from "react";
import { useSuppliers } from "../lib/registry";
import SupplierCard from "../components/marketplace/SupplierCard";
import EmptyState from "../components/ui/EmptyState";

type Sort = "rating" | "products" | "newest";

export default function SuppliersPage() {
  const suppliers = useSuppliers().filter((s) => !s.suspended);
  const [q, setQ] = useState("");
  const [city, setCity] = useState("All");
  const [sort, setSort] = useState<Sort>("rating");

  const cities = useMemo(() => ["All", ...new Set(suppliers.map((s) => s.location.city))], []);

  const results = useMemo(() => {
    let list = [...suppliers];
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (s) => s.name.toLowerCase().includes(term) || s.category.toLowerCase().includes(term),
      );
    }
    if (city !== "All") list = list.filter((s) => s.location.city === city);
    switch (sort) {
      case "rating":
        list.sort((a, b) => b.rating - a.rating);
        break;
      case "products":
        list.sort((a, b) => b.productCount - a.productCount);
        break;
      case "newest":
        list.sort((a, b) => b.joined.localeCompare(a.joined));
        break;
    }
    return list;
  }, [q, city, sort]);

  return (
    <div className="page suppliers-page">
      <div className="page-head container">
        <span className="eyebrow">Supplier network</span>
        <h1 className="h-display" style={{ fontSize: "clamp(24px,4vw,34px)" }}>Explore Suppliers</h1>
        <p className="muted">
          Verified medical stores across Malawi. Buy direct — MedLink handles checkout, collection and delivery.
        </p>
      </div>

      <div className="container">
        <div className="card card-pad browse-bar">
          <input
            className="input"
            placeholder="Search suppliers by name or category..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search suppliers"
          />
          <select className="select" value={city} onChange={(e) => setCity(e.target.value)} aria-label="Filter by city">
            {cities.map((c) => (
              <option key={c} value={c}>{c === "All" ? "All cities" : c}</option>
            ))}
          </select>
          <select className="select" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort suppliers">
            <option value="rating">Top rated</option>
            <option value="products">Most products</option>
            <option value="newest">Newest</option>
          </select>
        </div>

        {results.length === 0 ? (
          <EmptyState icon="search" title="No suppliers found" message="Try a different search term or location." />
        ) : (
          <div className="grid grid-3">
            {results.map((s) => (
              <SupplierCard key={s.id} supplier={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}