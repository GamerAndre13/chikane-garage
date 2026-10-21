import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/app/admin/loja/produtos/product-form";

export default async function NovoProdutoPage() {
  const supabase = await createClient();
  const [{ data: categories }, { data: brands }] = await Promise.all([
    supabase.from("product_categories").select("id,name").eq("is_active", true).order("position"),
    supabase.from("brands").select("id,name").eq("is_active", true).order("position"),
  ]);
  return <section><Link href="/admin/loja/produtos" className="font-display text-[10px] uppercase tracking-widest text-copper">← Produtos</Link><h1 className="mt-3 font-display text-3xl font-bold uppercase">Novo artigo</h1>{!categories?.length && <p className="mt-4 max-w-2xl text-xs leading-5 text-muted">Ainda não há categorias — escreve um nome novo no campo «Categoria» e ela é criada ao guardar.</p>}<div className="mt-7 grid gap-5 lg:grid-cols-[1fr_340px]"><ProductForm categories={categories ?? []} brands={brands ?? []}/></div></section>;
}
