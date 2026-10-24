import { createClient } from "@/lib/supabase/server";
import { toggleNewsletterSubscriber, deleteNewsletterSubscriber } from "@/app/actions/shop-admin";
import { AvisoErro } from "@/app/admin/loja/aviso";
import { PageHeader, Card, EmptyState } from "@/app/admin/loja/_ui";

export default async function NewsletterLojaPage({ searchParams }: PageProps<"/admin/loja/newsletter">) {
  const { erro } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("newsletter_subscribers").select("id,email,name,source,status,created_at").order("created_at", { ascending: false }).limit(2000);
  const list = data ?? [];
  const active = list.filter((row) => row.status === "active").length;

  return (
    <div>
      <PageHeader
        title="Newsletter"
        subtitle={`${active} ativos · total ${list.length}`}
        backHref="/admin/loja"
        breadcrumbs={[{ label: "Loja", href: "/admin/loja" }]}
        actions={[{ label: "Exportar CSV", href: "/api/admin/shop/newsletter/export", variant: "secondary" }]}
      />
      <AvisoErro erro={erro} />
      <Card title="Subscritores" subtitle="Gestão da mailing list.">
        {!list.length ? (
          <EmptyState title="Ainda não há subscritores" description="Quando houver registos, aparecem aqui." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border font-display text-[10px] uppercase tracking-widest text-muted">
                  <th className="pb-2 font-normal">Email</th>
                  <th className="pb-2 font-normal">Nome</th>
                  <th className="pb-2 font-normal">Origem</th>
                  <th className="pb-2 font-normal">Estado</th>
                  <th className="pb-2 font-normal">Data</th>
                  <th className="pb-2 text-right font-normal">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {list.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2.5 text-foreground">{row.email}</td>
                    <td className="max-w-[200px] truncate text-muted">{row.name || "—"}</td>
                    <td className="text-muted">{row.source || "—"}</td>
                    <td className="text-xs">{row.status === "active" ? <span className="text-success">Ativo</span> : <span className="text-muted">Desativado</span>}</td>
                    <td className="text-xs text-muted">{new Date(row.created_at).toLocaleDateString("pt-PT")}</td>
                    <td className="py-2.5 text-right">
                      <div className="inline-flex items-center gap-3">
                        <form action={toggleNewsletterSubscriber}>
                          <input type="hidden" name="id" value={row.id} />
                          <input type="hidden" name="status" value={row.status} />
                          <button className="text-[11px] uppercase tracking-widest text-muted transition-colors hover:text-copper">{row.status === "active" ? "Desativar" : "Reativar"}</button>
                        </form>
                        <form action={deleteNewsletterSubscriber}>
                          <input type="hidden" name="id" value={row.id} />
                          <button className="text-[11px] uppercase tracking-widest text-muted transition-colors hover:text-red">Apagar</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
