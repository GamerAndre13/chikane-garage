import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createShopBrand, updateShopBrand, deleteShopBrand } from "@/app/actions/shop-admin";

const input = "mt-2 block w-full border border-border bg-background px-3 py-3 text-sm text-foreground";

export default async function MarcasLojaPage() {
  const supabase = await createClient();
  const [{ data: brands }, { data: products }] = await Promise.all([
    supabase.from("brands").select("id,name,slug,position,is_active").order("position").order("name"),
    supabase.from("products").select("brand_id"),
  ]);
  const counts = new Map<string, number>();
  for (const product of products ?? []) if (product.brand_id) counts.set(product.brand_id, (counts.get(product.brand_id) ?? 0) + 1);
  const list = brands ?? [];
  return <section><Link href="/admin/loja" className="font-display text-[10px] uppercase tracking-widest text-copper">← Loja</Link><h1 className="mt-3 font-display text-3xl font-bold uppercase">Marcas</h1>
    <p className="mt-2 max-w-2xl text-sm text-muted">Marcas de artigos da loja (BMW, Michelin…). A marca também alimenta os acessórios recomendados na ficha das viaturas.</p>
    <form action={createShopBrand} className="mt-7 grid gap-4 border border-border bg-surface p-5 sm:grid-cols-[1fr_1fr_140px_auto] sm:items-end sm:p-7">
      <Field name="name" label="Nome" required/>
      <Field name="slug" label="Referência (vazio = pelo nome)"/>
      <Field name="position" label="Ordem" type="number" defaultValue={list.length}/>
      <button className="mb-1 bg-copper px-5 py-3 font-display text-xs uppercase tracking-widest text-black">Criar marca</button>
    </form>
    {!list.length ? <p className="mt-7 border border-border bg-surface p-6 text-sm text-muted">Ainda não há marcas — cria a primeira acima.</p> :
      <ul className="mt-7 space-y-4">{list.map((brand) => <li key={brand.id} className="border border-border bg-surface p-4 sm:p-5">
        <form action={updateShopBrand} className="grid gap-3 sm:grid-cols-[1.2fr_1fr_110px_auto] sm:items-end">
          <input type="hidden" name="id" value={brand.id}/>
          <Field name="name" label="Nome" defaultValue={brand.name} required/>
          <Field name="slug" label="Referência" defaultValue={brand.slug}/>
          <Field name="position" label="Ordem" type="number" defaultValue={brand.position}/>
          <div className="flex flex-col gap-2 sm:pb-1">
            <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" name="is_active" defaultChecked={brand.is_active} className="accent-[var(--copper)]"/>Visível</label>
            <div className="flex items-center gap-3">
              <button className="bg-copper px-4 py-2 font-display text-[10px] uppercase tracking-widest text-black">Guardar</button>
              <span className="text-[11px] text-muted">{counts.get(brand.id) ?? 0} artigos</span>
            </div>
          </div>
        </form>
        <form action={deleteShopBrand} className="mt-3 flex justify-end"><input type="hidden" name="id" value={brand.id}/><button className="text-[11px] uppercase tracking-widest text-muted underline underline-offset-4 hover:text-red">Apagar marca {brand.is_active ? "" : "(inativa)"}</button></form>
      </li>)}</ul>}
  </section>;
}

function Field({ name, label, defaultValue, required, type = "text" }: { name: string; label: string; defaultValue?: string | number; required?: boolean; type?: string }) {
  return <label className="block text-xs uppercase tracking-widest text-muted">{label}<input name={name} type={type} required={required} defaultValue={defaultValue ?? ""} className={input}/></label>;
}
