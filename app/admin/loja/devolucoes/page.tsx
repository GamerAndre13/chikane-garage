import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { updateReturnRequest } from "@/app/actions/shop-admin";
import { AvisoErro } from "@/app/admin/loja/aviso";
import { PageHeader, Card, EmptyState } from "@/app/admin/loja/_ui";

const input = "mt-2 block w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground";
const statusLabel: Record<string, string> = { requested: "Pedida", approved: "Aprovada", received: "Recebida", refunded: "Reembolsada", rejected: "Rejeitada" };

export default async function DevolucoesLojaPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("return_requests").select("id,order_id,email,reason,fault,status,refund_total,return_tracking,admin_note,created_at,orders(order_number,total,status)").order("created_at", { ascending: false }).limit(200);
  const list = (data ?? []) as unknown as { id: string; order_id: string; email: string; reason: string; fault: string; status: string; refund_total: number; return_tracking: string; admin_note: string; created_at: string; orders: { order_number: string; total: number; status: string } }[];

  return (
    <div>
      <PageHeader
        title="Devoluções"
        subtitle="Pedidos de devolução e reembolsos."
        backHref="/admin/loja"
        breadcrumbs={[{ label: "Loja", href: "/admin/loja" }]}
      />
      <AvisoErro erro={erro} />
      <Card title="Pedidos" subtitle={`${list.length} ${list.length === 1 ? "pedido" : "pedidos"}`}>
        {!list.length ? (
          <EmptyState title="Não há pedidos de devolução" description="Quando surgirem pedidos dos clientes, aparecem aqui." />
        ) : (
          <div className="space-y-4">
            {list.map((request) => (
              <article key={request.id} className="border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/admin/loja/encomendas/${request.order_id}`} className="font-display text-sm uppercase text-foreground transition-colors hover:text-copper">{request.orders?.order_number ?? "Encomenda"}</Link>
                    <p className="mt-1 text-xs text-muted">{request.email} · {new Date(request.created_at).toLocaleDateString("pt-PT")} · {request.fault === "shop" ? "defeito da loja" : "cliente arrependido"}</p>
                    {request.reason && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{request.reason}</p>}
                  </div>
                  <span className="border border-border px-2.5 py-1 font-display text-[10px] uppercase tracking-widest text-copper">{statusLabel[request.status] ?? request.status}</span>
                </div>
                <form action={updateReturnRequest} className="mt-4 grid gap-3 sm:grid-cols-[160px_130px_1fr_auto] sm:items-end">
                  <input type="hidden" name="id" value={request.id} />
                  <label className="block text-xs uppercase tracking-widest text-muted">
                    Estado
                    <select name="status" defaultValue={request.status} className={input}>
                      {Object.entries(statusLabel).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                    </select>
                  </label>
                  <label className="block text-xs uppercase tracking-widest text-muted">
                    Reembolso (€)
                    <input name="refund_total" type="number" step="0.01" min={0} defaultValue={Number(request.refund_total) || 0} className={input} />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs uppercase tracking-widest text-muted">
                      Código de retorno
                      <input name="return_tracking" defaultValue={request.return_tracking} className={input} placeholder="CT…" />
                    </label>
                    <label className="block text-xs uppercase tracking-widest text-muted">
                      Nota interna
                      <input name="admin_note" defaultValue={request.admin_note} className={input} />
                    </label>
                  </div>
                  <button className="mb-0.5 border border-border px-4 py-2 font-display text-[10px] uppercase tracking-widest text-muted transition-colors hover:border-copper hover:text-copper">Guardar</button>
                </form>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
