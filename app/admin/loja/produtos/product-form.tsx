"use client";

import { useState } from "react";
import Link from "next/link";
import { saveShopProduct } from "@/app/actions/shop-admin";
import { VehiclePhotoPicker } from "@/components/ui/vehicle-photo-picker";

type Opcao = { id: string; name: string };
type Variante = { name: string; sku: string; stock: string; delta: string };
type Eixo = { name: string; values: string };

type ProdutoInicial = { id?: string; name?: string; slug?: string; category_id?: string; brand_id?: string; price?: number; compare_at_price?: number | null; short_description?: string; description?: string; sku?: string; weight_grams?: number; stock_mode?: string; status?: string; kind?: string; vat_rate?: number; is_featured?: boolean; is_new?: boolean; product_compatibility?: { brand: string; model: string; year_from?: number | null; year_to?: number | null; notes?: string | null }[]; product_variants?: { name: string; sku?: string | null; stock_quantity?: number | null; price_delta?: number | null }[] };

const input = "mt-2 block w-full border border-border bg-background px-3 py-3 text-sm text-foreground";
const card = "border border-border bg-surface p-5 sm:p-6";
const cardTitle = "font-display text-sm uppercase tracking-widest";
const miniInput = "block w-full border border-border bg-background px-2.5 py-2 text-xs text-foreground";

// Ficha de artigo no formato Shopify: coluna principal (informação,
// compatibilidade, variantes) e rail direito com cartões de publicação,
// preço e stock. O <form> usa display:contents para os cartões
// participarem na grelha da página — as «Fotografias» do editar ficam fora
// do form (têm formulários próprios) e a página coloca-as na coluna principal.
export function ProductForm({ categories, brands, initial = {} }: { categories: Opcao[]; brands: Opcao[]; initial?: ProdutoInicial }) {
  const isEdit = Boolean(initial.id);
  const [kind, setKind] = useState(initial.kind ?? "product");
  const [photos, setPhotos] = useState<File[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Builder de variantes por eixos (ex.: Cor × Tamanho): as combinações geradas
  // alimentam a tabela SKU/stock/ajuste, que o submit serializa para a action.
  const [eixos, setEixos] = useState<Eixo[]>([]);
  const [variantes, setVariantes] = useState<Variante[]>(() =>
    (initial.product_variants ?? []).map((item) => ({
      name: item.name,
      sku: item.sku ?? "",
      stock: String(item.stock_quantity ?? 0),
      delta: String(item.price_delta ?? 0),
    }))
  );

  const serializarVariantes = () =>
    variantes
      .map((item) => [item.name.replace(/;/g, ","), item.sku.replace(/;/g, ","), item.stock || "0", item.delta || "0"].join("; "))
      .join("\n");

  const gerarCombinacoes = () => {
    const parsed = eixos
      .map((eixo) => ({ name: eixo.name.trim(), values: eixo.values.split(",").map((v) => v.trim()).filter(Boolean) }))
      .filter((eixo) => eixo.name && eixo.values.length > 0);
    if (!parsed.length) return;
    const total = parsed.reduce((count, eixo) => count * eixo.values.length, 1);
    if (total > 200) {
      setError("Demasiadas combinações (máximo 200). Reduz o número de eixos ou valores.");
      return;
    }
    let nomes: string[][] = [[]];
    for (const eixo of parsed) nomes = nomes.flatMap((prefixo) => eixo.values.map((valor) => [...prefixo, valor]));
    const existentes = new Map(variantes.map((item) => [item.name, item]));
    const geradas: Variante[] = nomes.map((partes) => {
      const name = partes.join(" / ");
      return existentes.get(name) ?? { name, sku: "", stock: "0", delta: "0" };
    });
    setVariantes(geradas);
    setError(null);
  };

  const submit = async (fd: FormData) => {
    setBusy(true);
    setError(null);
    fd.set("variants", serializarVariantes());
    // A capa escolhida sobe primeiro — a action grava a posição 0 como principal.
    const ordered = photos.length ? [photos[coverIndex], ...photos.filter((_, index) => index !== coverIndex)] : [];
    ordered.forEach((photo) => fd.append("images", photo));
    try {
      await saveShopProduct(fd);
    } catch (err) {
      // O redirect do fim da action também chega como erro: deixa-o passar.
      if (err instanceof Error && typeof (err as { digest?: string }).digest === "string" && (err as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw err;
      setError(err instanceof Error ? err.message : "Não foi possível guardar o artigo.");
      setBusy(false);
    }
  };

  return <form action={submit} className="contents">
    {initial.id && <input type="hidden" name="id" value={initial.id}/>}
    <section className={`${card} lg:col-start-1`}><h2 className="font-display text-lg uppercase">Informação do artigo</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">
      <Field name="name" label="Nome" defaultValue={initial.name} required/><Field name="slug" label="Referência do endereço" defaultValue={initial.slug} required/>
      <Combobox label="Categoria" textName="category" idName="category_id" options={categories} initialId={initial.category_id} required/>
      <Combobox label="Marca" textName="brand" idName="brand_id" options={brands} initialId={initial.brand_id} placeholder="Sem marca (escreve para criar)"/>
      <Field name="sku" label="Referência interna" defaultValue={initial.sku}/><Field name="weight_grams" label="Peso (gramas)" type="number" defaultValue={initial.weight_grams ?? 0}/>
      <label className="block text-xs uppercase tracking-widest text-muted sm:col-span-2">Resumo<textarea name="short_description" defaultValue={initial.short_description ?? ""} rows={2} className={input}/></label>
      <label className="block text-xs uppercase tracking-widest text-muted sm:col-span-2">Descrição completa<textarea name="description" defaultValue={initial.description ?? ""} rows={7} className={input}/></label>
    </div></section>
    {/* A compatibilidade com viaturas só se aplica a peças. */}
    {kind === "part" && <section className={`${card} lg:col-start-1`}><h2 className="font-display text-lg uppercase">Compatibilidade com viaturas</h2><p className="mt-2 text-xs leading-relaxed text-muted">Uma viatura por linha: Marca; modelo; ano inicial; ano final; notas. Exemplo: BMW; M3 Touring; 2025; 2026; Confirmar geração antes da montagem.</p><textarea name="compatibility" defaultValue={(initial.product_compatibility ?? []).map((item) => [item.brand, item.model, item.year_from ?? "", item.year_to ?? "", item.notes ?? ""].join("; ")).join("\n")} rows={5} className={`${input} font-mono text-xs`} placeholder="BMW; M3 Touring; 2025; 2026; Confirmar versão"/></section>}
    <section className={`${card} lg:col-start-1`}><h2 className="font-display text-lg uppercase">Variantes e stock</h2>
      <p className="mt-2 text-xs leading-relaxed text-muted">Define eixos (ex.: Cor; Tamanho) e gera todas as combinações — cada linha fica com SKU, stock e ajuste de preço editáveis. Nas jantes usa só o eixo «Tamanho» (ex.: 18&quot;, 19&quot;, 20&quot;): no configurador cada jante varia no tamanho, não na cor. Ao guardar, esta lista substitui as variantes atuais (as encomendas antigas mantêm o nome e o valor).</p>
      <div className="mt-4 space-y-2">{eixos.map((eixo, index) => <div key={index} className="flex items-end gap-2">
        <label className="block w-40 text-[10px] uppercase tracking-widest text-muted">Eixo<input value={eixo.name} onChange={(event) => setEixos((atual) => atual.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} placeholder="Ex.: Cor" className={miniInput}/></label>
        <label className="block flex-1 text-[10px] uppercase tracking-widest text-muted">Valores (vírgula)<input value={eixo.values} onChange={(event) => setEixos((atual) => atual.map((item, i) => i === index ? { ...item, values: event.target.value } : item))} placeholder="Preto, Branco, Cinzento" className={miniInput}/></label>
        <button type="button" onClick={() => setEixos((atual) => atual.filter((_, i) => i !== index))} className="border border-border px-3 py-2 text-[10px] uppercase tracking-widest text-muted hover:text-red" aria-label={`Remover eixo ${eixo.name || index + 1}`}>×</button>
      </div>)}</div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setEixos((atual) => [...atual, { name: "", values: "" }])} className="border border-border px-3 py-2 text-[10px] uppercase tracking-widest text-muted hover:border-copper hover:text-copper">+ Adicionar eixo</button>
        {eixos.length > 0 && <button type="button" onClick={gerarCombinacoes} className="border border-copper/60 px-3 py-2 text-[10px] uppercase tracking-widest text-copper hover:bg-copper hover:text-black">Gerar combinações</button>}
      </div>
      {variantes.length > 0 ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-xs">
        <thead><tr className="border-b border-border text-[10px] uppercase tracking-widest text-muted"><th className="py-2 pr-2">Combinação</th><th className="py-2 pr-2">SKU</th><th className="w-20 py-2 pr-2">Stock</th><th className="w-24 py-2 pr-2">Ajuste (€)</th><th className="py-2"/></tr></thead>
        <tbody>{variantes.map((item, index) => <tr key={index} className="border-b border-border/50 align-top">
          <td className="py-1.5 pr-2"><input value={item.name} onChange={(event) => setVariantes((atual) => atual.map((v, i) => i === index ? { ...v, name: event.target.value } : v))} className={miniInput}/></td>
          <td className="py-1.5 pr-2"><input value={item.sku} onChange={(event) => setVariantes((atual) => atual.map((v, i) => i === index ? { ...v, sku: event.target.value } : v))} className={miniInput}/></td>
          <td className="py-1.5 pr-2"><input type="number" min={0} value={item.stock} onChange={(event) => setVariantes((atual) => atual.map((v, i) => i === index ? { ...v, stock: event.target.value } : v))} className={miniInput}/></td>
          <td className="py-1.5 pr-2"><input type="number" step="0.01" value={item.delta} onChange={(event) => setVariantes((atual) => atual.map((v, i) => i === index ? { ...v, delta: event.target.value } : v))} className={miniInput}/></td>
          <td className="py-1.5 text-right"><button type="button" onClick={() => setVariantes((atual) => atual.filter((_, i) => i !== index))} className="px-2 py-1 text-[10px] uppercase tracking-widest text-muted underline underline-offset-2 hover:text-red" aria-label={`Remover variante ${item.name || index + 1}`}>Apagar</button></td>
        </tr>)}</tbody>
      </table></div> : <p className="mt-4 text-xs text-muted">Sem variantes — o artigo fica com uma entrada única («Único»).</p>}
      <button type="button" onClick={() => setVariantes((atual) => [...atual, { name: "", sku: "", stock: "0", delta: "0" }])} className="mt-3 border border-border px-3 py-2 text-[10px] uppercase tracking-widest text-muted hover:border-copper hover:text-copper">+ Adicionar variante manual</button>
    </section>
    {/* No criar, as fotografias escolhem-se aqui (multi + pré-visualização);
        no editar usam-se as «Fotografias» da página. */}
    {!isEdit && <section className={`${card} lg:col-start-1`}>
      <h2 className="font-display text-lg uppercase">Fotografias</h2>
      <p className="mt-2 text-xs leading-relaxed text-muted">A primeira fotografia é a principal na loja e nos cartões.</p>
      <div className="-mt-3"><VehiclePhotoPicker label="artigo" onChange={(files, cover) => { setPhotos(files); setCoverIndex(cover); }}/></div>
      {photos.length > 1 && coverIndex > 0 && <p className="mt-1 text-[11px] text-muted">A fotografia {coverIndex + 1} entra como principal ao guardar.</p>}
    </section>}

    <aside className="space-y-5 self-start lg:col-start-2 lg:row-start-1 lg:row-span-4">
      <div className={card}><h2 className={cardTitle}>Publicação</h2>
        <label className="mt-4 block text-xs uppercase tracking-widest text-muted">Tipo de artigo<select value={kind} onChange={(event) => setKind(event.target.value)} className={input}><option value="product">Produto (loja)</option><option value="part">Peça (serve viaturas)</option></select></label>
        <label className="mt-4 block text-xs uppercase tracking-widest text-muted">Estado<select name="status" defaultValue={initial.status ?? "active"} className={input}><option value="active">Ativo</option><option value="draft">Rascunho</option></select></label>
        <label className="mt-4 flex items-center gap-3 text-sm text-muted"><input type="checkbox" name="is_featured" defaultChecked={initial.is_featured} className="accent-[var(--copper)]"/>Destaque na montra</label>
        <label className="mt-3 flex items-center gap-3 text-sm text-muted"><input type="checkbox" name="is_new" defaultChecked={initial.is_new} className="accent-[var(--copper)]"/>Etiqueta de novidade</label>
        <input type="hidden" name="kind" value={kind}/>
      </div>
      <div className={card}><h2 className={cardTitle}>Preço e impostos</h2>
        <Field name="price" label="Preço com IVA (€)" type="number" step="0.01" defaultValue={initial.price ?? ""} required/><Field name="compare_at_price" label="Preço anterior (€)" type="number" step="0.01" defaultValue={initial.compare_at_price ?? ""}/><Field name="vat_rate" label="Taxa de IVA (%)" type="number" step="0.01" defaultValue={initial.vat_rate ?? 23}/>
      </div>
      <div className={card}><h2 className={cardTitle}>Stock</h2>
        <label className="mt-4 block text-xs uppercase tracking-widest text-muted">Gestão de stock<select name="stock_mode" defaultValue={initial.stock_mode ?? "managed"} className={input}><option value="managed">Stock controlado</option><option value="unlimited">Sem limite</option><option value="on_request">Por encomenda</option></select></label>
        <Field name="low_stock_threshold" label="Aviso de stock baixo" type="number" defaultValue={3}/>
      </div>
      <div className={card}>
        {error && <p role="alert" className="mb-4 border border-red/40 p-3 text-xs leading-5 text-red">{error}</p>}
        <button disabled={busy} className="w-full bg-copper px-4 py-3 font-display text-xs uppercase tracking-widest text-black disabled:opacity-60">{busy ? "A guardar…" : "Guardar artigo"}</button>
        <Link href="/admin/loja/produtos" className="mt-4 block text-center text-xs text-muted underline">Cancelar</Link>
      </div>
    </aside>
  </form>;
}

function Field({ name, label, defaultValue, required, type = "text", step }: { name: string; label: string; defaultValue?: string | number; required?: boolean; type?: string; step?: string }) {
  return <label className="block text-xs uppercase tracking-widest text-muted">{label}<input name={name} type={type} step={step} required={required} defaultValue={defaultValue ?? ""} className={input}/></label>;
}

// Combobox escrever+selecionar: o texto visível vale pelo nome (a action cria
// o que não existir); o hidden carrega o id quando o nome corresponde a uma
// opção já conhecida.
function Combobox({ label, textName, idName, options, initialId, required, placeholder }: { label: string; textName: string; idName: string; options: Opcao[]; initialId?: string; required?: boolean; placeholder?: string }) {
  const [text, setText] = useState(() => options.find((item) => item.id === initialId)?.name ?? "");
  const match = options.find((item) => item.name.localeCompare(text.trim(), "pt", { sensitivity: "base" }) === 0);
  const listId = `combobox-${textName}`;
  return <label className="block text-xs uppercase tracking-widest text-muted">{label}
    <input list={listId} value={text} required={required} placeholder={placeholder} onChange={(event) => setText(event.target.value)} className={input}/>
    <datalist id={listId}>{options.map((item) => <option key={item.id} value={item.name}/>)}</datalist>
    <input type="hidden" name={idName} value={match?.id ?? ""}/>
  </label>;
}
