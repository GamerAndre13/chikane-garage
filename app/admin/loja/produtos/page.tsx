import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deactivateShopProduct } from "@/app/actions/shop-admin";
import { euro } from "@/lib/shop";

export default async function AdminProdutosPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("id,slug,name,price,status,stock_mode,product_categories(name),product_variants(stock_quantity)").order("created_at", { ascending: false });
  const products = (data ?? []) as unknown as { id: string; slug: string; name: string; price: number; status: string; stock_mode: string; product_categories: { name: string } | null; product_variants: { stock_quantity: number }[] }[];
  return <section><header className="flex flex-wrap items-end justify-between gap-4"><div><Link href="/admin/loja" className="font-display text-[10px] uppercase tracking-widest text-copper">← Loja</Link><h1 className="mt-3 font-display text-3xl font-bold uppercase">Produtos</h1></div><Link href="/admin/loja/produtos/novo" className="bg-copper px-5 py-3 font-display text-xs uppercase tracking-widest text-black">Novo artigo</Link></header>
    {!products.length ? <p className="mt-7 border border-border bg-surface p-6 text-sm text-muted">Ainda não há artigos. Cria o primeiro para começar a preencher a montra.</p> : <div className="mt-7 overflow-x-auto border-y border-border"><table className="w-full min-w-[760px] text-left text-sm"><thead className="font-display text-[10px] uppercase tracking-widest text-muted"><tr><th className="py-3">Artigo</th><th>Categoria</th><th>Preço</th><th>Stock</th><th>Estado</th><th></th></tr></thead><tbody className="divide-y divide-border">{products.map((product) => <tr key={product.id}><td className="py-4"><Link href={`/admin/loja/produtos/${product.id}`} className="font-medium text-foreground hover:text-copper">{product.name}</Link><p className="mt-1 text-xs text-muted">/{product.slug}</p></td><td className="text-muted">{product.product_categories?.name ?? "—"}</td><td>{euro(Number(product.price))}</td><td>{product.stock_mode === "unlimited" ? "Sem limite" : product.product_variants.reduce((sum, variant) => sum + variant.stock_quantity, 0)}</td><td><span className="text-xs uppercase text-muted">{product.status === "active" ? "Ativo" : product.status}</span></td><td><form action={deactivateShopProduct}><input type="hidden" name="id" value={product.id}/><button className="text-xs text-muted underline hover:text-red">Arquivar</button></form></td></tr>)}</tbody></table></div>}
  </section>;
}
