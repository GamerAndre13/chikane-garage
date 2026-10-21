import Image from "next/image";
import Link from "next/link";
import type { ShopProduct } from "@/lib/shop";
import { euro } from "@/lib/shop-format";

export function ProductCard({ product }: { product: ShopProduct }) {
  const image = product.product_images?.[0];
  const onRequest = product.stock_mode === "on_request";
  const stock = product.product_variants?.some((variant) => (variant.stock_quantity ?? 0) > 0 || variant.stock_mode === "unlimited");
  return (
    <article className="group border border-border bg-surface transition-colors hover:border-copper/70">
      <Link href={`/produto/${product.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-surface-mid">
          {image ? <Image src={image.url} alt={image.alt_text || product.name} fill sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" /> : <div className="flex h-full items-center justify-center font-display text-sm uppercase tracking-widest text-muted">Chikane Garage</div>}
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {product.kind === "part" && <span className="border border-silver/40 bg-black/80 px-2 py-1 font-display text-[10px] uppercase tracking-widest text-silver">Peça</span>}
            {product.is_new && <span className="bg-copper px-2 py-1 font-display text-[10px] uppercase tracking-widest text-black">Novo</span>}
            {onRequest && <span className="border border-copper/60 bg-black/80 px-2 py-1 font-display text-[10px] uppercase tracking-widest text-copper">Só por encomenda</span>}
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <p className="font-display text-[10px] uppercase tracking-[0.2em] text-copper">{product.product_categories?.name ?? "Loja"}</p>
          <h2 className="mt-2 font-display text-lg uppercase leading-tight text-foreground">{product.name}</h2>
          {product.short_description && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">{product.short_description}</p>}
          <div className="mt-5 flex items-end justify-between gap-3 border-t border-border pt-4">
            <span className="font-display text-lg text-foreground">{euro(Number(product.price))}</span>
            <span className={`text-[10px] uppercase tracking-wider ${onRequest ? "text-copper" : stock ? "text-success" : "text-muted"}`}>{onRequest ? "Por encomenda" : stock ? "Disponível" : "Esgotado"}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
