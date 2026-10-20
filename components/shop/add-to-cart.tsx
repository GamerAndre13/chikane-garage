"use client";

import { useState } from "react";
import { useShopCart } from "@/components/shop/cart-provider";
import type { ShopProduct, ShopVariant } from "@/lib/shop";
import { euro } from "@/lib/shop-format";

export function AddToCart({ product }: { product: ShopProduct }) {
  const variants = product.product_variants?.filter((variant) => variant.is_active !== false) ?? [];
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { add } = useShopCart();
  const variant = variants.find((item) => item.id === variantId) as ShopVariant | undefined;
  const stock = product.stock_mode === "unlimited" ? null : variant?.stock_quantity ?? 0;
  const canBuy = Boolean(variant) && (stock === null || stock > 0);
  const price = Number(product.price) + Number(variant?.price_delta ?? 0);

  function handleAdd() {
    if (!variant || !canBuy) return;
    add(product, variant, quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2200);
  }

  return (
    <div className="space-y-5">
      {variants.length > 1 && <label className="block text-xs uppercase tracking-widest text-muted">Opção
        <select value={variantId} onChange={(event) => { setVariantId(event.target.value); setQuantity(1); }} className="mt-2 block w-full border border-border bg-background px-3 py-3 text-sm text-foreground">
          {variants.map((item) => <option key={item.id} value={item.id}>{item.name}{item.stock_quantity === 0 && product.stock_mode !== "unlimited" ? " — esgotado" : ""}</option>)}
        </select>
      </label>}
      {variants.length === 1 && variants[0]?.name !== "Único" && <p className="text-sm text-muted">{variants[0]?.name}</p>}
      <div className="flex items-center gap-4">
        <label className="text-xs uppercase tracking-widest text-muted">Quantidade
          <input aria-label="Quantidade" type="number" min={1} max={stock ?? undefined} value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(Number(event.target.value) || 1, stock ?? Number.MAX_SAFE_INTEGER)))} className="mt-2 block w-24 border border-border bg-background px-3 py-3 text-center text-sm text-foreground" />
        </label>
        <p className="font-display text-2xl text-copper">{euro(price)}</p>
      </div>
      <button type="button" onClick={handleAdd} disabled={!canBuy} className="w-full bg-copper px-6 py-4 font-display text-xs font-semibold uppercase tracking-[0.2em] text-black transition-colors hover:bg-copper-light disabled:cursor-not-allowed disabled:bg-surface-raised disabled:text-muted">
        {!canBuy ? "Indisponível" : added ? "Adicionado ao carrinho" : "Adicionar ao carrinho"}
      </button>
      <p className="text-xs leading-relaxed text-muted">{stock === null ? "Disponível por encomenda." : stock > 0 ? `${stock} unidade${stock === 1 ? "" : "s"} disponível${stock === 1 ? "" : "is"}.` : "Sem stock neste momento."} O preço apresentado inclui IVA.</p>
    </div>
  );
}
