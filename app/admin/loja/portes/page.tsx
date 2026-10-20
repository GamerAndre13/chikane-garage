import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createShippingRate } from "@/app/actions/shop-admin";

export default async function PortesLojaPage() {
  const supabase = await createClient();
  const [{ data: zones }, { data: rates }] = await Promise.all([
    supabase.from("shipping_zones").select("id,name,country_codes,is_active").order("position"),
    supabase.from("shipping_rates").select("id,name,weight_from_grams,weight_to_grams,price,delivery_days_min,delivery_days_max,is_active,shipping_zones(name)").order("position"),
  ]);
  const zoneList = (zones ?? []) as { id: string; name: string; country_codes: string; is_active: boolean }[];
  const rateList = (rates ?? []) as unknown as { id: string; name: string; weight_from_grams: number; weight_to_grams: number | null; price: number; delivery_days_min: number; delivery_days_max: number; is_active: boolean; shipping_zones: { name: string } }[];
  return <section><Link href="/admin/loja" className="font-display text-[10px] uppercase tracking-widest text-copper">← Loja</Link><h1 className="mt-3 font-display text-3xl font-bold uppercase">Portes e zonas</h1>
    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">Revê cuidadosamente os destinos, escalões e preços antes de publicar artigos. As zonas são configuradas no esquema da loja; aqui podes acrescentar escalões de peso a cada zona.</p>
    <form action={createShippingRate} className="mt-7 grid gap-4 border border-border bg-surface p-5 sm:grid-cols-2 lg:grid-cols-3 sm:p-7"><h2 className="font-display text-lg uppercase sm:col-span-2 lg:col-span-3">Adicionar escalão</h2>
      <label className="block text-xs uppercase tracking-widest text-muted">Zona<select name="zone_id" required className="mt-2 block w-full border border-border bg-background px-3 py-3 text-sm text-foreground"><option value="">Escolher zona</option>{zoneList.filter((z) => z.is_active).map((zone) => <option key={zone.id} value={zone.id}>{zone.name} · {zone.country_codes}</option>)}</select></label>
      <Field name="name" label="Nome do escalão"/><Field name="weight_from_grams" label="Peso desde (g)" type="number"/><Field name="weight_to_grams" label="Peso até (g; vazio = sem limite)" type="number"/><Field name="price" label="Preço (€)" type="number" required/><Field name="delivery_days_min" label="Prazo mínimo (dias úteis)" type="number"/><Field name="delivery_days_max" label="Prazo máximo (dias úteis)" type="number"/>
      <button className="bg-copper px-5 py-3 font-display text-xs uppercase tracking-widest text-black sm:col-span-2 lg:col-span-3 sm:justify-self-start">Guardar escalão</button></form>
    <div className="mt-8 divide-y divide-border border-y border-border">{rateList.map((rate) => <article key={rate.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div><p className="font-display uppercase text-foreground">{rate.shipping_zones?.name ?? "Zona"} · {rate.name}</p><p className="mt-1 text-xs text-muted">{rate.weight_from_grams} g – {rate.weight_to_grams ?? "sem limite"} g · {rate.delivery_days_min}–{rate.delivery_days_max} dias úteis</p></div><p className="font-display text-lg text-copper">{Number(rate.price).toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}{!rate.is_active && <span className="ml-2 text-[10px] text-muted">Inativo</span>}</p></article>)}</div>
  </section>;
}

function Field({ name, label, type = "text", required }: { name: string; label: string; type?: string; required?: boolean }) { return <label className="block text-xs uppercase tracking-widest text-muted">{label}<input name={name} type={type} required={required} min={type === "number" ? 0 : undefined} step={type === "number" ? "0.01" : undefined} className="mt-2 block w-full border border-border bg-background px-3 py-3 text-sm text-foreground"/></label>; }
