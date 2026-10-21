import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateShopOrder } from "@/app/actions/shop-admin";
import { euro } from "@/lib/shop";
import { PaymentBadge, FulfillmentBadge } from "@/app/admin/loja/badges";

const input = "mt-2 block w-full border border-border bg-background px-3 py-3 text-sm text-foreground";
const card = "border border-border bg-surface p-5";
const cardTitle = "font-display text-sm uppercase tracking-widest";

const statusLabel: Record<string, string> = { pending_payment: "A aguardar pagamento", paid: "Paga", preparing: "Em preparação", shipped: "Enviada", delivered: "Entregue", cancelled: "Cancelada", refunded: "Reembolsada", returned: "Devolvida" };
const methodLabel: Record<string, string> = { card: "Cartão", mb_way: "MB WAY", multibanco: "Multibanco", quote: "Orçamento" };

// Ficha de encomenda no formato Shopify: cabeçalho com nº e etiquetas de
// pagamento/entrega, coluna principal com artigos, totais e histórico, e rail
// direito com a atualização do percurso, pagamento, cliente e entrega.
export default async function EncomendaDetalhePage({ params }: PageProps<"/admin/loja/encomendas/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: order }, { data: items }, { data: history }] = await Promise.all([
    supabase.from("orders").select("*").eq("id", id).maybeSingle(),
    supabase.from("order_items").select("id,product_name,variant_name,sku,unit_price,quantity,line_total").eq("order_id", id),
    supabase.from("order_status_history").select("status,note,created_at").eq("order_id", id).order("created_at", { ascending: false }),
  ]);
  if (!order) notFound();
  return <section>
    <Link href="/admin/loja/encomendas" className="font-display text-[10px] uppercase tracking-widest text-copper">← Encomendas</Link>
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <h1 className="font-display text-3xl font-bold uppercase">#{order.order_number}</h1>
      <PaymentBadge status={order.payment_status} />
      <FulfillmentBadge status={order.status} />
    </div>
    <p className="mt-2 text-sm text-muted">{order.customer_name} · {new Date(order.created_at).toLocaleString("pt-PT")}</p>

    <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <section className={card}>
          <h2 className="font-display text-lg uppercase">Artigos</h2>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-border font-display text-[10px] uppercase tracking-widest text-muted">
                <th className="py-2 text-left font-normal">Artigo</th>
                <th className="py-2 text-right font-normal">Qtd</th>
                <th className="py-2 text-right font-normal">Preço unit.</th>
                <th className="py-2 text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {(items ?? []).map((item) => (
                <tr key={item.id}>
                  <td className="py-3 pr-4">{item.product_name}<span className="block text-xs text-muted">{item.variant_name}</span></td>
                  <td className="py-3 text-right text-muted">{item.quantity}</td>
                  <td className="py-3 text-right text-muted">{euro(Number(item.unit_price))}</td>
                  <td className="py-3 text-right">{euro(Number(item.line_total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
            <div className="flex justify-end gap-8"><span className="text-muted">Subtotal</span><span className="w-28 text-right">{euro(Number(order.subtotal))}</span></div>
            <div className="flex justify-end gap-8"><span className="text-muted">Portes</span><span className="w-28 text-right">{euro(Number(order.shipping_total))}</span></div>
            <div className="flex justify-end gap-8"><span className="text-muted">IVA incluído</span><span className="w-28 text-right">{euro(Number(order.vat_total))}</span></div>
            <div className="flex justify-end gap-8 border-t border-border pt-2 font-medium"><span>Total</span><span className="w-28 text-right">{euro(Number(order.total))}</span></div>
          </div>
        </section>
        <section className={card}>
          <h2 className="font-display text-lg uppercase">Histórico</h2>
          <ol className="mt-4">
            {(history ?? []).map((item, index) => (
              <li key={`${item.created_at}-${index}`} className="relative border-l border-border pb-5 pl-5 last:pb-0">
                <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-copper" />
                <p className="text-sm text-foreground">{statusLabel[item.status] ?? item.status}</p>
                {item.note && <p className="mt-1 text-xs text-muted">{item.note}</p>}
                <p className="mt-1 text-xs text-muted opacity-70">{new Date(item.created_at).toLocaleString("pt-PT")}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <aside className="space-y-5 self-start">
        <div className={card}><h2 className={cardTitle}>Atualizar encomenda</h2>
          <form action={updateShopOrder} className="mt-4 space-y-4"><input type="hidden" name="id" value={order.id}/><label className="block text-xs uppercase tracking-widest text-muted">Estado<select name="status" defaultValue={order.status} className={input}><option value="pending_payment">A aguardar pagamento</option><option value="paid">Paga</option><option value="preparing">Em preparação</option><option value="shipped">Enviada</option><option value="delivered">Entregue</option><option value="cancelled">Cancelada</option><option value="refunded">Reembolsada</option><option value="returned">Devolvida</option></select></label><Field name="tracking_number" label="Código de seguimento" value={order.tracking_number}/><Field name="tracking_url" label="Ligação de seguimento" value={order.tracking_url}/><Field name="status_note" label="Nota no histórico"/><label className="block text-xs uppercase tracking-widest text-muted">Nota interna<textarea name="admin_note" rows={4} defaultValue={order.admin_note} className={input}/></label><button className="w-full bg-copper px-4 py-3 font-display text-xs uppercase tracking-widest text-black">Guardar atualização</button></form>
        </div>
        <div className={card}><h2 className={cardTitle}>Pagamento</h2>
          <div className="mt-3"><PaymentBadge status={order.payment_status} /></div>
          <p className="mt-3 text-sm text-muted">Método: {methodLabel[order.payment_method ?? ""] ?? order.payment_method ?? "—"}</p>
          <p className="mt-2 text-sm text-foreground">Total: <span className="font-medium">{euro(Number(order.total))}</span></p>
        </div>
        <div className={card}><h2 className={cardTitle}>Cliente</h2>
          <p className="mt-3 text-sm text-foreground">{order.customer_name}</p>
          {order.customer_email && <p className="mt-1 break-all text-sm text-muted">{order.customer_email}</p>}
          {order.customer_phone && <p className="mt-1 text-sm text-muted">{order.customer_phone}</p>}
        </div>
        <div className={card}><h2 className={cardTitle}>Entrega</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">{order.shipping_name}<br/>{order.shipping_line1} {order.shipping_line2}<br/>{order.shipping_postal_code} {order.shipping_city}<br/>{order.shipping_country}</p>
        </div>
      </aside>
    </div>
  </section>;
}
function Field({ name, label, value, required }: { name: string; label: string; value?: string; required?: boolean }) { return <label className="block text-xs uppercase tracking-widest text-muted">{label}<input name={name} defaultValue={value ?? ""} required={required} className={input}/></label>; }
