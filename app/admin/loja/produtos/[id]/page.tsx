import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/app/admin/loja/produtos/product-form";
import { ProductImagesManager } from "@/app/admin/loja/produtos/product-images-manager";
import { PageHeader } from "@/app/admin/loja/_ui";

export default async function EditarProdutoPage({ params, searchParams }: PageProps<"/admin/loja/produtos/[id]">) {
  const { id } = await params;
  const { aviso } = await searchParams;
  const supabase = await createClient();
  const [{ data: product }, { data: categories }, { data: brands }, { data: variants }, { data: images }] = await Promise.all([
    supabase.from("products").select("id,slug,name,category_id,brand_id,price,compare_at_price,short_description,description,sku,weight_grams,stock_mode,status,kind,vat_rate,is_featured,is_new,low_stock_threshold,product_compatibility(brand,model,year_from,year_to,notes)").eq("id", id).maybeSingle(),
    supabase.from("product_categories").select("id,name").eq("is_active", true).order("position"),
    supabase.from("brands").select("id,name").eq("is_active", true).order("position"),
    supabase.from("product_variants").select("id,name,sku,stock_quantity,price_delta,position,is_active").eq("product_id", id).order("position"),
    supabase.from("product_images").select("id,url,alt_text,position").eq("product_id", id).order("position"),
  ]);
  if (!product) notFound();
  const initial = { ...product, product_variants: variants ?? [] };
  return (
    <div>
      <PageHeader
        title="Editar artigo"
        subtitle={product.name}
        backHref="/admin/loja/produtos"
        breadcrumbs={[{ label: "Loja", href: "/admin/loja" }, { label: "Produtos", href: "/admin/loja/produtos" }]}
        actions={[{ label: "Ver na loja", href: `/produto/${product.slug}`, variant: "secondary" }]}
      />
      {aviso === "fotos" && <p role="status" className="mb-5 max-w-2xl border border-warning/40 bg-warning/10 p-3 text-xs leading-5 text-warning">O artigo foi guardado, mas não foi possível enviar as fotografias. Volta a adicioná-las em «Fotografias».</p>}
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <ProductForm categories={categories ?? []} brands={brands ?? []} initial={initial} />
          <ProductImagesManager productId={id} images={images ?? []} />
        </div>
      </div>
    </div>
  );
}
