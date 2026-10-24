import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateShopOrder } from "@/app/actions/shop-admin";
import { AvisoErro } from "@/app/admin/loja/aviso";
import { euro } from "@/lib/shop";
import { PaymentBadge, FulfillmentBadge } from "@/app/admin/loja/badges";
import { PageHeader, Card } from "@/app/admin/loja/_ui";

const input = "mt-2 block w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground";

const statusLabel: Record<string, string> = { pending_payment: "A aguardar pagamento", paid: "Paga", preparing: "Em preparação", shipped: "Enviada", delivered: "Entregue", cancelled: "Cancelada", refunded: "Reembolsada", returned: "Devolvida" };
const methodLabel: Record<string, string> = { card: "Cartão", mb_way: "MB WAY", multibanco: "Multibanco", quote: "Orçamento" };

const nextStatus: Record<string, string> = {
  pending_payment: "preparing",
  paid: "preparing",
  preparing: "shipped",
  shipped: "delivered",
};

const nextStatusLabel: Record<string, string> = {
  pending_payment: "Passar a Em preparação",
  paid: "Passar a Em preparação",
  preparing: "Marcar como Enviada",
  shipped: "Marcar como Entregue",
};

// Ficha de encomenda no formato Shopify: cabeçalho com nº e etiquetas de
// pagamento/entrega, coluna principal com artigos, totais e histórico, e rail
// direito com a atualização do percurso, pagamento, cliente e entrega.
export default async function EncomendaDetalhePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> }) {
  const { id } = await params;
  const { erro } = await searchParams;
  const supabase = await createClient();
  const [{ data: order }, { data: items }, { data: history }] = await Promise.all([
    supabase.from("orders").select("*").eq("id", id).maybeSingle(),
    supabase.from("order_items").select("id,product_name,variant_name,sku,unit_price,quantity,line_total").eq("order_id", id),
    supabase.from("order_status_history").select("status,note,created_at").eq("order_id", id).order("created_at", { ascending: false }),
  ]);
  if (!order) notFound();
  const canAdvance = (order.payment_method === null && order.status === "pending_payment") || (order.status in nextStatus);
  const advanceTo = (order.payment_method === null && order.status === "pending_payment") ? "preparing" : nextStatus[order.status];

  return (
    <div>
      <PageHeader
        title={`#${order.order_number}`}
        subtitle={`${order.customer_name || "Cliente"} · ${new Date(order.created_at).toLocaleString("pt-PT")}`}
        backHref="/admin/loja/encomendas"
        breadcrumbs={[{ label: "Loja", href: "/admin/loja" }, { label: "Encomendas", href: "/admin/loja/encomendas" }]}
        actions={[
          ...(canAdvance && advanceTo
            ? [
                {
                  label: nextStatusLabel[order.payment_method === null && order.status === "pending_payment" ? "pending_payment" : order.status] ?? "Avançar estado",
                  action: async (formData: FormData) => {
                    "use server";
                    formData.set("id", order.id);
                    formData.set("status", advanceTo);
                    formData.set("status_note", "Atualizado a partir da ficha da encomenda");
                    await updateShopOrder(formData);
                  },
                  variant: "primary" as const,
                },
              ]
            : []),
          { label: "Ver no site", href: `/encomenda/${order.access_token}`, variant: "secondary" },
        ]}
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <PaymentBadge status={order.payment_status} />
        <FulfillmentBadge status={order.status} paymentMethod={order.payment_method} />
        {order.payment_method && <span className="border border-border px-2 py-1 text-[10px] uppercase tracking-widest text-muted">{methodLabel[order.payment_method] ?? order.payment_method}</span>}
      </div>

      <AvisoErro erro={erro} />

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <Card title="Artigos" subtitle={`${(items ?? []).length} ${ (items ?? []).length === 1 ? "artigo" : "artigos" }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border font-display text-[10px] uppercase tracking-widest text-muted">
                  <th className="pb-2 text-left font-normal">Artigo</th>
                  <th className="pb-2 text-right font-normal">Qtd</th>
                  <th className="pb-2 text-right font-normal">Preço unit.</th>
                  <th className="pb-2 text-right font-normal">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {(items ?? []).map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 pr-4">
                      <p className="text-foreground">{item.product_name}</p>
                      {item.variant_name && <p className="mt-1 text-xs text-muted">{item.variant_name}</p>}
                      {item.sku && <p className="mt-1 text-xs text-muted">SKU: {item.sku}</p>}
                    </td>
                    <td className="py-3 text-right text-muted">{item.quantity}</td>
                    <td className="py-3 text-right text-muted">{euro(Number(item.unit_price))}</td>
                    <td className="py-3 text-right text-foreground">{euro(Number(item.line_total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 space-y-1.5 border-t border-border pt-4 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted">Subtotal</span><span className="text-foreground">{euro(Number(order.subtotal))}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted">Portes</span><span className="text-foreground">{euro(Number(order.shipping_total))}</span></div>
            {Number(order.discount_total) > 0 && <div className="flex items-center justify-between"><span className="text-muted">Desconto</span><span className="text-copper">-{euro(Number(order.discount_total))}</span></div>}
            <div className="flex items-center justify-between text-xs text-muted"><span>IVA incluído</span><span>{euro(Number(order.vat_total))}</span></div>
            <div className="flex items-center justify-between border-t border-border pt-3 font-display text-base"><span className="uppercase">Total</span><span className="text-foreground">{euro(Number(order.total))}</span></div>
          </div>
        </Card>
        <Card title="Linha temporal">
          {(history ?? []).length === 0 ? (
            <p className="text-sm text-muted">Ainda sem histórico registado.</p>
          ) : (
            <ol className="relative ml-2 space-y-5">
              {(history ?? []).map((item, index) => (
                <li key={`${item.created_at}-${index}`} className="relative pl-6">
                  <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-copper" />
                  <span className="absolute left-[3px] top-4 h-full w-px bg-border last:hidden" />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-foreground">{statusLabel[item.status] ?? item.status}</p>
                    <p className="text-xs text-muted">{new Date(item.created_at).toLocaleString("pt-PT")}</p>
                  </div>
                  {item.note && <p className="mt-1 text-sm leading-relaxed text-muted">{item.note}</p>}
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <aside className="space-y-5 self-start">
        <Card title="Atualizar encomenda">
          <form action={updateShopOrder} className="space-y-4"><input type="hidden" name="id" value={order.id}/><label className="block text-xs uppercase tracking-widest text-muted">Estado<select name="status" defaultValue={order.status} className={input}><option value="pending_payment">A aguardar pagamento</option><option value="paid">Paga</option><option value="preparing">Em preparação</option><option value="shipped">Enviada</option><option value="delivered">Entregue</option><option value="cancelled">Cancelada</option><option value="refunded">Reembolsada</option><option value="returned">Devolvida</option></select></label><Field name="tracking_number" label="Código de seguimento" value={order.tracking_number}/><Field name="tracking_url" label="Ligação de seguimento" value={order.tracking_url}/><Field name="status_note" label="Nota no histórico"/><label className="block text-xs uppercase tracking-widest text-muted">Nota interna<textarea name="admin_note" rows={4} defaultValue={order.admin_note} className={input}/></label><button className="w-full bg-copper px-4 py-2.5 font-display text-[11px] uppercase tracking-widest text-black transition-colors hover:bg-copper-light">Guardar atualização</button></form>
        </Card>
        <Card title="Cliente">
          <div className="space-y-1 text-sm">
            <p className="text-foreground">{order.customer_name || "—"}</p>
            {order.customer_email && <a href={`mailto:${order.customer_email}`} className="block break-all text-muted transition-colors hover:text-copper">{order.customer_email}</a>}
            {order.customer_phone && <a href={`tel:${order.customer_phone}`} className="block text-muted transition-colors hover:text-copper">{order.customer_phone}</a>}
            {order.customer_nif && <p className="text-muted">NIF: {order.customer_nif}</p>}
          </div>
        </Card>
        <Card title="Morada de entrega">
          <div className="space-y-1 text-sm leading-relaxed text-muted">
            <p className="text-foreground">{order.shipping_name || order.customer_name}</p>
            <p>{order.shipping_line1}</p>
            {order.shipping_line2 && <p>{order.shipping_line2}</p>}
            <p>{order.shipping_postal_code} {order.shipping_city}</p>
            <p>{order.shipping_country}</p>
            {order.shipping_phone && <p className="pt-2 text-foreground">{order.shipping_phone}</p>}
          </div>
        </Card>
        {order.customer_note && (
          <Card title="Nota do cliente">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{order.customer_note}</p>
          </Card>
        )}
      </aside>
    </div>
    </div>
  );
}
function Field({ name, label, value, required }: { name: string; label: string; value?: string; required?: boolean }) { return <label className="block text-xs uppercase tracking-widest text-muted">{label}<input name={name} defaultValue={value ?? ""} required={required} className={input}/></label>; }
