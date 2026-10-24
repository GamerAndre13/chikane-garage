import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { adjustShopStock } from "@/app/actions/shop-admin";
import { AvisoErro } from "@/app/admin/loja/aviso";
import { PageHeader, Card, EmptyState } from "@/app/admin/loja/_ui";

export default async function StockLojaPage({ searchParams }: PageProps<"/admin/loja/stock">) {
  const { erro } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("product_variants").select("id,name,sku,stock_quantity,is_active,products!inner(id,name,stock_mode,low_stock_threshold)").eq("is_active", true).order("name");
  const variants = (data ?? []) as unknown as { id: string; name: string; sku: string; stock_quantity: number; products: { id: string; name: string; stock_mode: string; low_stock_threshold: number } }[];

  return (
    <div>
      <PageHeader
        title="Stock"
        subtitle="Ajustar existências por variante e registar movimentos."
        backHref="/admin/loja"
        breadcrumbs={[{ label: "Loja", href: "/admin/loja" }]}
      />
      <AvisoErro erro={erro} />
      <Card title="Variantes com stock" subtitle={`${variants.length} ${variants.length === 1 ? "variante" : "variantes"}`}>
        {!variants.length ? (
          <EmptyState title="Sem variantes ativas" description="Cria variantes nos artigos para gerir stock." />
        ) : (
          <div className="divide-y divide-border">
            {variants.map((variant) => {
              const low = variant.products.stock_mode === "managed" && variant.stock_quantity <= variant.products.low_stock_threshold;
              return (
                <div key={variant.id} className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto_280px] sm:items-center">
                  <div>
                    <Link href={`/admin/loja/produtos/${variant.products.id}`} className="text-foreground transition-colors hover:text-copper">{variant.products.name}</Link>
                    <p className="mt-1 text-xs text-muted">{variant.name}{variant.sku ? ` · SKU: ${variant.sku}` : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-display text-lg ${low ? "text-warning" : "text-foreground"}`}>{variant.products.stock_mode === "unlimited" ? "∞" : variant.stock_quantity}</p>
                    {low && <p className="text-[10px] uppercase tracking-widest text-warning">Stock baixo</p>}
                  </div>
                  <form action={adjustShopStock} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="variant_id" value={variant.id} />
                    <input type="number" name="delta" required placeholder="± unidades" className="min-w-0 flex-1 border border-border bg-background px-2.5 py-2 text-sm text-foreground" />
                    <select name="reason" className="border border-border bg-background px-2 py-2 text-xs text-foreground">
                      <option value="adjustment">Ajuste</option>
                      <option value="restock">Reposição</option>
                      <option value="return">Devolução</option>
                    </select>
                    <button className="border border-border px-3 py-2 font-display text-[10px] uppercase tracking-widest text-muted transition-colors hover:border-copper hover:text-copper">Registar</button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
