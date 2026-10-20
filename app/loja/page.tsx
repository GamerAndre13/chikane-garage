import Link from "next/link";
import { getShopCategories, getShopProducts } from "@/lib/shop";
import { ProductCard } from "@/components/shop/product-card";

export const metadata = { title: "Loja", description: "Acessórios, detailing, peças e merchandising Chikane Garage." };

export default async function LojaPage() {
  const [categories, products] = await Promise.all([getShopCategories(), getShopProducts({ limit: 24 })]);
  return <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:px-12">
    <header className="border-b border-border pb-10 sm:pb-14">
      <p className="font-display text-[10px] uppercase tracking-[0.28em] text-copper">Garage store</p>
      <h1 className="mt-3 max-w-4xl font-display text-5xl font-bold uppercase leading-[0.92] tracking-tight text-foreground sm:text-7xl">Extras, acessórios e merchandising</h1>
      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">Artigos escolhidos para a tua garagem, com envio para Portugal e Europa.</p>
    </header>

    {categories.length > 0 && <nav aria-label="Categorias da loja" className="flex gap-2 overflow-x-auto border-b border-border py-5">
      <Link href="/loja" className="shrink-0 border border-copper bg-copper px-4 py-2 text-xs uppercase tracking-wider text-black">Todos</Link>
      {categories.map((category) => <Link key={category.id} href={`/loja/${category.slug}`} className="shrink-0 border border-border px-4 py-2 text-xs uppercase tracking-wider text-muted transition-colors hover:border-copper hover:text-copper">{category.name}</Link>)}
    </nav>}

    {products.length > 0 ? <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
      {products.map((product) => <ProductCard key={product.id} product={product} />)}
    </section> : <section className="mt-8 border border-border bg-surface p-8 sm:p-12">
      <p className="font-display text-xl uppercase text-foreground">A loja está a preparar-se</p>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">Os primeiros artigos serão publicados aqui em breve. Para já, fala connosco se procuras um acessório específico.</p>
      <Link href="/contacto" className="mt-6 inline-flex border border-copper px-5 py-3 font-display text-xs uppercase tracking-widest text-copper hover:bg-copper hover:text-black">Contactar a garagem</Link>
    </section>}
  </div>;
}
