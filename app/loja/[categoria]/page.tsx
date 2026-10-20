import Link from "next/link";
import { notFound } from "next/navigation";
import { getShopCategories, getShopProducts } from "@/lib/shop";
import { ProductCard } from "@/components/shop/product-card";

export default async function CategoriaLojaPage({ params }: PageProps<"/loja/[categoria]">) {
  const { categoria: slug } = await params;
  const [categories, products] = await Promise.all([getShopCategories(), getShopProducts({ category: slug })]);
  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();
  return <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:px-12">
    <Link href="/loja" className="font-display text-[10px] uppercase tracking-[0.25em] text-copper">← Loja</Link>
    <header className="mt-6 border-b border-border pb-10"><p className="font-display text-[10px] uppercase tracking-[0.28em] text-copper">Coleção</p><h1 className="mt-3 font-display text-5xl font-bold uppercase leading-none text-foreground sm:text-7xl">{category.name}</h1>{category.description && <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted">{category.description}</p>}</header>
    {products.length ? <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} />)}</section> : <p className="mt-8 border border-border bg-surface p-8 text-sm text-muted">Ainda não há artigos nesta categoria.</p>}
  </div>;
}
