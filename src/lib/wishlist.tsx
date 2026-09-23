import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface WishlistContextValue {
  ids: string[];
  has: (productId: string) => boolean;
  toggle: (productId: string) => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([
    "p-oxygen-concentrator",
    "p-ultrasound",
    "p-microscope",
    "p-hospital-bed",
  ]);

  const value = useMemo<WishlistContextValue>(
    () => ({
      ids,
      has: (productId) => ids.includes(productId),
      toggle: (productId) =>
        setIds((prev) => (prev.includes(productId) ? prev.filter((i) => i !== productId) : [...prev, productId])),
    }),
    [ids],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}