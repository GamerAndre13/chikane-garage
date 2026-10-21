import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { saveShopSettings } from "@/app/actions/shop-admin";

const input = "mt-2 block w-full border border-border bg-background px-3 py-3 text-sm text-foreground";

export default async function DefinicoesLojaPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("shop_settings").select("*").eq("id", 1).maybeSingle();
  const settings = {
    free_shipping_above: Number(data?.free_shipping_above ?? 0),
    stock_hold_minutes: Number(data?.stock_hold_minutes ?? 15),
    low_stock_default: Number(data?.low_stock_default ?? 3),
    returns_days: Number(data?.returns_days ?? 14),
    support_email: String(data?.support_email ?? ""),
  };
  return <section><Link href="/admin/loja" className="font-display text-[10px] uppercase tracking-widest text-copper">← Loja</Link><h1 className="mt-3 font-display text-3xl font-bold uppercase">Definições da loja</h1>
    <p className="mt-2 max-w-2xl text-sm text-muted">Regras gerais de envio, stock e apoio. As alterações passam a valer na loja a seguir.</p>
    <form action={saveShopSettings} className="mt-7 grid gap-4 border border-border bg-surface p-5 sm:grid-cols-2 sm:p-7">
      <Field name="free_shipping_above" label="Portes grátis acima de (€)" type="number" step="0.01" value={settings.free_shipping_above} hint="A partir deste subtotal, os portes ficam 0 automaticamente. 0 = desativado."/>
      <Field name="stock_hold_minutes" label="Reserva de stock (minutos)" type="number" value={settings.stock_hold_minutes} hint="Quanto tempo o stock fica reservado enquanto o cliente paga."/>
      <Field name="low_stock_default" label="Aviso de stock baixo (unidades)" type="number" value={settings.low_stock_default} hint="Valor por omissão para artigos sem aviso próprio."/>
      <Field name="returns_days" label="Prazo de devolução (dias)" type="number" value={settings.returns_days} hint="Prazo anunciado ao cliente para pedir devolução."/>
      <div className="sm:col-span-2"><Field name="support_email" label="Email de apoio" type="email" value={settings.support_email} hint="Vazio = usa o email de contacto do site." /></div>
      <div className="sm:col-span-2"><button className="bg-copper px-5 py-3 font-display text-xs uppercase tracking-widest text-black">Guardar definições</button></div>
    </form>
  </section>;
}

function Field({ name, label, value, hint, type = "text", step }: { name: string; label: string; value?: number | string; hint?: string; type?: string; step?: string }) {
  return <label className="block text-xs uppercase tracking-widest text-muted">{label}<input name={name} type={type} step={step} defaultValue={value ?? ""} className={input}/>{hint && <span className="mt-1 block normal-case tracking-normal text-muted">{hint}</span>}</label>;
}
