import type { Product } from "../../data/types";
import ProductCard from "./ProductCard";
import { ProductCardSkeleton } from "../ui/Skeleton";

export default function ProductGrid({
  products,
  loading = false,
  cols = 4,
  skeletonCount = 8,
}: {
  products: Product[];
  loading?: boolean;
  cols?: 4 | 3;
  skeletonCount?: number;
}) {
  if (loading) {
    return (
      <div className={`grid ${cols === 4 ? "grid-auto" : "grid-3"}`}>
        {[...Array(skeletonCount)].map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className={`grid ${cols === 4 ? "grid-auto" : "grid-3"}`}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}