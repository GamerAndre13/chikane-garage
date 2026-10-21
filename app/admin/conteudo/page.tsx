"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type ContentRow = { id: string; section_key: string; title: string; subtitle: string; body: string; image_url: string; link_url: string; link_text: string };

const input = "mt-2 block w-full border border-border bg-background px-3 py-3 text-sm text-foreground";

// Rótulos das chaves que a homepage lê (o que aparece é a coluna `body`).
const labels: Record<string, string> = {
  "hero.tagline": "Frase de destaque (hero)",
  "hero.slogan": "Slogan (hero)",
  "hero.intro": "Introdução do hero",
  "garage.text": "Texto «A nossa história» da home",
  "garage.title": "Título da secção Garagem",
  "shop.title": "Título da secção Loja",
  "newsletter.title": "Título da newsletter",
};
const usedByHome = (key: string) => /^(hero|garage|shop|newsletter)[._]/.test(key);

const SELECT = "id,section_key,title,subtitle,body,image_url,link_url,link_text";

// Editor de textos do site (site_content) — o que se escreve aqui aparece na homepage.
export default function ConteudoAdminPage() {
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<ContentRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Carga inicial — IIFE com flag de cancelamento (evita setState após desmontar).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("site_content").select(SELECT).order("section_key");
      if (cancelled) return;
      setRows((data ?? []) as ContentRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Recarrega a lista após gravar (fora do efeito).
  const refresh = async () => {
    const { data } = await supabase.from("site_content").select(SELECT).order("section_key");
    setRows((data ?? []) as ContentRow[]);
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    const { error } = await supabase.from("site_content").update({
      title: draft.title, subtitle: draft.subtitle, body: draft.body,
      image_url: draft.image_url, link_url: draft.link_url, link_text: draft.link_text,
      updated_at: new Date().toISOString(),
    }).eq("id", draft.id);
    setSaving(false);
    if (error) { setMessage(`Erro ao guardar: ${error.message}`); return; }
    setMessage("Texto guardado.");
    setEditingKey(null);
    setDraft(null);
    void refresh();
  };

  return <section><h1 className="font-display text-3xl font-bold uppercase">Conteúdo do site</h1>
    <p className="mt-2 max-w-2xl text-sm text-muted">Textos da homepage e de outras secções (tabelados como conteúdos do site). O que aparece na página é a coluna «Texto»; o título serve só para te identificares aqui no backoffice.</p>
    {message && <p className="mt-4 border border-border bg-surface p-3 text-xs text-copper">{message}</p>}
    {loading ? <p className="mt-7 text-sm text-muted">A carregar…</p> : !rows.length ?
      <p className="mt-7 border border-border bg-surface p-6 text-sm text-muted">Não há conteúdos para editar. Corre o ficheiro supabase/setup.sql no SQL Editor do Supabase (é idempotente) para criar as linhas iniciais.</p> :
      <ul className="mt-7 space-y-4">{rows.map((row) => {
        const isEditing = editingKey === row.section_key;
        const legacy = !usedByHome(row.section_key);
        return <li key={row.id} className="border border-border bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="font-display text-sm uppercase tracking-widest text-foreground">{labels[row.section_key] ?? row.title ?? row.section_key}</p>
              <p className="mt-1 text-xs text-muted"><code>{row.section_key}</code>{legacy && <span className="ml-2 border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest">chave antiga — não usada pela home</span>}</p></div>
            {!isEditing && <button onClick={() => { setEditingKey(row.section_key); setDraft({ ...row }); setMessage(null); }} className="border border-border px-4 py-2 text-xs uppercase tracking-widest text-muted hover:border-copper hover:text-copper">Editar</button>}
          </div>
          {!isEditing ? <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-silver">{row.body || <span className="text-muted">(sem texto)</span>}</p> :
            draft && <div className="mt-4 space-y-4">
              <label className="block text-xs uppercase tracking-widest text-muted">Texto (aparece no site)<textarea rows={5} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} className={input}/></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs uppercase tracking-widest text-muted">Título (identificação no backoffice)<input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={input}/></label>
                <label className="block text-xs uppercase tracking-widest text-muted">Subtítulo<input value={draft.subtitle} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} className={input}/></label>
                <label className="block text-xs uppercase tracking-widest text-muted">Imagem (URL)<input value={draft.image_url} onChange={(e) => setDraft({ ...draft, image_url: e.target.value })} className={input}/></label>
                <label className="block text-xs uppercase tracking-widest text-muted">Ligação — URL<input value={draft.link_url} onChange={(e) => setDraft({ ...draft, link_url: e.target.value })} className={input}/></label>
                <label className="block text-xs uppercase tracking-widest text-muted">Ligação — texto do botão<input value={draft.link_text} onChange={(e) => setDraft({ ...draft, link_text: e.target.value })} className={input}/></label>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <button onClick={() => void save()} disabled={saving} className="bg-copper px-5 py-3 font-display text-xs uppercase tracking-widest text-black disabled:opacity-50">{saving ? "A guardar…" : "Guardar"}</button>
                <button onClick={() => { setEditingKey(null); setDraft(null); setMessage(null); }} className="border border-border px-4 py-2 text-xs uppercase tracking-widest text-muted hover:border-copper hover:text-copper">Cancelar</button>
              </div>
            </div>}
        </li>;
      })}</ul>}
  </section>;
}
