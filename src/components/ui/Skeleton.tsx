/* Skeleton loading primitives — elegant placeholders for async states */

import type { CSSProperties } from "react";

export function SkeletonBox({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

export function ProductCardSkeleton() {
  return (
    <div className="card pcard skeleton-card">
      <SkeletonBox className="pcard-img" />
      <div className="pcard-body">
        <SkeletonBox className="skeleton-line w-60" />
        <SkeletonBox className="skeleton-line w-40" />
        <SkeletonBox className="skeleton-line w-50" />
        <div className="between" style={{ marginTop: 4 }}>
          <SkeletonBox className="skeleton-line w-40" />
          <SkeletonBox className="skeleton-rect w-32" />
        </div>
      </div>
    </div>
  );
}

export function SupplierCardSkeleton() {
  return (
    <div className="card scard skeleton-card">
      <SkeletonBox className="scard-img" />
      <div className="scard-body">
        <SkeletonBox className="skeleton-line w-60" />
        <SkeletonBox className="skeleton-line w-45" />
        <SkeletonBox className="skeleton-line w-70" />
      </div>
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="card stat-card skeleton-card" style={{ padding: 20 }}>
      <SkeletonBox className="skeleton-rect" style={{ width: 44, height: 44, borderRadius: 12 }} />
      <SkeletonBox className="skeleton-line w-50" />
      <SkeletonBox className="skeleton-line w-70" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {[...Array(6)].map((_, i) => (
              <th key={i}>
                <SkeletonBox className="skeleton-line w-60" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(rows)].map((_, r) => (
            <tr key={r}>
              {[...Array(6)].map((_, c) => (
                <td key={c}>
                  <SkeletonBox className="skeleton-line" style={{ width: c === 5 ? "70%" : "90%" }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 32 }}>
      <SkeletonBox style={{ height: 440, borderRadius: 20 }} />
      <div className="stack-sm">
        <SkeletonBox className="skeleton-line w-70" />
        <SkeletonBox className="skeleton-line w-55" />
        <SkeletonBox className="skeleton-line w-40" />
        <SkeletonBox style={{ height: 110, borderRadius: 14 }} />
        <SkeletonBox style={{ height: 56, borderRadius: 14 }} />
      </div>
    </div>
  );
}

export function FeaturedProductsSkeleton() {
  return (
    <div className="grid grid-4">
      {[...Array(8)].map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}