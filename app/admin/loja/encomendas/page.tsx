import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { euro } from "@/lib/shop";

const label: Record<string, string> = { pending_payment: "A aguardar pagamento", paid: "Paga", preparing: "Em preparação", shipped: "Enviada", delivered: "Entregue", cancelled: "Cancelada", refunded: "Reembolsada", returned: "Devolvida" };
export default async function EncomendasLojaPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("orders").select("id,order_number,customer_name,customer_email,status,payment_status,total,created_at").order("created_at", { ascending: false }).limit(100);
  return <section><header className="flex flex-wrap items-end justify-between gap-4"><div><Link href="/admin/loja" className="font-display text-[10px] uppercase tracking-widest text-copper">← Loja</Link><h1 className="mt-3 font-display text-3xl font-bold uppercase">Encomendas</h1></div><a href="/api/admin/shop/export" className="border border-border px-4 py-2 text-xs uppercase tracking-widest text-muted hover:border-copper hover:text-copper">Exportar CSV</a></header>
    {!data?.length ? <p className="mt-7 border border-border bg-surface p-6 text-sm text-muted">Ainda não há encomendas.</p> : <div className="mt-7 overflow-x-auto border-y border-border"><table className="w-full min-w-[850px] text-left text-sm"><thead className="font-display text-[10px] uppercase tracking-widest text-muted"><tr><th className="py-3">Encomenda</th><th>Cliente</th><th>Estado</th><th>Pagamento</th><th>Total</th><th>Data</th></tr></thead><tbody className="divide-y divide-border">{data.map((order) => <tr key={order.id}><td className="py-4"><Link href={`/admin/loja/encomendas/${order.id}`} className="font-display text-foreground hover:text-copper">{order.order_number}</Link></td><td>{order.customer_name}<p className="text-xs text-muted">{order.customer_email}</p></td><td>{label[order.status] ?? order.status}</td><td className="text-xs text-muted">{order.payment_status === "paid" ? "Confirmado" : "Pendente"}</td><td>{euro(Number(order.total))}</td><td className="text-xs text-muted">{new Date(order.created_at).toLocaleDateString("pt-PT")}</td></tr>)}</tbody></table></div>}
  </section>;
}
