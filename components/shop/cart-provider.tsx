"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ShopProduct, ShopVariant } from "@/lib/shop";

// Uma linha do carrinho é sempre um artigo da loja (variantId). `key` é o
// identificador único da linha (variantId); linhas antigas guardadas no
// localStorage sem `key` são normalizadas na leitura.
export type CartLine = {
  key: string;
  productId: string;
  slug: string;
  name: string;
  image: string;
  variantId: string;
  variantName: string;
  price: number;
  quantity: number;
  stock: number | null;
  weightGrams: number;
};

type CartContextValue = {
  lines: CartLine[];
  hydrated: boolean;
  count: number;
  subtotal: number;
  add: (product: ShopProduct, variant: ShopVariant, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};
const STORAGE_KEY = "chikane-shop-cart-v1";
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        // Linhas antigas de viaturas (gravadas no fluxo de carrinho com
        // viaturas) são descartadas: as viaturas agora são por pedido de
        // encomenda, pelo configurador.
        if (saved) setLines((JSON.parse(saved) as CartLine[]).filter((line) => Boolean(line.variantId)).map((line) => ({ ...line, key: line.key || line.variantId })));
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
      key: variant.id, productId: product.id, slug: product.slug, name: product.name,
      image: product.product_images?.[0]?.url ?? "", variantId: variant.id,
      variantName: variant.name, price: Number(product.price) + Number(variant.price_delta ?? 0),
      quantity, stock, weightGrams: Number(product.weight_grams ?? 0),
    };
    setLines((current) => {
      const existing = current.find((item) => item.key === line.key);
      if (!existing) return [...current, line];
      return current.map((item) => item.key === line.key
        ? { ...item, quantity: Math.min(item.quantity + quantity, item.stock ?? Number.MAX_SAFE_INTEGER) }
        : item);
    });
  }, []);

  // Viaturas: removidas do carrinho — a compra de viaturas novas é feita por
  // pedido de encomenda no configurador (/catalogo/[slug]/configurar).
  const setQuantity = useCallback((key: string, quantity: number) => setLines((current) => current.map((item) => {
    if (item.key !== key) return item;
    return { ...item, quantity: Math.min(Math.max(1, quantity), item.stock ?? Number.MAX_SAFE_INTEGER) };
  })), []);
  const remove = useCallback((key: string) => setLines((current) => current.filter((item) => item.key !== key)), []);
  const clear = useCallback(() => setLines([]), []);
  const value = useMemo(() => ({
    lines, hydrated,
    count: lines.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: lines.reduce((sum, item) => sum + item.price * item.quantity, 0),
    add, setQuantity, remove, clear,
  }), [lines, hydrated, add, setQuantity, remove, clear]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useShopCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useShopCart tem de ser usado dentro de CartProvider");
  return value;
}
