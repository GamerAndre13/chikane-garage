import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createShopCoupon } from "@/app/actions/shop-admin";

export default async function CupoesLojaPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("coupons").select("id,code,description,discount_type,discount_value,uses_count,max_uses,ends_at,is_active").order("created_at", { ascending: false });
  const coupons = data ?? [];
  return <section><Link href="/admin/loja" className="font-display text-[10px] uppercase tracking-widest text-copper">← Loja</Link><h1 className="mt-3 font-display text-3xl font-bold uppercase">Cupões</h1>
    <form action={createShopCoupon} className="mt-7 grid gap-4 border border-border bg-surface p-5 sm:grid-cols-2 sm:p-7"><h2 className="font-display text-lg uppercase sm:col-span-2">Criar cupão</h2>
      <Field name="code" label="Código" required/><label className="block text-xs uppercase tracking-widest text-muted">Tipo de desconto<select name="discount_type" className="mt-2 block w-full border border-border bg-background px-3 py-3 text-sm text-foreground"><option value="percent">Percentagem</option><option value="fixed">Valor fixo (€)</option><option value="free_shipping">Portes grátis</option></select></label>
      <Field name="discount_value" label="Valor" type="number" required/><Field name="min_order_total" label="Compra mínima (€)" type="number"/><Field name="max_uses" label="Utilizações máximas (vazio = sem limite)" type="number"/><Field name="ends_at" label="Válido até" type="date"/><Field name="description" label="Descrição"/>
      <button className="bg-copper px-5 py-3 font-display text-xs uppercase tracking-widest text-black sm:col-span-2 sm:justify-self-start">Guardar cupão</button></form>
    <div className="mt-8 divide-y divide-border border-y border-border">{coupons.map((coupon) => <article key={coupon.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div><p className="font-display text-lg uppercase text-foreground">{coupon.code}</p><p className="mt-1 text-xs text-muted">{coupon.description || "Sem descrição"} · {coupon.discount_type === "percent" ? `${coupon.discount_value}%` : coupon.discount_type === "fixed" ? `${coupon.discount_value} €` : "Portes grátis"}</p></div><p className="text-xs text-muted">{coupon.uses_count}{coupon.max_uses ? ` / ${coupon.max_uses}` : " utilizações"} · {coupon.is_active ? "Ativo" : "Inativo"}{coupon.ends_at ? ` · até ${new Date(coupon.ends_at).toLocaleDateString("pt-PT")}` : ""}</p></article>)}</div>
  </section>;
}

function Field({ name, label, type = "text", required }: { name: string; label: string; type?: string; required?: boolean }) { return <label className="block text-xs uppercase tracking-widest text-muted">{label}<input name={name} type={type} required={required} min={type === "number" ? 0 : undefined} step={type === "number" ? "0.01" : undefined} className="mt-2 block w-full border border-border bg-background px-3 py-3 text-sm text-foreground"/></label>; }
