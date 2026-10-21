import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { toggleNewsletterSubscriber, deleteNewsletterSubscriber } from "@/app/actions/shop-admin";

export default async function NewsletterLojaPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("newsletter_subscribers").select("id,email,name,source,status,created_at").order("created_at", { ascending: false }).limit(2000);
  const list = data ?? [];
  const active = list.filter((row) => row.status === "active").length;
  return <section><header className="flex flex-wrap items-end justify-between gap-4"><div><Link href="/admin/loja" className="font-display text-[10px] uppercase tracking-widest text-copper">← Loja</Link><h1 className="mt-3 font-display text-3xl font-bold uppercase">Newsletter</h1><p className="mt-2 text-sm text-muted">{active} ativos · {list.length - active} dados de saída · total {list.length}</p></div><a href="/api/admin/shop/newsletter/export" className="border border-border px-4 py-2 text-xs uppercase tracking-widest text-muted hover:border-copper hover:text-copper">Exportar CSV</a></header>
    {!list.length ? <p className="mt-7 border border-border bg-surface p-6 text-sm text-muted">Ainda não há subscritores.</p> :
      <div className="mt-7 overflow-x-auto border-y border-border"><table className="w-full min-w-[760px] text-left text-sm"><thead className="font-display text-[10px] uppercase tracking-widest text-muted"><tr><th className="py-3">Email</th><th>Nome</th><th>Origem</th><th>Estado</th><th>Data</th><th className="text-right">Ações</th></tr></thead><tbody className="divide-y divide-border">{list.map((row) => <tr key={row.id}><td className="py-3 text-foreground">{row.email}<p className="text-xs text-muted">{row.name}</p></td><td className="text-xs text-muted">{row.source}</td><td className="text-xs">{row.status === "active" ? <span className="text-success">Ativo</span> : <span className="text-muted">Desativado</span>}</td><td className="text-xs text-muted">{new Date(row.created_at).toLocaleDateString("pt-PT")}</td>
        <td className="text-right"><div className="inline-flex gap-3">
          <form action={toggleNewsletterSubscriber}><input type="hidden" name="id" value={row.id}/><input type="hidden" name="status" value={row.status}/><button className="text-[11px] uppercase tracking-widest text-muted underline underline-offset-4 hover:text-copper">{row.status === "active" ? "Desativar" : "Reativar"}</button></form>
          <form action={deleteNewsletterSubscriber}><input type="hidden" name="id" value={row.id}/><button className="text-[11px] uppercase tracking-widest text-muted underline underline-offset-4 hover:text-red">Apagar</button></form>
        </div></td></tr>)}</tbody></table></div>}
  </section>;
}
