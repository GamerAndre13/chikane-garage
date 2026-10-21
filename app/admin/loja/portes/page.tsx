import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createShippingZone, updateShippingZone, createShippingRate, updateShippingRate, deleteShippingRate } from "@/app/actions/shop-admin";

const input = "mt-2 block w-full border border-border bg-background px-3 py-3 text-sm text-foreground";

type Rate = { id: string; name: string; weight_from_grams: number; weight_to_grams: number | null; price: number; delivery_days_min: number; delivery_days_max: number; is_active: boolean; position: number };
type Zone = { id: string; name: string; country_codes: string; postal_code_from: string; postal_code_to: string; position: number; is_active: boolean; shipping_rates: Rate[] };

const euro = (value: number) => Number(value).toLocaleString("pt-PT", { style: "currency", currency: "EUR" });

export default async function PortesLojaPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("shipping_zones").select("id,name,country_codes,postal_code_from,postal_code_to,position,is_active,shipping_rates(id,name,weight_from_grams,weight_to_grams,price,delivery_days_min,delivery_days_max,is_active,position)").order("position");
  const zones = ((data ?? []) as unknown as Zone[]).map((zone) => ({ ...zone, shipping_rates: [...(zone.shipping_rates ?? [])].sort((a, b) => a.position - b.position) }));
  return <section><Link href="/admin/loja" className="font-display text-[10px] uppercase tracking-widest text-copper">← Loja</Link><h1 className="mt-3 font-display text-3xl font-bold uppercase">Portes e zonas</h1>
    <p className="mt-2 max-w-2xl text-sm text-muted">Cada zona agrupa países (e opcionalmente um intervalo de códigos postais); dentro da zona defines escalões por peso. Desmarcar «Ativa» esconde a zona do checkout sem apagar escalões.</p>

    <form action={createShippingZone} className="mt-7 grid gap-4 border border-border bg-surface p-5 sm:grid-cols-2 lg:grid-cols-5 sm:items-end sm:p-7"><h2 className="font-display text-lg uppercase sm:col-span-2 lg:col-span-5">Criar zona</h2>
      <Field name="name" label="Nome da zona" required/>
      <Field name="country_codes" label="Países (ISO, ex.: PT,ES)" required/>
      <Field name="postal_code_from" label="CP desde (opcional)"/>
      <Field name="postal_code_to" label="CP até (opcional)"/>
      <Field name="position" label="Ordem" type="number"/>
      <button className="bg-copper px-5 py-3 font-display text-xs uppercase tracking-widest text-black sm:col-span-2 lg:col-span-5 sm:justify-self-start">Criar zona</button></form>

    {!zones.length ? <p className="mt-8 border border-border bg-surface p-6 text-sm text-muted">Ainda não há zonas de envio — cria a primeira acima.</p> :
      <div className="mt-8 space-y-6">{zones.map((zone) => <article key={zone.id} className="border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-display text-lg uppercase text-foreground">{zone.name}</p><p className="mt-1 text-xs text-muted">{zone.country_codes}{zone.postal_code_from || zone.postal_code_to ? ` · CP ${zone.postal_code_from || "…"}–${zone.postal_code_to || "…"}` : ""}{zone.is_active ? "" : " · inativa"}</p></div><span className={`border px-3 py-1 font-display text-[10px] uppercase tracking-widest ${zone.is_active ? "border-copper/50 text-copper" : "border-border text-muted"}`}>{zone.is_active ? "Ativa" : "Inativa"}</span></div>

        <form action={updateShippingZone} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6 sm:items-end">
          <input type="hidden" name="id" value={zone.id}/>
          <Field name="name" label="Nome" defaultValue={zone.name} required/>
          <Field name="country_codes" label="Países (ISO)" defaultValue={zone.country_codes} required/>
          <Field name="postal_code_from" label="CP desde" defaultValue={zone.postal_code_from}/>
          <Field name="postal_code_to" label="CP até" defaultValue={zone.postal_code_to}/>
          <Field name="position" label="Ordem" type="number" defaultValue={zone.position}/>
          <div className="flex flex-col gap-2 lg:pb-1"><label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" name="is_active" defaultChecked={zone.is_active} className="accent-[var(--copper)]"/>Ativa</label><button className="bg-copper px-4 py-2 font-display text-[10px] uppercase tracking-widest text-black">Guardar zona</button></div>
        </form>

        <div className="mt-5 border-t border-border pt-4"><h3 className="font-display text-xs uppercase tracking-widest text-muted">Escalões desta zona</h3>
          {!zone.shipping_rates.length ? <p className="mt-3 text-sm text-muted">Sem escalões — calcula os portes por peso.</p> :
            <ul className="mt-3 divide-y divide-border">{zone.shipping_rates.map((rate) => <li key={rate.id} className="py-4">
              <form action={updateShippingRate} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 sm:items-end">
                <input type="hidden" name="id" value={rate.id}/>
                <Field name="name" label="Nome" defaultValue={rate.name}/>
                <Field name="weight_from_grams" label="Peso desde (g)" type="number" defaultValue={rate.weight_from_grams}/>
                <Field name="weight_to_grams" label="Peso até (g)" type="number" defaultValue={rate.weight_to_grams ?? ""}/>
                <Field name="price" label="Preço (€)" type="number" defaultValue={rate.price} required/>
                <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2"><Field name="delivery_days_min" label="Prazo mín. (dias)" type="number" defaultValue={rate.delivery_days_min}/><Field name="delivery_days_max" label="Prazo máx. (dias)" type="number" defaultValue={rate.delivery_days_max}/></div>
                <div className="flex flex-wrap items-center gap-4 lg:col-span-6"><label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" name="is_active" defaultChecked={rate.is_active} className="accent-[var(--copper)]"/>Ativo</label><button className="bg-copper px-4 py-2 font-display text-[10px] uppercase tracking-widest text-black">Guardar escalão</button><span className="text-xs text-muted">Atual: {euro(Number(rate.price))}</span></div>
              </form>
              <form action={deleteShippingRate} className="mt-1 flex justify-end"><input type="hidden" name="id" value={rate.id}/><button className="text-[11px] uppercase tracking-widest text-muted underline underline-offset-4 hover:text-red">Apagar escalão</button></form>
            </li>)}</ul>}

          <form action={createShippingRate} className="mt-4 grid gap-3 border border-dashed border-border p-4 sm:grid-cols-2 lg:grid-cols-6 sm:items-end">
            <input type="hidden" name="zone_id" value={zone.id}/>
            <Field name="name" label="Nome do escalão"/>
            <Field name="weight_from_grams" label="Peso desde (g)" type="number"/>
            <Field name="weight_to_grams" label="Peso até (g)" type="number"/>
            <Field name="price" label="Preço (€)" type="number" required/>
            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2"><Field name="delivery_days_min" label="Prazo mín. (dias)" type="number" defaultValue={2}/><Field name="delivery_days_max" label="Prazo máx. (dias)" type="number" defaultValue={5}/></div>
            <button className="border border-border px-4 py-3 font-display text-[10px] uppercase tracking-widest text-muted hover:border-copper hover:text-copper sm:col-span-2 lg:col-span-6 sm:justify-self-start">Adicionar escalão a {zone.name}</button>
          </form>
        </div>
      </article>)}</div>}
  </section>;
}

function Field({ name, label, type = "text", required, defaultValue }: { name: string; label: string; type?: string; required?: boolean; defaultValue?: string | number }) { return <label className="block text-xs uppercase tracking-widest text-muted">{label}<input name={name} type={type} required={required} defaultValue={defaultValue ?? ""} min={type === "number" ? 0 : undefined} step={type === "number" ? "0.01" : undefined} className={input}/></label>; }
