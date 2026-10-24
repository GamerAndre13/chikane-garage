import { createClient } from "@/lib/supabase/server";
import { saveShopSettings } from "@/app/actions/shop-admin";
import { AvisoErro } from "@/app/admin/loja/aviso";
import { PageHeader, Card } from "@/app/admin/loja/_ui";

const input = "mt-2 block w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground";

export default async function DefinicoesLojaPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("shop_settings").select("*").eq("id", 1).maybeSingle();
  const settings = {
    free_shipping_above: Number(data?.free_shipping_above ?? 0),
    stock_hold_minutes: Number(data?.stock_hold_minutes ?? 15),
    low_stock_default: Number(data?.low_stock_default ?? 3),
    returns_days: Number(data?.returns_days ?? 14),
    support_email: String(data?.support_email ?? ""),
  };
  return (
    <div>
      <PageHeader
        title="Definições da loja"
        subtitle="Regras gerais de envio, stock, devoluções e apoio."
        backHref="/admin/loja"
        breadcrumbs={[{ label: "Loja", href: "/admin/loja" }]}
      />
      <AvisoErro erro={erro} />
      <Card title="Parâmetros" subtitle="As alterações passam a valer na loja.">
        <form action={saveShopSettings} className="grid gap-4 sm:grid-cols-2">
          <Field name="free_shipping_above" label="Portes grátis acima de (€)" type="number" step="0.01" value={settings.free_shipping_above} hint="A partir deste subtotal, os portes ficam 0 automaticamente. 0 = desativado." />
          <Field name="stock_hold_minutes" label="Reserva de stock (minutos)" type="number" value={settings.stock_hold_minutes} hint="Quanto tempo o stock fica reservado enquanto o cliente paga." />
          <Field name="low_stock_default" label="Aviso de stock baixo (unidades)" type="number" value={settings.low_stock_default} hint="Valor por omissão para artigos sem aviso próprio." />
          <Field name="returns_days" label="Prazo de devolução (dias)" type="number" value={settings.returns_days} hint="Prazo anunciado ao cliente para pedir devolução." />
          <div className="sm:col-span-2"><Field name="support_email" label="Email de apoio" type="email" value={settings.support_email} hint="Vazio = usa o email de contacto do site." /></div>
          <div className="sm:col-span-2"><button className="bg-copper px-4 py-2.5 font-display text-[11px] uppercase tracking-widest text-black transition-colors hover:bg-copper-light">Guardar definições</button></div>
        </form>
      </Card>
    </div>
  );
}

function Field({ name, label, value, hint, type = "text", step }: { name: string; label: string; value?: number | string; hint?: string; type?: string; step?: string }) {
  return <label className="block text-xs uppercase tracking-widest text-muted">{label}<input name={name} type={type} step={step} defaultValue={value ?? ""} className={input}/>{hint && <span className="mt-1 block normal-case tracking-normal text-muted">{hint}</span>}</label>;
}
