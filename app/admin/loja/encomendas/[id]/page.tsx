import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateShopOrder } from "@/app/actions/shop-admin";
import { euro } from "@/lib/shop";

const input = "mt-2 block w-full border border-border bg-background px-3 py-3 text-sm text-foreground";
export default async function EncomendaDetalhePage({ params }: PageProps<"/admin/loja/encomendas/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: order }, { data: items }, { data: history }] = await Promise.all([
    supabase.from("orders").select("*").eq("id", id).maybeSingle(),
    supabase.from("order_items").select("id,product_name,variant_name,sku,unit_price,quantity,line_total").eq("order_id", id),
    supabase.from("order_status_history").select("status,note,created_at").eq("order_id", id).order("created_at", { ascending: false }),
  ]);
  if (!order) notFound();
  return <section><Link href="/admin/loja/encomendas" className="font-display text-[10px] uppercase tracking-widest text-copper">← Encomendas</Link><h1 className="mt-3 font-display text-3xl font-bold uppercase">{order.order_number}</h1><p className="mt-2 text-sm text-muted">{order.customer_name} · {order.customer_email} · {order.customer_phone}</p>
    <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_360px]"><div><section className="border border-border bg-surface p-5"><h2 className="font-display text-lg uppercase">Artigos</h2><ul className="mt-4 divide-y divide-border">{(items ?? []).map((item) => <li key={item.id} className="flex justify-between gap-4 py-3 text-sm"><span>{item.quantity} × {item.product_name}<span className="block text-xs text-muted">{item.variant_name}</span></span><span>{euro(Number(item.line_total))}</span></li>)}</ul><div className="mt-4 border-t border-border pt-4 text-sm"><p>Subtotal: {euro(Number(order.subtotal))}</p><p className="mt-1">Portes: {euro(Number(order.shipping_total))}</p><p className="mt-2 font-medium">Total: {euro(Number(order.total))}</p><p className="mt-1 text-xs text-muted">IVA incluído: {euro(Number(order.vat_total))}</p></div></section>
      <section className="mt-5 border border-border bg-surface p-5"><h2 className="font-display text-lg uppercase">Entrega</h2><p className="mt-3 text-sm">{order.shipping_name}<br/>{order.shipping_line1} {order.shipping_line2}<br/>{order.shipping_postal_code} {order.shipping_city}<br/>{order.shipping_country}</p></section>
      <section className="mt-5 border border-border bg-surface p-5"><h2 className="font-display text-lg uppercase">Histórico</h2><ul className="mt-4 space-y-3">{(history ?? []).map((item, index) => <li key={`${item.created_at}-${index}`} className="border-l border-copper/50 pl-3 text-sm"><p>{item.status}</p><p className="mt-1 text-xs text-muted">{item.note} · {new Date(item.created_at).toLocaleString("pt-PT")}</p></li>)}</ul></section>
    </div><aside className="h-fit border border-border bg-surface p-5"><h2 className="font-display text-lg uppercase">Atualizar encomenda</h2><form action={updateShopOrder} className="mt-5 space-y-4"><input type="hidden" name="id" value={order.id}/><label className="block text-xs uppercase tracking-widest text-muted">Estado<select name="status" defaultValue={order.status} className={input}><option value="pending_payment">A aguardar pagamento</option><option value="paid">Paga</option><option value="preparing">Em preparação</option><option value="shipped">Enviada</option><option value="delivered">Entregue</option><option value="cancelled">Cancelada</option></select></label><Field name="tracking_number" label="Código de seguimento" value={order.tracking_number}/><Field name="tracking_url" label="Ligação de seguimento" value={order.tracking_url}/><Field name="status_note" label="Nota no histórico"/><label className="block text-xs uppercase tracking-widest text-muted">Nota interna<textarea name="admin_note" rows={4} defaultValue={order.admin_note} className={input}/></label><button className="w-full bg-copper px-4 py-3 font-display text-xs uppercase tracking-widest text-black">Guardar atualização</button></form><p className="mt-5 text-xs text-muted">Pagamento: {order.payment_status} · {order.payment_method}</p></aside></div>
  </section>;
}
function Field({ name, label, value, required }: { name: string; label: string; value?: string; required?: boolean }) { return <label className="block text-xs uppercase tracking-widest text-muted">{label}<input name={name} defaultValue={value ?? ""} required={required} className={input}/></label>; }
