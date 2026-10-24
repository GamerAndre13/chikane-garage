import { createClient } from "@/lib/supabase/server";
import { createShopBrand, updateShopBrand, deleteShopBrand } from "@/app/actions/shop-admin";
import { AvisoErro } from "@/app/admin/loja/aviso";
import { PageHeader, Card, EmptyState } from "@/app/admin/loja/_ui";

const input = "mt-2 block w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground";

export default async function MarcasLojaPage({ searchParams }: PageProps<"/admin/loja/marcas">) {
  const { erro } = await searchParams;
  const supabase = await createClient();
  const [{ data: brands }, { data: products }] = await Promise.all([
    supabase.from("brands").select("id,name,slug,position,is_active").order("position").order("name"),
    supabase.from("products").select("brand_id"),
  ]);
  const counts = new Map<string, number>();
  for (const product of products ?? []) if (product.brand_id) counts.set(product.brand_id, (counts.get(product.brand_id) ?? 0) + 1);
  const list = brands ?? [];
  return (
    <div>
      <PageHeader
        title="Marcas"
        subtitle="Marcas de artigos da loja. Alimentam os acessórios recomendados na ficha das viaturas."
        backHref="/admin/loja"
        breadcrumbs={[{ label: "Loja", href: "/admin/loja" }]}
      />
      <AvisoErro erro={erro}/>
      <div className="space-y-5">
        <Card title="Adicionar marca" subtitle="Cria ou associa marcas aos artigos.">
          <form action={createShopBrand} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_120px_auto] sm:items-end">
            <Field name="name" label="Nome" required/>
            <Field name="slug" label="Referência (vazio = pelo nome)"/>
            <Field name="position" label="Ordem" type="number" defaultValue={list.length}/>
            <button className="mb-0.5 bg-copper px-4 py-2.5 font-display text-[11px] uppercase tracking-widest text-black transition-colors hover:bg-copper-light">Criar marca</button>
          </form>
        </Card>
        <Card title="Lista" subtitle={`${list.length} ${list.length === 1 ? "marca" : "marcas"}`}>
          {!list.length ? (
            <EmptyState title="Ainda não há marcas" description="Cria a primeira marca para organizar os artigos." />
          ) : (
            <div className="divide-y divide-border">
              {list.map((brand) => (
                <div key={brand.id} className="flex flex-wrap items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <form action={updateShopBrand} className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_100px_auto] sm:items-end">
                    <input type="hidden" name="id" value={brand.id}/>
                    <Field name="name" label="Nome" defaultValue={brand.name} required/>
                    <Field name="slug" label="Referência" defaultValue={brand.slug}/>
                    <Field name="position" label="Ordem" type="number" defaultValue={brand.position}/>
                    <div className="flex flex-wrap items-center gap-3 sm:pb-0.5">
                      <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" name="is_active" defaultChecked={brand.is_active} className="accent-[var(--copper)]"/>Visível</label>
                      <button className="border border-border px-3 py-2 font-display text-[10px] uppercase tracking-widest text-muted transition-colors hover:border-copper hover:text-copper">Guardar</button>
                      <span className="text-[11px] text-muted">{counts.get(brand.id) ?? 0} artigos</span>
                    </div>
                  </form>
                  <form action={deleteShopBrand} className="self-end pb-0.5"><input type="hidden" name="id" value={brand.id}/><button className="text-[11px] uppercase tracking-widest text-muted underline underline-offset-4 transition-colors hover:text-red">Apagar</button></form>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Field({ name, label, defaultValue, required, type = "text" }: { name: string; label: string; defaultValue?: string | number; required?: boolean; type?: string }) {
  return <label className="block text-xs uppercase tracking-widest text-muted">{label}<input name={name} type={type} required={required} defaultValue={defaultValue ?? ""} className={input}/></label>;
}
