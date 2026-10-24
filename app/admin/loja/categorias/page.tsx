import { createClient } from "@/lib/supabase/server";
import { createShopCategory, deactivateShopCategory } from "@/app/actions/shop-admin";
import { AvisoErro } from "@/app/admin/loja/aviso";
import { PageHeader, Card, EmptyState, Table, THead, TBody, TH, TD } from "@/app/admin/loja/_ui";

const input = "mt-2 block w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground";

export default async function CategoriasLojaPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const supabase = await createClient();
  const { data: categories } = await supabase.from("product_categories").select("id,name,slug,description,position,is_active,parent_id").order("position");
  const list = categories ?? [];
  const pais = list.filter((item) => !item.parent_id);

  return (
    <div>
      <PageHeader
        title="Categorias"
        subtitle="Organizar a montra da loja com categorias e subcategorias."
        backHref="/admin/loja"
        breadcrumbs={[{ label: "Loja", href: "/admin/loja" }]}
      />
      <AvisoErro erro={erro} />
      <div className="space-y-5">
        <Card title="Adicionar categoria" subtitle="Cria categorias principais ou subcategorias.">
          <form action={createShopCategory} className="grid gap-4 sm:grid-cols-2">
            <Field name="name" label="Nome" required />
            <Field name="slug" label="Referência do endereço" required />
            <label className="block text-xs uppercase tracking-widest text-muted">
              Categoria principal (vazia = principal)
              <select name="parent_id" className={input}>
                <option value="">Sem categoria principal</option>
                {pais.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.name}
                  </option>
                ))}
              </select>
            </label>
            <Field name="position" label="Ordem na montra" type="number" defaultValue={list.length} />
            <label className="block text-xs uppercase tracking-widest text-muted sm:col-span-2">
              Descrição
              <textarea name="description" rows={3} className={input} />
            </label>
            <div className="sm:col-span-2">
              <button className="bg-copper px-4 py-2.5 font-display text-[11px] uppercase tracking-widest text-black transition-colors hover:bg-copper-light">Criar categoria</button>
            </div>
          </form>
        </Card>
        <Card title="Lista" subtitle={`${list.length} ${list.length === 1 ? "categoria" : "categorias"}`}>
          {!list.length ? (
            <EmptyState title="Ainda não há categorias" description="Cria a primeira categoria para organizar os artigos." />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Categoria</TH>
                  <TH>Referência</TH>
                  <TH>Ordem</TH>
                  <TH>Tipo</TH>
                  <TH>Estado</TH>
                  <TH align="right">Ações</TH>
                </tr>
              </THead>
              <TBody>
                {list.map((category) => (
                  <tr key={category.id} className="group transition-colors hover:bg-surface-mid/40">
                    <TD>
                      <div>
                        <p className="text-foreground">{category.name}</p>
                        {category.description && <p className="mt-1 max-w-md truncate text-xs text-muted">{category.description}</p>}
                      </div>
                    </TD>
                    <TD className="text-muted">/{category.slug}</TD>
                    <TD className="text-muted">{category.position}</TD>
                    <TD className="text-muted">{category.parent_id ? "Subcategoria" : "Principal"}</TD>
                    <TD className={category.is_active ? "text-success" : "text-muted"}>{category.is_active ? "Ativa" : "Inativa"}</TD>
                    <TD align="right">
                      {category.is_active && (
                        <form action={deactivateShopCategory}>
                          <input type="hidden" name="id" value={category.id} />
                          <button className="border border-border px-2.5 py-1 text-[10px] uppercase tracking-widest text-muted opacity-0 transition-all hover:border-copper hover:text-copper group-hover:opacity-100">Desativar</button>
                        </form>
                      )}
                    </TD>
                  </tr>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}

function Field({ name, label, defaultValue, required, type = "text" }: { name: string; label: string; defaultValue?: string | number; required?: boolean; type?: string }) {
  return (
    <label className="block text-xs uppercase tracking-widest text-muted">
      {label}
      <input name={name} type={type} required={required} defaultValue={defaultValue ?? ""} className={input} />
    </label>
  );
}
