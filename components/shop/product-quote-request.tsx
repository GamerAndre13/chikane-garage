"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProductQuoteRequest } from "@/app/actions/shop";
import type { ShopProduct, ShopVariant } from "@/lib/shop";
import { euro } from "@/lib/shop-format";

// Artigos "só por encomenda" (stock_mode on_request): não são compráveis com
// pagamento imediato — o cliente envia um pedido de compra à equipa, que
// confirma prazo e custos antes de qualquer cobrança. O percurso do pedido
// fica visível pelo link do comprovativo.
export function ProductQuoteRequest({ product }: { product: ShopProduct }) {
  const router = useRouter();
  const variants = product.product_variants?.filter((variant) => variant.is_active !== false) ?? [];
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState("");

  const variant = variants.find((item) => item.id === variantId) as ShopVariant | undefined;
  const price = Number(product.price) + Number(variant?.price_delta ?? 0);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await createProductQuoteRequest({
        product_id: product.id,
        variant_id: variantId || undefined,
        quantity,
        customer: { customer_name: name.trim(), customer_email: email.trim(), customer_phone: phone.trim() },
      });
      if (result.error) { setError(result.error); return; }
      if (result.orderToken) router.push(`/encomenda/${result.orderToken}`);
    });
  }

  return (
    <div className="space-y-5">
      {variants.length > 1 && <label className="block text-xs uppercase tracking-widest text-muted">Opção
        <select value={variantId} onChange={(event) => { setVariantId(event.target.value); setQuantity(1); }} className="mt-2 block w-full border border-border bg-background px-3 py-3 text-sm text-foreground">
          {variants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>}
      {variants.length === 1 && variants[0]?.name !== "Único" && <p className="text-sm text-muted">{variants[0]?.name}</p>}
      <div className="flex items-center gap-4">
        <label className="text-xs uppercase tracking-widest text-muted">Quantidade
          <input aria-label="Quantidade" type="number" min={1} max={20} value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(Number(event.target.value) || 1, 20)))} className="mt-2 block w-24 border border-border bg-background px-3 py-3 text-center text-sm text-foreground" />
        </label>
        <p className="font-display text-2xl text-copper">{euro(price * quantity)}</p>
      </div>

      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="w-full bg-copper px-6 py-4 font-display text-xs font-semibold uppercase tracking-[0.2em] text-black transition-colors hover:bg-copper-light">Pedir por encomenda</button>
      ) : (
        <form onSubmit={submit} className="space-y-4 border border-copper/40 bg-surface-mid p-4">
          <p className="text-xs leading-relaxed text-muted">Deixa os teus dados: a equipa confirma o prazo de entrega e os custos finais contigo antes de qualquer pagamento.</p>
          <label className="block text-xs uppercase tracking-widest text-muted">Nome completo
            <input required value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className="mt-2 block w-full border border-border bg-background px-3 py-3 text-sm normal-case tracking-normal text-foreground" />
          </label>
          <label className="block text-xs uppercase tracking-widest text-muted">Email
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="mt-2 block w-full border border-border bg-background px-3 py-3 text-sm normal-case tracking-normal text-foreground" />
          </label>
          <label className="block text-xs uppercase tracking-widest text-muted">Telemóvel
            <input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" className="mt-2 block w-full border border-border bg-background px-3 py-3 text-sm normal-case tracking-normal text-foreground" />
          </label>
          {error && <p role="alert" className="border border-red/50 bg-red/10 p-3 text-sm text-red-light">{error}</p>}
          <button type="submit" disabled={busy} className="w-full bg-copper px-6 py-4 font-display text-xs font-semibold uppercase tracking-[0.2em] text-black transition-colors hover:bg-copper-light disabled:opacity-50">{busy ? "A enviar pedido…" : "Enviar pedido de compra"}</button>
        </form>
      )}
      <p className="text-xs leading-relaxed text-muted">Só por encomenda: artigo obtido sob pedido — sem stock imediato. O preço apresentado inclui IVA; portes e prazo confirmados pela equipa.</p>
    </div>
  );
}
