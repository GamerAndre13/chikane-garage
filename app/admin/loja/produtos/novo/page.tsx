import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/app/admin/loja/produtos/product-form";
import { PageHeader } from "@/app/admin/loja/_ui";

export default async function NovoProdutoPage() {
  const supabase = await createClient();
  const [{ data: categories }, { data: brands }] = await Promise.all([
    supabase.from("product_categories").select("id,name").eq("is_active", true).order("position"),
    supabase.from("brands").select("id,name").eq("is_active", true).order("position"),
  ]);
  return (
    <div>
      <PageHeader
        title="Novo artigo"
        subtitle="Adicionar artigo ou peça à loja."
        backHref="/admin/loja/produtos"
        breadcrumbs={[{ label: "Loja", href: "/admin/loja" }, { label: "Produtos", href: "/admin/loja/produtos" }]}
      />
      {!categories?.length && <p className="mb-5 max-w-2xl border border-warning/40 bg-warning/10 p-3 text-xs leading-5 text-warning">Ainda não há categorias — escreve um nome novo no campo «Categoria» e ela é criada ao guardar.</p>}
      <ProductForm categories={categories ?? []} brands={brands ?? []} />
    </div>
  );
}
