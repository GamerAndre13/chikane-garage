import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createShopCoupon, updateShopCoupon, deleteShopCoupon } from "@/app/actions/shop-admin";

export default async function CupoesLojaPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("coupons").select("id,code,description,discount_type,discount_value,min_order_total,uses_count,max_uses,starts_at,ends_at,is_active").order("created_at", { ascending: false });
  const coupons = data ?? [];
  const input = "mt-2 block w-full border border-border bg-background px-3 py-3 text-sm text-foreground";
  return <section><Link href="/admin/loja" className="font-display text-[10px] uppercase tracking-widest text-copper">← Loja</Link><h1 className="mt-3 font-display text-3xl font-bold uppercase">Cupões</h1>
    <form action={createShopCoupon} className="mt-7 grid gap-4 border border-border bg-surface p-5 sm:grid-cols-2 sm:p-7"><h2 className="font-display text-lg uppercase sm:col-span-2">Criar cupão</h2>
      <Field name="code" label="Código" required/><label className="block text-xs uppercase tracking-widest text-muted">Tipo de desconto<select name="discount_type" className={input}><option value="percent">Percentagem</option><option value="fixed">Valor fixo (€)</option><option value="free_shipping">Portes grátis</option></select></label>
      <Field name="discount_value" label="Valor" type="number" required/><Field name="min_order_total" label="Compra mínima (€)" type="number"/><Field name="max_uses" label="Utilizações máximas (vazio = sem limite)" type="number"/><Field name="ends_at" label="Válido até" type="date"/><Field name="description" label="Descrição"/>
      <button className="bg-copper px-5 py-3 font-display text-xs uppercase tracking-widest text-black sm:col-span-2 sm:justify-self-start">Guardar cupão</button></form>
    {!coupons.length ? <p className="mt-8 border border-border bg-surface p-6 text-sm text-muted">Ainda não há cupões.</p> : <div className="mt-8 space-y-5">{coupons.map((coupon) => <article key={coupon.id} className="border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-display text-lg uppercase text-foreground">{coupon.code}</p><p className="mt-1 text-xs text-muted">{coupon.uses_count}{coupon.max_uses ? ` / ${coupon.max_uses}` : " utilizações"}{coupon.is_active ? "" : " · inativo"}</p></div><span className={`border px-3 py-1 font-display text-[10px] uppercase tracking-widest ${coupon.is_active ? "border-copper/50 text-copper" : "border-border text-muted"}`}>{coupon.is_active ? "Ativo" : "Inativo"}</span></div>
      <form action={updateShopCoupon} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input type="hidden" name="id" value={coupon.id}/>
        <Field name="code" label="Código" defaultValue={coupon.code} required/>
        <label className="block text-xs uppercase tracking-widest text-muted">Tipo<select name="discount_type" defaultValue={coupon.discount_type} className={input}><option value="percent">Percentagem</option><option value="fixed">Valor fixo (€)</option><option value="free_shipping">Portes grátis</option></select></label>
        <Field name="discount_value" label="Valor" type="number" defaultValue={coupon.discount_value}/>
        <Field name="min_order_total" label="Compra mínima (€)" type="number" defaultValue={coupon.min_order_total ?? 0}/>
        <Field name="max_uses" label="Usos máximos (vazio = ilimitado)" type="number" defaultValue={coupon.max_uses ?? ""}/>
        <Field name="starts_at" label="Válido desde" type="date" defaultValue={coupon.starts_at ? coupon.starts_at.slice(0, 10) : ""}/>
        <Field name="ends_at" label="Válido até" type="date" defaultValue={coupon.ends_at ? coupon.ends_at.slice(0, 10) : ""}/>
        <Field name="description" label="Descrição" defaultValue={coupon.description ?? ""}/>
        <div className="flex flex-wrap items-end gap-4 lg:col-span-4">
          <label className="flex items-center gap-2 pb-3 text-xs text-muted"><input type="checkbox" name="is_active" defaultChecked={coupon.is_active} className="accent-[var(--copper)]"/>Cupão ativo</label>
          <button className="bg-copper px-5 py-3 font-display text-xs uppercase tracking-widest text-black">Guardar alterações</button>
        </div>
      </form>
      <form action={deleteShopCoupon} className="mt-2 flex justify-end"><input type="hidden" name="id" value={coupon.id}/><button className="text-[11px] uppercase tracking-widest text-muted underline underline-offset-4 hover:text-red">Apagar cupão</button></form>
    </article>)}</div>}
  </section>;
}

function Field({ name, label, type = "text", required, defaultValue }: { name: string; label: string; type?: string; required?: boolean; defaultValue?: string | number }) { return <label className="block text-xs uppercase tracking-widest text-muted">{label}<input name={name} type={type} required={required} defaultValue={defaultValue ?? ""} min={type === "number" ? 0 : undefined} step={type === "number" ? "0.01" : undefined} className="mt-2 block w-full border border-border bg-background px-3 py-3 text-sm text-foreground"/></label>; }
