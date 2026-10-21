import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { euro } from "@/lib/shop";

type Receipt = { order: { order_number: string; status: string; payment_status: string; payment_method: string | null; subtotal: number; discount_total: number; shipping_total: number; vat_total: number; total: number; customer_email: string; created_at: string }; items: { product_name: string; variant_name: string; quantity: number; line_total: number }[] };
type HistoryEntry = { status: string; note: string; created_at: string };

export const metadata = { title: "Acompanhar encomenda", robots: { index: false, follow: false } };

// Percurso da encomenda por estados (padrão das grandes marcas: stepper
// "recebido → confirmado → preparação → enviação → entrega").
const STEPS = [
  { key: "pending_payment", label: "Recebido" },
  { key: "paid", label: "Confirmado" },
  { key: "preparing", label: "Em preparação" },
  { key: "shipped", label: "Enviada" },
  { key: "delivered", label: "Entregue" },
];
const STEP_INDEX: Record<string, number> = { pending_payment: 0, paid: 1, preparing: 2, shipped: 3, delivered: 4 };
const DEAD_STATUSES = new Set(["cancelled", "refunded", "returned"]);

export default async function EncomendaPage({ params }: PageProps<"/encomenda/[token]">) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_order_by_token", { p_token: token });
  const receipt = data as Receipt | null;
  if (!receipt?.order) return <main className="mx-auto max-w-3xl px-5 py-20 text-center"><h1 className="font-display text-3xl uppercase">Encomenda não encontrada</h1><p className="mt-4 text-sm text-muted">Confirma o link recebido por email.</p><Link href="/" className="mt-7 inline-block text-sm text-copper underline">Voltar ao início</Link></main>;
  const order = receipt.order;

  // Pedidos sem pagamento online (viaturas e artigos por encomenda) têm
  // linguagem própria: a equipa é que contacta e confirma antes de cobrar.
  const isRequest = order.payment_method == null;
  const dead = DEAD_STATUSES.has(order.status);
  const currentStep = STEP_INDEX[order.status] ?? 0;
  const paymentLabel = order.payment_status === "paid" ? "Pagamento confirmado" : order.payment_status === "failed" ? "Pagamento não concluído" : isRequest ? "Sem cobrança — a equipa contacta-te" : "A aguardar confirmação do pagamento";

  // Clientes registados: o histórico detalhado do percurso (RLS: só encomendas
  // da própria conta) fica visível nesta página.
  let history: HistoryEntry[] = [];
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: rows } = await supabase
        .from("order_status_history")
        .select("status, note, created_at, orders!inner(access_token)")
        .eq("orders.access_token", token)
        .order("created_at", { ascending: true });
      history = (rows ?? []) as unknown as HistoryEntry[];
    }
  } catch { history = []; }

  return <div className="mx-auto max-w-3xl px-5 pb-20 pt-12 sm:px-8 sm:pt-20">
    <p className="font-display text-[10px] uppercase tracking-[0.28em] text-copper">{isRequest ? "Pedido de encomenda recebido" : "Encomenda registada"}</p>
    <h1 className="mt-3 font-display text-4xl font-bold uppercase leading-none text-foreground sm:text-6xl">{isRequest ? "Estamos contigo a seguir" : "Obrigado pela tua compra"}</h1>
    {isRequest
      ? <p className="mt-5 text-sm leading-relaxed text-muted">Recebemos o teu pedido <strong className="text-foreground">{order.order_number}</strong>. A nossa equipa contacta-te nas próximas 24 horas úteis para confirmar configuração, prazo e condições — só depois é que qualquer pagamento é combinado.</p>
      : <p className="mt-5 text-sm leading-relaxed text-muted">Enviámos os detalhes para <strong className="text-foreground">{order.customer_email}</strong>. Guarda o número da encomenda para referência.</p>}

    {/* Percurso do pedido */}
    {!dead && <section className="mt-8 border border-border bg-surface p-5 sm:p-7">
      <h2 className="font-display text-xs uppercase tracking-[0.24em] text-copper">Percurso do pedido</h2>
      <ol className="mt-5 grid gap-4 sm:grid-cols-5">
        {STEPS.map((step, index) => {
          const done = index < currentStep;
          const active = index === currentStep;
          return <li key={step.key} className="flex items-start gap-2.5 sm:block">
            <span aria-hidden="true" className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] sm:mt-0 ${done ? "border-copper bg-copper text-black" : active ? "border-copper text-copper" : "border-border text-muted"}`}>{done ? "✓" : index + 1}</span>
            <span className={`block text-xs leading-4 sm:mt-2 ${active ? "font-semibold text-copper" : done ? "text-silver" : "text-muted"}`}>{step.label}</span>
          </li>;
        })}
      </ol>
      <p className="mt-5 border-t border-border pt-4 text-xs leading-5 text-muted">Atualizamos este percurso sempre que o pedido avança. Qualquer dúvida, responde ao email da equipa ou contacta-nos.</p>
    </section>}
    {dead && <p className="mt-8 border-l-2 border-muted bg-surface px-4 py-4 text-sm leading-6 text-muted">Este pedido está <strong className="text-foreground">{order.status === "cancelled" ? "cancelado" : order.status === "refunded" ? "reembolsado" : "devolvido"}</strong>. Se tens dúvidas, contacta a equipa.</p>}

    <section className="mt-8 border border-border bg-surface p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5 border-b border-border pb-5"><div><p className="text-xs uppercase tracking-widest text-muted">Número</p><p className="mt-1 font-display text-xl text-foreground">{order.order_number}</p></div><div><p className="text-xs uppercase tracking-widest text-muted">{isRequest ? "Estado do pedido" : "Estado do pagamento"}</p><p className={`mt-1 text-sm ${order.payment_status === "paid" ? "text-success" : "text-copper"}`}>{paymentLabel}</p></div></div>
      <ul className="divide-y divide-border">{receipt.items.map((item, index) => <li key={`${item.product_name}-${index}`} className="flex justify-between gap-4 py-4 text-sm"><span className="text-muted">{item.quantity} × {item.product_name}<span className="block text-xs">{item.variant_name}</span></span><span className="shrink-0 text-foreground">{euro(Number(item.line_total))}</span></li>)}</ul>
      <dl className="ml-auto mt-4 max-w-xs space-y-2 border-t border-border pt-4 text-sm"><div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{euro(Number(order.subtotal))}</dd></div>{Number(order.discount_total) > 0 && <div className="flex justify-between"><dt className="text-muted">Desconto</dt><dd>−{euro(Number(order.discount_total))}</dd></div>}<div className="flex justify-between"><dt className="text-muted">Portes</dt><dd>{euro(Number(order.shipping_total))}</dd></div><div className="flex justify-between border-t border-border pt-3 font-medium"><dt className="text-muted">Total com IVA</dt><dd>{euro(Number(order.total))}</dd></div></dl>
    </section>

    {/* Histórico detalhado (clientes registados) */}
    {history.length > 1 && <section className="mt-8 border border-border bg-surface p-5 sm:p-7">
      <h2 className="font-display text-xs uppercase tracking-[0.24em] text-copper">Atualizações</h2>
      <ul className="mt-4 divide-y divide-border">{history.map((entry, index) => <li key={`${entry.status}-${index}`} className="py-3 text-sm"><p className="flex flex-wrap items-baseline justify-between gap-2"><span className="font-display text-xs uppercase tracking-[0.18em] text-foreground">{entry.status.replaceAll("_", " ")}</span><span className="text-xs text-muted">{new Date(entry.created_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" })}</span></p>{entry.note && <p className="mt-1 text-xs leading-5 text-muted">{entry.note}</p>}</li>)}</ul>
    </section>}

    <div className="mt-7 flex flex-wrap gap-3"><Link href="/loja" className="bg-copper px-6 py-3 font-display text-xs uppercase tracking-widest text-black">Voltar à loja</Link><Link href="/conta/encomendas" className="border border-border px-6 py-3 font-display text-xs uppercase tracking-widest text-foreground">As minhas encomendas</Link></div>
  </div>;
}
