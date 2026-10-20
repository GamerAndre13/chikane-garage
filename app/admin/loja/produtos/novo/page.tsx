import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/app/admin/loja/produtos/product-form";

export default async function NovoProdutoPage() {
  const supabase = await createClient();
  const [{ data: categories }, { data: brands }] = await Promise.all([
    supabase.from("product_categories").select("id,name").eq("is_active", true).order("position"),
    supabase.from("brands").select("id,name").eq("is_active", true).order("position"),
  ]);
  return <section><Link href="/admin/loja/produtos" className="font-display text-[10px] uppercase tracking-widest text-copper">← Produtos</Link><h1 className="mt-3 font-display text-3xl font-bold uppercase">Novo artigo</h1>{categories?.length ? <ProductForm categories={categories} brands={brands ?? []}/> : <p className="mt-6 border border-border p-5 text-sm text-muted">Cria uma categoria antes de adicionares o primeiro artigo.</p>}</section>;
}
