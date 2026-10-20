import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createShopCategory, deactivateShopCategory } from "@/app/actions/shop-admin";

export default async function CategoriasLojaPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase.from("product_categories").select("id,name,slug,description,position,is_active,parent_id").order("position");
  return <section><Link href="/admin/loja" className="font-display text-[10px] uppercase tracking-widest text-copper">← Loja</Link><h1 className="mt-3 font-display text-3xl font-bold uppercase">Categorias</h1>
    <form action={createShopCategory} className="mt-7 grid gap-4 border border-border bg-surface p-5 sm:grid-cols-2 sm:p-7"><h2 className="font-display text-lg uppercase sm:col-span-2">Adicionar categoria</h2><Field name="name" label="Nome" required/><Field name="slug" label="Referência do endereço" required/><Field name="position" label="Ordem na montra" type="number" defaultValue={0}/><Field name="description" label="Descrição"/><button className="bg-copper px-5 py-3 font-display text-xs uppercase tracking-widest text-black sm:col-span-2 sm:justify-self-start">Criar categoria</button></form>
    <div className="mt-8 divide-y divide-border border-y border-border">{(categories ?? []).map((category) => <div key={category.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div><p className="font-display uppercase text-foreground">{category.name}</p><p className="mt-1 text-xs text-muted">/{category.slug} · posição {category.position} · {category.is_active ? "ativa" : "inativa"}</p></div>{category.is_active && <form action={deactivateShopCategory}><input type="hidden" name="id" value={category.id}/><button className="text-xs text-muted underline hover:text-red">Desativar</button></form>}</div>)}</div>
  </section>;
}

function Field({ name, label, required, type = "text", defaultValue }: { name: string; label: string; required?: boolean; type?: string; defaultValue?: string | number }) { return <label className="block text-xs uppercase tracking-widest text-muted">{label}<input name={name} type={type} required={required} defaultValue={defaultValue} className="mt-2 block w-full border border-border bg-background px-3 py-3 text-sm text-foreground"/></label>; }
