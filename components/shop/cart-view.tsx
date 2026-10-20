"use client";

import Image from "next/image";
import Link from "next/link";
import { useShopCart } from "@/components/shop/cart-provider";
import { euro } from "@/lib/shop-format";

export function CartView() {
  const { lines, hydrated, subtotal, setQuantity, remove } = useShopCart();
  if (!hydrated) return <div className="h-48 animate-pulse bg-surface" aria-label="A carregar o carrinho" />;
  if (!lines.length) return <div className="border border-border bg-surface p-8 text-center sm:p-14">
    <p className="font-display text-2xl uppercase text-foreground">O carrinho está vazio</p>
    <p className="mt-3 text-sm text-muted">Explora os artigos da garagem e adiciona os que procuras.</p>
    <Link href="/loja" className="mt-7 inline-flex bg-copper px-7 py-3 font-display text-xs uppercase tracking-widest text-black">Explorar a loja</Link>
  </div>;
  return <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
    <div className="divide-y divide-border border-y border-border">
      {lines.map((item) => <article key={item.variantId} className="grid grid-cols-[88px_1fr_auto] gap-4 py-5 sm:grid-cols-[120px_1fr_auto] sm:gap-6">
        <div className="relative aspect-square overflow-hidden bg-surface-mid">{item.image && <Image src={item.image} alt="" fill sizes="120px" className="object-cover" />}</div>
        <div className="min-w-0"><Link href={`/produto/${item.slug}`} className="font-display text-sm uppercase text-foreground hover:text-copper">{item.name}</Link><p className="mt-1 text-xs text-muted">{item.variantName}</p><button type="button" onClick={() => remove(item.variantId)} className="mt-3 text-xs text-muted underline underline-offset-4 hover:text-red">Remover</button></div>
        <div className="flex flex-col items-end gap-3"><p className="font-display text-sm text-foreground">{euro(item.price * item.quantity)}</p><label className="sr-only" htmlFor={`qty-${item.variantId}`}>Quantidade de {item.name}</label><input id={`qty-${item.variantId}`} type="number" min={1} max={item.stock ?? undefined} value={item.quantity} onChange={(event) => setQuantity(item.variantId, Number(event.target.value) || 1)} className="w-16 border border-border bg-background px-2 py-2 text-center text-sm" /></div>
      </article>)}
    </div>
    <aside className="h-fit border border-border bg-surface p-6">
      <h2 className="font-display text-lg uppercase text-foreground">Resumo</h2>
      <div className="mt-5 flex justify-between border-t border-border pt-4 text-sm"><span className="text-muted">Subtotal</span><span>{euro(subtotal)}</span></div>
      <p className="mt-2 text-xs leading-relaxed text-muted">Portes e descontos são calculados no checkout. IVA incluído.</p>
      <Link href="/checkout" className="mt-6 flex w-full justify-center bg-copper px-5 py-4 font-display text-xs uppercase tracking-widest text-black">Avançar para checkout</Link>
      <Link href="/loja" className="mt-4 block text-center text-xs text-muted underline underline-offset-4">Continuar a comprar</Link>
    </aside>
  </div>;
}
