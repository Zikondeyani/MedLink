import { PackageOpen } from "lucide-react";
import type { Product } from "../../data/types";
import ProductCard from "./ProductCard";
import { ProductCardSkeleton } from "../ui/Skeleton";

export default function ProductGrid({
  products,
  loading = false,
  cols = 4,
  skeletonCount = 8,
  empty = "No products are listed here yet.",
}: {
  products: Product[];
  loading?: boolean;
  cols?: 4 | 3;
  skeletonCount?: number;
  /** Shown when the database returned no products for this view. */
  empty?: string;
}) {
  if (loading) {
    return (
      <div className={`p-grid ${cols === 4 ? "p-grid-4" : "p-grid-3"}`}>
        {[...Array(skeletonCount)].map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // An empty catalogue is a real answer, not a loading failure — say so.
  if (products.length === 0) {
    return (
      <div className="empty">
        <div className="empty-icon">
          <PackageOpen size={28} strokeWidth={1.7} />
        </div>
        <p className="small muted" style={{ margin: 0 }}>{empty}</p>
      </div>
    );
  }

  return (
    <div className={`p-grid ${cols === 4 ? "p-grid-4" : "p-grid-3"}`}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}