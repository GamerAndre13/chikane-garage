import Link from "next/link";
import { saveShopProduct } from "@/app/actions/shop-admin";

type FormData = { id?: string; name?: string; slug?: string; category_id?: string; brand_id?: string; price?: number; compare_at_price?: number | null; short_description?: string; description?: string; sku?: string; weight_grams?: number; stock_mode?: string; status?: string; kind?: string; vat_rate?: number; is_featured?: boolean; is_new?: boolean; product_compatibility?: { brand: string; model: string; year_from?: number | null; year_to?: number | null; notes?: string | null }[]; product_variants?: { name: string; sku?: string | null; stock_quantity?: number | null; price_delta?: number | null }[] };
const input = "mt-2 block w-full border border-border bg-background px-3 py-3 text-sm text-foreground";
const card = "border border-border bg-surface p-5 sm:p-6";
const cardTitle = "font-display text-sm uppercase tracking-widest";

// Ficha de artigo no formato Shopify: coluna principal (informação,
// compatibilidade, variantes) e rail direito com cartões de publicação,
// preço, stock e fotografia. O <form> usa display:contents para os cartões
// participarem na grelha da página — as «Fotografias» ficam fora do form
// (têm formulários próprios) e a página coloca-as na coluna principal.
export function ProductForm({ categories, brands, initial = {} }: { categories: { id: string; name: string }[]; brands: { id: string; name: string }[]; initial?: FormData }) {
  return <form action={saveShopProduct} className="contents">
    {initial.id && <input type="hidden" name="id" value={initial.id}/>}
    <section className={`${card} lg:col-start-1`}><h2 className="font-display text-lg uppercase">Informação do artigo</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">
      <Field name="name" label="Nome" defaultValue={initial.name} required/><Field name="slug" label="Referência do endereço" defaultValue={initial.slug} required/>
      <label className="block text-xs uppercase tracking-widest text-muted">Categoria<select name="category_id" required defaultValue={initial.category_id ?? ""} className={input}><option value="" disabled>Escolher categoria</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="block text-xs uppercase tracking-widest text-muted">Marca<select name="brand_id" defaultValue={initial.brand_id ?? ""} className={input}><option value="">Sem marca</option>{brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <Field name="sku" label="Referência interna" defaultValue={initial.sku}/><Field name="weight_grams" label="Peso (gramas)" type="number" defaultValue={initial.weight_grams ?? 0}/>
      <label className="block text-xs uppercase tracking-widest text-muted sm:col-span-2">Resumo<textarea name="short_description" defaultValue={initial.short_description ?? ""} rows={2} className={input}/></label>
      <label className="block text-xs uppercase tracking-widest text-muted sm:col-span-2">Descrição completa<textarea name="description" defaultValue={initial.description ?? ""} rows={7} className={input}/></label>
    </div></section>
    <section className={`${card} lg:col-start-1`}><h2 className="font-display text-lg uppercase">Compatibilidade com viaturas</h2><p className="mt-2 text-xs leading-relaxed text-muted">Uma viatura por linha: Marca; modelo; ano inicial; ano final; notas. Exemplo: BMW; M3 Touring; 2025; 2026; Confirmar geração antes da montagem.</p><textarea name="compatibility" defaultValue={(initial.product_compatibility ?? []).map((item) => [item.brand, item.model, item.year_from ?? "", item.year_to ?? "", item.notes ?? ""].join("; ")).join("\n")} rows={5} className={`${input} font-mono text-xs`} placeholder="BMW; M3 Touring; 2025; 2026; Confirmar versão"/></section>
    <section className={`${card} lg:col-start-1`}><h2 className="font-display text-lg uppercase">Variantes e stock</h2><p className="mt-2 text-xs leading-relaxed text-muted">Uma variante por linha no formato: Nome; referência; stock; ajuste de preço. Exemplo: Preto / M; CG-TS-M; 5; 0. Ao guardar, esta lista substitui as variantes atuais (as encomendas antigas mantêm o nome e o valor).</p><textarea name="variants" defaultValue={initial.id && initial.product_variants?.length ? initial.product_variants.map((item) => [item.name, item.sku ?? "", item.stock_quantity ?? 0, item.price_delta ?? 0].join("; ")).join("\n") : "Único;;;0"} rows={4} className={`${input} font-mono text-xs`}/></section>

    <aside className="space-y-5 self-start lg:col-start-2 lg:row-start-1 lg:row-span-4">
      <div className={card}><h2 className={cardTitle}>Publicação</h2>
        <label className="mt-4 block text-xs uppercase tracking-widest text-muted">Tipo de artigo<select name="kind" defaultValue={initial.kind ?? "product"} className={input}><option value="product">Produto (loja)</option><option value="part">Peça (serve viaturas)</option></select></label>
        <label className="mt-4 block text-xs uppercase tracking-widest text-muted">Estado<select name="status" defaultValue={initial.status ?? "active"} className={input}><option value="active">Ativo</option><option value="draft">Rascunho</option></select></label>
        <label className="mt-4 flex items-center gap-3 text-sm text-muted"><input type="checkbox" name="is_featured" defaultChecked={initial.is_featured} className="accent-[var(--copper)]"/>Destaque na montra</label>
        <label className="mt-3 flex items-center gap-3 text-sm text-muted"><input type="checkbox" name="is_new" defaultChecked={initial.is_new} className="accent-[var(--copper)]"/>Etiqueta de novidade</label>
      </div>
      <div className={card}><h2 className={cardTitle}>Preço e impostos</h2>
        <Field name="price" label="Preço com IVA (€)" type="number" step="0.01" defaultValue={initial.price ?? ""} required/><Field name="compare_at_price" label="Preço anterior (€)" type="number" step="0.01" defaultValue={initial.compare_at_price ?? ""}/><Field name="vat_rate" label="Taxa de IVA (%)" type="number" step="0.01" defaultValue={initial.vat_rate ?? 23}/>
      </div>
      <div className={card}><h2 className={cardTitle}>Stock</h2>
        <label className="mt-4 block text-xs uppercase tracking-widest text-muted">Gestão de stock<select name="stock_mode" defaultValue={initial.stock_mode ?? "managed"} className={input}><option value="managed">Stock controlado</option><option value="unlimited">Sem limite</option><option value="on_request">Por encomenda</option></select></label>
        <Field name="low_stock_threshold" label="Aviso de stock baixo" type="number" defaultValue={3}/>
      </div>
      <div className={card}><h2 className={cardTitle}>Fotografia principal</h2>
        <label className="mt-4 block text-xs uppercase tracking-widest text-muted">{initial.id && <span className="mb-1 block normal-case tracking-normal text-muted">Ao guardar, esta imagem entra como principal. Para adicionar, apagar ou reordenar, usa a secção «Fotografias» mais abaixo.</span>}<input name="image" type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-xs file:mr-3 file:border-0 file:bg-copper file:px-3 file:py-2 file:font-display file:uppercase file:text-black"/></label>
      </div>
      <div className={card}>
        <button className="w-full bg-copper px-4 py-3 font-display text-xs uppercase tracking-widest text-black">Guardar artigo</button>
        <Link href="/admin/loja/produtos" className="mt-4 block text-center text-xs text-muted underline">Cancelar</Link>
      </div>
    </aside>
  </form>;
}

function Field({ name, label, defaultValue, required, type = "text", step }: { name: string; label: string; defaultValue?: string | number; required?: boolean; type?: string; step?: string }) {
  return <label className="block text-xs uppercase tracking-widest text-muted">{label}<input name={name} type={type} step={step} required={required} defaultValue={defaultValue} className={input}/></label>;
}
