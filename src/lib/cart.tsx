import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { productById } from "../data/products";
import type { Product } from "../data/types";

export interface CartLine {
  productId: string;
  quantity: number;
}

export interface CartGroup {
  supplierId: string;
  supplierName: string;
  lines: { product: Product; quantity: number }[];
  subtotal: number;
}

export interface CartSummary {
  groups: CartGroup[];
  items: number;
  subtotal: number;
}

interface CartContextValue {
  lines: CartLine[];
  summary: CartSummary;
  add: (productId: string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function buildSummary(lines: CartLine[]): CartSummary {
  const valid = lines.filter((l) => productById(l.productId));
  const supplierMap = new Map<string, CartGroup>();

  for (const line of valid) {
    const product = productById(line.productId);
    if (!product) continue;
    let group = supplierMap.get(product.supplierId);
    if (!group) {
      group = { supplierId: product.supplierId, supplierName: "", lines: [], subtotal: 0 };
      supplierMap.set(product.supplierId, group);
    }
    group.lines.push({ product, quantity: line.quantity });
    group.subtotal += product.price * line.quantity;
  }

  const groups = [...supplierMap.values()];
  const items = valid.reduce((acc, l) => acc + l.quantity, 0);
  const subtotal = groups.reduce((acc, g) => acc + g.subtotal, 0);

  return { groups, items, subtotal };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([
    { productId: "p-blood-pressure-monitor", quantity: 2 },
    { productId: "p-stethoscope", quantity: 1 },
  ]);

  const value = useMemo<CartContextValue>(() => {
    const add = (productId: string, quantity = 1) => {
      setLines((prev) => {
        const existing = prev.find((l) => l.productId === productId);
        if (existing) {
          return prev.map((l) =>
            l.productId === productId ? { ...l, quantity: Math.min(l.quantity + quantity, 99) } : l,
          );
        }
        return [...prev, { productId, quantity }];
      });
    };

    const setQuantity = (productId: string, quantity: number) => {
      if (quantity <= 0) {
        setLines((prev) => prev.filter((l) => l.productId !== productId));
        return;
      }
      setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, quantity } : l)));
    };

    const remove = (productId: string) => {
      setLines((prev) => prev.filter((l) => l.productId !== productId));
    };

    const clear = () => setLines([]);

    return { lines, summary: buildSummary(lines), add, setQuantity, remove, clear };
  }, [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}