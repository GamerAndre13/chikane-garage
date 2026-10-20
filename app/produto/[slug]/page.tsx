import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/shop/add-to-cart";
import { getShopProduct } from "@/lib/shop";
import { euro } from "@/lib/shop";

export async function generateMetadata({ params }: PageProps<"/produto/[slug]">) {
  const { slug } = await params;
  const product = await getShopProduct(slug);
  return product ? { title: product.name, description: product.short_description || product.name } : { title: "Artigo não encontrado" };
}

export default async function ProdutoPage({ params }: PageProps<"/produto/[slug]">) {
  const { slug } = await params;
  const product = await getShopProduct(slug);
  if (!product) notFound();
  const images = product.product_images ?? [];
  return <div className="mx-auto max-w-[1280px] px-5 pb-20 pt-8 sm:px-8 sm:pt-12 lg:px-12">
    <Link href="/loja" className="font-display text-[10px] uppercase tracking-[0.25em] text-copper">← Voltar à loja</Link>
    <div className="mt-7 grid gap-9 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
      <div className="grid gap-3 sm:grid-cols-2">
        {images.length ? images.map((image, index) => <div key={image.id ?? image.url} className={`relative aspect-[4/3] overflow-hidden bg-surface-mid ${index === 0 ? "sm:col-span-2" : ""}`}><Image src={image.url} alt={image.alt_text || product.name} fill priority={index === 0} sizes={index === 0 ? "(max-width: 768px) 100vw, 60vw" : "(max-width: 768px) 50vw, 30vw"} className="object-cover" /></div>) : <div className="flex aspect-[4/3] items-center justify-center bg-surface-mid font-display text-sm uppercase tracking-widest text-muted sm:col-span-2">Chikane Garage</div>}
      </div>
      <section className="lg:sticky lg:top-28 lg:h-fit">
        <p className="font-display text-[10px] uppercase tracking-[0.28em] text-copper">{product.product_categories?.name ?? "Loja"}{product.brands?.name ? ` · ${product.brands.name}` : ""}</p>
        <h1 className="mt-3 font-display text-4xl font-bold uppercase leading-[0.95] text-foreground sm:text-5xl">{product.name}</h1>
        <p className="mt-5 font-display text-2xl text-copper">{euro(Number(product.price))}</p>
        {product.short_description && <p className="mt-5 text-sm leading-relaxed text-silver">{product.short_description}</p>}
        <div className="mt-8 border-y border-border py-6"><AddToCart product={product} /></div>
        {!!product.product_compatibility?.length && <section className="mt-7 border-t border-border pt-6"><h2 className="font-display text-xs uppercase tracking-[0.2em] text-copper">Compatibilidade</h2><ul className="mt-3 space-y-3">{product.product_compatibility.map((item, index) => <li key={`${item.brand}-${item.model}-${index}`} className="border border-border bg-surface p-4"><p className="font-display text-sm uppercase text-foreground">{item.brand} {item.model}{item.year_from || item.year_to ? ` · ${item.year_from ?? "…"}–${item.year_to ?? "…"}` : ""}</p>{item.notes && <p className="mt-1 text-xs leading-relaxed text-muted">{item.notes}</p>}</li>)}</ul></section>}
        {product.description && <div className="prose prose-invert mt-8 max-w-none whitespace-pre-line text-sm leading-relaxed text-muted">{product.description}</div>}
        <p className="mt-8 border-t border-border pt-5 text-xs leading-relaxed text-muted">Preços com IVA incluído. Portes calculados no checkout segundo o destino e peso da encomenda.</p>
      </section>
    </div>
  </div>;
}
