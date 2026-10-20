"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ShopProduct, ShopVariant } from "@/lib/shop";

export type CartLine = { productId: string; slug: string; name: string; image: string; variantId: string; variantName: string; price: number; quantity: number; stock: number | null; weightGrams: number };
type CartContextValue = { lines: CartLine[]; hydrated: boolean; count: number; subtotal: number; add: (product: ShopProduct, variant: ShopVariant, quantity?: number) => void; setQuantity: (variantId: string, quantity: number) => void; remove: (variantId: string) => void; clear: () => void };
const STORAGE_KEY = "chikane-shop-cart-v1";
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setLines(JSON.parse(saved) as CartLine[]);
      } catch { /* Um carrinho inválido começa vazio. */ }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [hydrated, lines]);

  const add = useCallback((product: ShopProduct, variant: ShopVariant, quantity = 1) => {
    const stock = product.stock_mode === "unlimited" ? null : variant.stock_quantity ?? 0;
    const line: CartLine = {
      productId: product.id, slug: product.slug, name: product.name,
      image: product.product_images?.[0]?.url ?? "", variantId: variant.id,
      variantName: variant.name, price: Number(product.price) + Number(variant.price_delta ?? 0),
      quantity, stock, weightGrams: Number(product.weight_grams ?? 0),
    };
    setLines((current) => {
      const existing = current.find((item) => item.variantId === line.variantId);
      if (!existing) return [...current, line];
      return current.map((item) => item.variantId === line.variantId
        ? { ...item, quantity: Math.min(item.quantity + quantity, item.stock ?? Number.MAX_SAFE_INTEGER) }
        : item);
    });
  }, []);

  const setQuantity = useCallback((variantId: string, quantity: number) => setLines((current) => current.map((item) => item.variantId === variantId
    ? { ...item, quantity: Math.min(Math.max(1, quantity), item.stock ?? Number.MAX_SAFE_INTEGER) }
    : item)), []);
  const remove = useCallback((variantId: string) => setLines((current) => current.filter((item) => item.variantId !== variantId)), []);
  const clear = useCallback(() => setLines([]), []);
  const value = useMemo(() => ({ lines, hydrated, count: lines.reduce((sum, item) => sum + item.quantity, 0), subtotal: lines.reduce((sum, item) => sum + item.price * item.quantity, 0), add, setQuantity, remove, clear }), [lines, hydrated, add, setQuantity, remove, clear]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useShopCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useShopCart tem de ser usado dentro de CartProvider");
  return value;
}
