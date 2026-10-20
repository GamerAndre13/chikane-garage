import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/app/admin/loja/produtos/product-form";

export default async function EditarProdutoPage({ params }: PageProps<"/admin/loja/produtos/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: product }, { data: categories }, { data: brands }] = await Promise.all([
    supabase.from("products").select("id,slug,name,category_id,brand_id,price,compare_at_price,short_description,description,sku,weight_grams,stock_mode,status,vat_rate,is_featured,is_new,low_stock_threshold").eq("id", id).maybeSingle(),
    supabase.from("product_categories").select("id,name").eq("is_active", true).order("position"),
    supabase.from("brands").select("id,name").eq("is_active", true).order("position"),
  ]);
  if (!product) notFound();
  return <section><Link href="/admin/loja/produtos" className="font-display text-[10px] uppercase tracking-widest text-copper">← Produtos</Link><h1 className="mt-3 font-display text-3xl font-bold uppercase">Editar artigo</h1><ProductForm categories={categories ?? []} brands={brands ?? []} initial={product}/></section>;
}
