import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { updateReturnRequest } from "@/app/actions/shop-admin";

const input = "mt-2 block w-full border border-border bg-background px-3 py-3 text-sm text-foreground";
const statusLabel: Record<string, string> = { requested: "Pedida", approved: "Aprovada", received: "Recebida", refunded: "Reembolsada", rejected: "Rejeitada" };

export default async function DevolucoesLojaPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("return_requests").select("id,order_id,email,reason,fault,status,refund_total,return_tracking,admin_note,created_at,orders(order_number,total,status)").order("created_at", { ascending: false }).limit(200);
  const list = (data ?? []) as unknown as { id: string; order_id: string; email: string; reason: string; fault: string; status: string; refund_total: number; return_tracking: string; admin_note: string; created_at: string; orders: { order_number: string; total: number; status: string } }[];
  return <section><Link href="/admin/loja" className="font-display text-[10px] uppercase tracking-widest text-copper">← Loja</Link><h1 className="mt-3 font-display text-3xl font-bold uppercase">Devoluções</h1>
    <p className="mt-2 max-w-2xl text-sm text-muted">Pedidos de devolução abertos pelo cliente. Ao marcar como «Reembolsada», a encomenda correspondente passa também a reembolsada.</p>
    {!list.length ? <p className="mt-7 border border-border bg-surface p-6 text-sm text-muted">Não há pedidos de devolução.</p> :
      <ul className="mt-7 space-y-5">{list.map((request) => <li key={request.id} className="border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link href={`/admin/loja/encomendas/${request.order_id}`} className="font-display text-sm uppercase text-foreground hover:text-copper">{request.orders?.order_number ?? "Encomenda"}</Link>
            <p className="mt-1 text-xs text-muted">{request.email} · {new Date(request.created_at).toLocaleDateString("pt-PT")} · {request.fault === "shop" ? "defeito da loja" : "cliente arrependido"}</p>
            {request.reason && <p className="mt-2 max-w-2xl text-sm text-silver">{request.reason}</p>}
          </div>
          <span className="border border-border px-3 py-1 font-display text-[10px] uppercase tracking-widest text-copper">{statusLabel[request.status] ?? request.status}</span>
        </div>
        <form action={updateReturnRequest} className="mt-4 grid gap-3 sm:grid-cols-[170px_130px_1fr_auto] sm:items-end">
          <input type="hidden" name="id" value={request.id}/>
          <label className="block text-xs uppercase tracking-widest text-muted">Estado<select name="status" defaultValue={request.status} className={input}>{Object.entries(statusLabel).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
          <label className="block text-xs uppercase tracking-widest text-muted">Reembolso (€)<input name="refund_total" type="number" step="0.01" min={0} defaultValue={Number(request.refund_total) || 0} className={input}/></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs uppercase tracking-widest text-muted">Segurança de retorno<input name="return_tracking" defaultValue={request.return_tracking} className={input} placeholder="CT…"/></label>
            <label className="block text-xs uppercase tracking-widest text-muted">Nota interna<input name="admin_note" defaultValue={request.admin_note} className={input}/></label>
          </div>
          <button className="mb-1 bg-copper px-4 py-3 font-display text-[10px] uppercase tracking-widest text-black">Guardar</button>
        </form>
      </li>)}</ul>}
  </section>;
}
