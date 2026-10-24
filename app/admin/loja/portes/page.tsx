import { createClient } from "@/lib/supabase/server";
import { createShippingZone, updateShippingZone, createShippingRate, updateShippingRate, deleteShippingRate } from "@/app/actions/shop-admin";
import { AvisoErro } from "@/app/admin/loja/aviso";
import { PageHeader, Card, EmptyState } from "@/app/admin/loja/_ui";

type Rate = { id: string; name: string; weight_from_grams: number; weight_to_grams: number | null; price: number; delivery_days_min: number; delivery_days_max: number; is_active: boolean; position: number };
type Zone = { id: string; name: string; country_codes: string; postal_code_from: string; postal_code_to: string; position: number; is_active: boolean; shipping_rates: Rate[] };

const euro = (value: number) => Number(value).toLocaleString("pt-PT", { style: "currency", currency: "EUR" });

export default async function PortesLojaPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("shipping_zones").select("id,name,country_codes,postal_code_from,postal_code_to,position,is_active,shipping_rates(id,name,weight_from_grams,weight_to_grams,price,delivery_days_min,delivery_days_max,is_active,position)").order("position");
  const zones = ((data ?? []) as unknown as Zone[]).map((zone) => ({ ...zone, shipping_rates: [...(zone.shipping_rates ?? [])].sort((a, b) => a.position - b.position) }));

  return (
    <div>
      <PageHeader
        title="Portes e zonas"
        subtitle="Zonas de envio por país/código postal e escalões por peso."
        backHref="/admin/loja"
        breadcrumbs={[{ label: "Loja", href: "/admin/loja" }]}
      />
      <AvisoErro erro={erro} />
      <div className="space-y-5">
        <Card title="Criar zona" subtitle="Agrupar países para aplicar regras de envio.">
          <form action={createShippingZone} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 sm:items-end">
            <Field name="name" label="Nome da zona" required />
            <Field name="country_codes" label="Países (ISO, ex.: PT,ES)" required />
            <Field name="postal_code_from" label="CP desde (opcional)" />
            <Field name="postal_code_to" label="CP até (opcional)" />
            <Field name="position" label="Ordem" type="number" defaultValue={zones.length} />
            <div className="sm:col-span-2 lg:col-span-5">
              <button className="bg-copper px-4 py-2.5 font-display text-[11px] uppercase tracking-widest text-black transition-colors hover:bg-copper-light">Criar zona</button>
            </div>
          </form>
        </Card>
        {!zones.length ? (
          <Card>
            <EmptyState title="Ainda não há zonas de envio" description="Cria a primeira zona para configurar portes." />
          </Card>
        ) : (
          <div className="space-y-5">
            {zones.map((zone) => (
              <Card key={zone.id} title={zone.name} subtitle={`${zone.country_codes}${zone.postal_code_from || zone.postal_code_to ? ` · CP ${zone.postal_code_from || "…"}–${zone.postal_code_to || "…"}` : ""}`}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <span className={`border px-2.5 py-1 font-display text-[10px] uppercase tracking-widest ${zone.is_active ? "border-copper/50 text-copper" : "border-border text-muted"}`}>{zone.is_active ? "Ativa" : "Inativa"}</span>
                </div>
                <form action={updateShippingZone} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 sm:items-end">
                  <input type="hidden" name="id" value={zone.id} />
                  <Field name="name" label="Nome" defaultValue={zone.name} required />
                  <Field name="country_codes" label="Países (ISO)" defaultValue={zone.country_codes} required />
                  <Field name="postal_code_from" label="CP desde" defaultValue={zone.postal_code_from} />
                  <Field name="postal_code_to" label="CP até" defaultValue={zone.postal_code_to} />
                  <Field name="position" label="Ordem" type="number" defaultValue={zone.position} />
                  <div className="flex flex-col gap-2 lg:pb-0.5">
                    <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" name="is_active" defaultChecked={zone.is_active} className="accent-[var(--copper)]" />Ativa</label>
                    <button className="border border-border px-3 py-2 font-display text-[10px] uppercase tracking-widest text-muted transition-colors hover:border-copper hover:text-copper">Guardar zona</button>
                  </div>
                </form>
                <div className="mt-5 border-t border-border pt-4">
                  <h3 className="font-display text-xs uppercase tracking-widest text-muted">Escalões desta zona</h3>
                  {!zone.shipping_rates.length ? <p className="mt-3 text-sm text-muted">Sem escalões definidos.</p> : (
                    <div className="mt-3 space-y-3">
                      {zone.shipping_rates.map((rate) => (
                        <div key={rate.id} className="border border-border p-3">
                          <form action={updateShippingRate} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 sm:items-end">
                            <input type="hidden" name="id" value={rate.id} />
                            <Field name="name" label="Nome" defaultValue={rate.name} />
                            <Field name="weight_from_grams" label="Peso desde (g)" type="number" defaultValue={rate.weight_from_grams} />
                            <Field name="weight_to_grams" label="Peso até (g)" type="number" defaultValue={rate.weight_to_grams ?? ""} />
                            <Field name="price" label="Preço (€)" type="number" defaultValue={rate.price} required />
                            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2"><Field name="delivery_days_min" label="Prazo mín. (dias)" type="number" defaultValue={rate.delivery_days_min} /><Field name="delivery_days_max" label="Prazo máx. (dias)" type="number" defaultValue={rate.delivery_days_max} /></div>
                            <div className="flex flex-wrap items-center gap-4 lg:col-span-6">
                              <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" name="is_active" defaultChecked={rate.is_active} className="accent-[var(--copper)]" />Ativo</label>
                              <button className="border border-border px-3 py-2 font-display text-[10px] uppercase tracking-widest text-muted transition-colors hover:border-copper hover:text-copper">Guardar escalão</button>
                              <span className="text-xs text-muted">Atual: {euro(Number(rate.price))}</span>
                            </div>
                          </form>
                          <form action={deleteShippingRate} className="mt-1 flex justify-end"><input type="hidden" name="id" value={rate.id} /><button className="text-[11px] uppercase tracking-widest text-muted underline underline-offset-4 transition-colors hover:text-red">Apagar escalão</button></form>
                        </div>
                      ))}
                    </div>
                  )}
                  <form action={createShippingRate} className="mt-4 grid gap-3 border border-dashed border-border p-3 sm:grid-cols-2 lg:grid-cols-6 sm:items-end">
                    <input type="hidden" name="zone_id" value={zone.id} />
                    <Field name="name" label="Nome do escalão" />
                    <Field name="weight_from_grams" label="Peso desde (g)" type="number" />
                    <Field name="weight_to_grams" label="Peso até (g)" type="number" />
                    <Field name="price" label="Preço (€)" type="number" required />
                    <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2"><Field name="delivery_days_min" label="Prazo mín. (dias)" type="number" defaultValue={2} /><Field name="delivery_days_max" label="Prazo máx. (dias)" type="number" defaultValue={5} /></div>
                    <button className="border border-border px-3 py-2 font-display text-[10px] uppercase tracking-widest text-muted transition-colors hover:border-copper hover:text-copper sm:col-span-2 lg:col-span-6 sm:justify-self-start">Adicionar escalão</button>
                  </form>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ name, label, type = "text", required, defaultValue }: { name: string; label: string; type?: string; required?: boolean; defaultValue?: string | number }) {
  const input = "mt-2 block w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground";
  return (
    <label className="block text-xs uppercase tracking-widest text-muted">
      {label}
      <input name={name} type={type} required={required} defaultValue={defaultValue ?? ""} min={type === "number" ? 0 : undefined} step={type === "number" ? "0.01" : undefined} className={input} />
    </label>
  );
}
