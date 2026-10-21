import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/app/admin/loja/produtos/product-form";
import { ProductImagesManager } from "@/app/admin/loja/produtos/product-images-manager";

export default async function EditarProdutoPage({ params }: PageProps<"/admin/loja/produtos/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: product }, { data: categories }, { data: brands }, { data: variants }, { data: images }] = await Promise.all([
    supabase.from("products").select("id,slug,name,category_id,brand_id,price,compare_at_price,short_description,description,sku,weight_grams,stock_mode,status,vat_rate,is_featured,is_new,low_stock_threshold,product_compatibility(brand,model,year_from,year_to,notes)").eq("id", id).maybeSingle(),
    supabase.from("product_categories").select("id,name").eq("is_active", true).order("position"),
    supabase.from("brands").select("id,name").eq("is_active", true).order("position"),
    supabase.from("product_variants").select("id,name,sku,stock_quantity,price_delta,position,is_active").eq("product_id", id).order("position"),
    supabase.from("product_images").select("id,url,alt_text,position").eq("product_id", id).order("position"),
  ]);
  if (!product) notFound();
  const initial = { ...product, product_variants: variants ?? [] };
  return <section><Link href="/admin/loja/produtos" className="font-display text-[10px] uppercase tracking-widest text-copper">← Produtos</Link><h1 className="mt-3 font-display text-3xl font-bold uppercase">Editar artigo</h1><ProductForm categories={categories ?? []} brands={brands ?? []} initial={initial}/><div className="mt-5"><ProductImagesManager productId={id} images={images ?? []}/></div></section>;
}
