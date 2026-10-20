import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { euro } from "@/lib/shop";

type Receipt = { order: { order_number: string; status: string; payment_status: string; payment_method: string; subtotal: number; discount_total: number; shipping_total: number; vat_total: number; total: number; customer_email: string; created_at: string }; items: { product_name: string; variant_name: string; quantity: number; line_total: number }[] };

export const metadata = { title: "Acompanhar encomenda", robots: { index: false, follow: false } };

export default async function EncomendaPage({ params }: PageProps<"/encomenda/[token]">) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_order_by_token", { p_token: token });
  const receipt = data as Receipt | null;
  if (!receipt?.order) return <main className="mx-auto max-w-3xl px-5 py-20 text-center"><h1 className="font-display text-3xl uppercase">Encomenda não encontrada</h1><p className="mt-4 text-sm text-muted">Confirma o link recebido por email.</p><Link href="/" className="mt-7 inline-block text-sm text-copper underline">Voltar ao início</Link></main>;
  const order = receipt.order;
  const paymentLabel = order.payment_status === "paid" ? "Pagamento confirmado" : order.payment_status === "failed" ? "Pagamento não concluído" : "A aguardar confirmação do pagamento";
  return <div className="mx-auto max-w-3xl px-5 pb-20 pt-12 sm:px-8 sm:pt-20">
    <p className="font-display text-[10px] uppercase tracking-[0.28em] text-copper">Encomenda registada</p>
    <h1 className="mt-3 font-display text-4xl font-bold uppercase leading-none text-foreground sm:text-6xl">Obrigado pela tua compra</h1>
    <p className="mt-5 text-sm leading-relaxed text-muted">Enviámos os detalhes para <strong className="text-foreground">{order.customer_email}</strong>. Guarda o número da encomenda para referência.</p>
    <section className="mt-8 border border-border bg-surface p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5 border-b border-border pb-5"><div><p className="text-xs uppercase tracking-widest text-muted">Número</p><p className="mt-1 font-display text-xl text-foreground">{order.order_number}</p></div><div><p className="text-xs uppercase tracking-widest text-muted">Estado do pagamento</p><p className={`mt-1 text-sm ${order.payment_status === "paid" ? "text-success" : "text-warning"}`}>{paymentLabel}</p></div></div>
      <ul className="divide-y divide-border">{receipt.items.map((item, index) => <li key={`${item.product_name}-${index}`} className="flex justify-between gap-4 py-4 text-sm"><span className="text-muted">{item.quantity} × {item.product_name}<span className="block text-xs">{item.variant_name}</span></span><span className="shrink-0 text-foreground">{euro(Number(item.line_total))}</span></li>)}</ul>
      <dl className="ml-auto mt-4 max-w-xs space-y-2 border-t border-border pt-4 text-sm"><div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{euro(Number(order.subtotal))}</dd></div>{Number(order.discount_total) > 0 && <div className="flex justify-between"><dt className="text-muted">Desconto</dt><dd>−{euro(Number(order.discount_total))}</dd></div>}<div className="flex justify-between"><dt className="text-muted">Portes</dt><dd>{euro(Number(order.shipping_total))}</dd></div><div className="flex justify-between border-t border-border pt-3 font-medium"><dt>Total com IVA</dt><dd>{euro(Number(order.total))}</dd></div></dl>
    </section>
    <div className="mt-7 flex flex-wrap gap-3"><Link href="/loja" className="bg-copper px-6 py-3 font-display text-xs uppercase tracking-widest text-black">Voltar à loja</Link><Link href="/conta/encomendas" className="border border-border px-6 py-3 font-display text-xs uppercase tracking-widest text-foreground">As minhas encomendas</Link></div>
  </div>;
}
