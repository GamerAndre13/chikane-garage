import { createClient } from "@/lib/supabase/server";
import { createShopCoupon, updateShopCoupon, deleteShopCoupon } from "@/app/actions/shop-admin";
import { AvisoErro } from "@/app/admin/loja/aviso";
import { PageHeader, Card, EmptyState } from "@/app/admin/loja/_ui";

export default async function CupoesLojaPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("coupons").select("id,code,description,discount_type,discount_value,min_order_total,uses_count,max_uses,starts_at,ends_at,is_active").order("created_at", { ascending: false });
  const coupons = data ?? [];
  const input = "mt-2 block w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground";

  return (
    <div>
      <PageHeader
        title="Cupões"
        subtitle="Descontos e portes grátis para a loja."
        backHref="/admin/loja"
        breadcrumbs={[{ label: "Loja", href: "/admin/loja" }]}
      />
      <AvisoErro erro={erro} />
      <div className="space-y-5">
        <Card title="Criar cupão" subtitle="Configurar novo código promocional.">
          <form action={createShopCoupon} className="grid gap-4 sm:grid-cols-2">
            <Field name="code" label="Código" required />
            <label className="block text-xs uppercase tracking-widest text-muted">
              Tipo de desconto
              <select name="discount_type" className={input}>
                <option value="percent">Percentagem</option>
                <option value="fixed">Valor fixo (€)</option>
                <option value="free_shipping">Portes grátis</option>
              </select>
            </label>
            <Field name="discount_value" label="Valor" type="number" required />
            <Field name="min_order_total" label="Compra mínima (€)" type="number" />
            <Field name="max_uses" label="Utilizações máximas (vazio = sem limite)" type="number" />
            <Field name="ends_at" label="Válido até" type="date" />
            <Field name="description" label="Descrição" className="sm:col-span-2" />
            <div className="sm:col-span-2">
              <button className="bg-copper px-4 py-2.5 font-display text-[11px] uppercase tracking-widest text-black transition-colors hover:bg-copper-light">Guardar cupão</button>
            </div>
          </form>
        </Card>
        <Card title="Lista" subtitle={`${coupons.length} ${coupons.length === 1 ? "cupão" : "cupões"}`}>
          {!coupons.length ? (
            <EmptyState title="Ainda não há cupões" description="Cria o primeiro código promocional." />
          ) : (
            <div className="space-y-4">
              {coupons.map((coupon) => (
                <article key={coupon.id} className="border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-display text-base uppercase text-foreground">{coupon.code}</p>
                      <p className="mt-1 text-xs text-muted">{coupon.uses_count}{coupon.max_uses ? ` / ${coupon.max_uses}` : " utilizações"}{coupon.is_active ? "" : " · inativo"}</p>
                    </div>
                    <span className={`border px-2.5 py-1 font-display text-[10px] uppercase tracking-widest ${coupon.is_active ? "border-copper/50 text-copper" : "border-border text-muted"}`}>{coupon.is_active ? "Ativo" : "Inativo"}</span>
                  </div>
                  <form action={updateShopCoupon} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <input type="hidden" name="id" value={coupon.id} />
                    <Field name="code" label="Código" defaultValue={coupon.code} required />
                    <label className="block text-xs uppercase tracking-widest text-muted">
                      Tipo
                      <select name="discount_type" defaultValue={coupon.discount_type} className={input}>
                        <option value="percent">Percentagem</option>
                        <option value="fixed">Valor fixo (€)</option>
                        <option value="free_shipping">Portes grátis</option>
                      </select>
                    </label>
                    <Field name="discount_value" label="Valor" type="number" defaultValue={coupon.discount_value} />
                    <Field name="min_order_total" label="Compra mínima (€)" type="number" defaultValue={coupon.min_order_total ?? 0} />
                    <Field name="max_uses" label="Usos máximos (vazio = ilimitado)" type="number" defaultValue={coupon.max_uses ?? ""} />
                    <Field name="starts_at" label="Válido desde" type="date" defaultValue={coupon.starts_at ? coupon.starts_at.slice(0, 10) : ""} />
                    <Field name="ends_at" label="Válido até" type="date" defaultValue={coupon.ends_at ? coupon.ends_at.slice(0, 10) : ""} />
                    <Field name="description" label="Descrição" defaultValue={coupon.description ?? ""} />
                    <div className="flex flex-wrap items-end gap-4 lg:col-span-4">
                      <label className="flex items-center gap-2 pb-2 text-xs text-muted"><input type="checkbox" name="is_active" defaultChecked={coupon.is_active} className="accent-[var(--copper)]" />Cupão ativo</label>
                      <button className="border border-copper px-4 py-2 font-display text-[10px] uppercase tracking-widest text-copper transition-colors hover:bg-copper hover:text-black">Guardar alterações</button>
                    </div>
                  </form>
                  <form action={deleteShopCoupon} className="mt-2 flex justify-end"><input type="hidden" name="id" value={coupon.id} /><button className="text-[11px] uppercase tracking-widest text-muted underline underline-offset-4 transition-colors hover:text-red">Apagar cupão</button></form>
                </article>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Field({ name, label, type = "text", required, defaultValue, className }: { name: string; label: string; type?: string; required?: boolean; defaultValue?: string | number; className?: string }) {
  const input = "mt-2 block w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground";
  return (
    <label className={`block text-xs uppercase tracking-widest text-muted ${className ?? ""}`}>
      {label}
      <input name={name} type={type} required={required} defaultValue={defaultValue ?? ""} min={type === "number" ? 0 : undefined} step={type === "number" ? "0.01" : undefined} className={input} />
    </label>
  );
}
