import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { euro } from "@/lib/shop";
import { PaymentBadge, FulfillmentBadge } from "@/app/admin/loja/badges";
import { PageHeader, Tabs, Table, THead, TBody, TH, TD, EmptyState } from "@/app/admin/loja/_ui";

const ENTREGAR = ["pending_payment", "paid", "preparing"];
const FECHADAS = ["delivered", "cancelled", "refunded", "returned"];

// Lista de encomendas com shell limpo: cabeçalho, abas por estado e tabela intuitiva.
export default async function EncomendasLojaPage({ searchParams }: { searchParams: Promise<{ q?: string; aba?: string }> }) {
  const { q, aba } = await searchParams;
  const term = String(q ?? "").trim().slice(0, 80);
  const safe = term.replace(/[%,()]/g, " ");
  const abaParam = String(aba ?? "");
  const abaAtual = ["por-aceitar", "por-entregar", "por-pagar", "fechadas"].includes(abaParam) ? abaParam : "";

  // Constrói a URL mantendo a pesquisa e a aba activas.
  const href = (patch: Record<string, string>) => {
    const next = { q: term, aba: abaAtual, ...patch };
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.aba) params.set("aba", next.aba);
    const s = params.toString();
    return s ? `?${s}` : "/admin/loja/encomendas";
  };

  const supabase = await createClient();
  const search = (term: string) => `order_number.ilike.%${term}%,customer_name.ilike.%${term}%,customer_email.ilike.%${term}%`;
  const base = () => {
    let builder = supabase.from("orders").select("id", { count: "exact", head: true });
    if (safe) builder = builder.or(search(safe));
    return builder;
  };
  const countPromise = async (builder: ReturnType<typeof base>) => {
    const { count } = await builder;
    return count ?? 0;
  };
  let query = supabase.from("orders").select("id,order_number,customer_name,customer_email,status,payment_status,payment_method,total,created_at").order("created_at", { ascending: false }).limit(200);
  if (safe) query = query.or(search(safe));
  if (abaAtual === "por-aceitar") query = query.is("payment_method", null).eq("status", "pending_payment");
  if (abaAtual === "por-entregar") query = query.in("status", ENTREGAR);
  if (abaAtual === "por-pagar") query = query.eq("payment_status", "pending");
  if (abaAtual === "fechadas") query = query.in("status", FECHADAS);
  const [{ data }, todas, porAceitar, porEntregar, porPagar, fechadas] = await Promise.all([
    query,
    countPromise(base()),
    countPromise(base().is("payment_method", null).eq("status", "pending_payment")),
    countPromise(base().in("status", ENTREGAR)),
    countPromise(base().eq("payment_status", "pending")),
    countPromise(base().in("status", FECHADAS)),
  ]);
  const orders = (data ?? []) as unknown as { id: string; order_number: string; customer_name: string | null; customer_email: string | null; status: string; payment_status: string | null; payment_method: string | null; total: number; created_at: string }[];

  const tabs = [
    { label: "Todas", value: "", href: href({ aba: "" }), count: todas },
    { label: "Por aceitar", value: "por-aceitar", href: href({ aba: "por-aceitar" }), count: porAceitar },
    { label: "Por entregar", value: "por-entregar", href: href({ aba: "por-entregar" }), count: porEntregar },
    { label: "Por pagar", value: "por-pagar", href: href({ aba: "por-pagar" }), count: porPagar },
    { label: "Fechadas", value: "fechadas", href: href({ aba: "fechadas" }), count: fechadas },
  ];

  return (
    <div>
      <PageHeader
        title="Encomendas"
        subtitle="Acompanhamento de encomendas da loja e pedidos de orçamento do configurador."
        backHref="/admin/loja"
        breadcrumbs={[{ label: "Loja", href: "/admin/loja" }]}
        actions={[{ label: "Exportar CSV", href: "/api/admin/shop/orders/export", variant: "secondary" }]}
      />

      <div className="border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <Tabs tabs={tabs} active={abaAtual} />
          <form action="/admin/loja/encomendas" className="flex items-center gap-2">
            {abaAtual && <input type="hidden" name="aba" value={abaAtual} />}
            <input
              type="search"
              name="q"
              defaultValue={term}
              placeholder="Pesquisar nº, cliente ou email…"
              className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground sm:w-72"
            />
            <button type="submit" className="border border-border px-3 py-2 font-display text-[10px] uppercase tracking-widest text-muted transition-colors hover:border-copper hover:text-copper">Pesquisar</button>
          </form>
        </div>

        {!orders.length ? (
          <div className="border-t border-border p-8">
            <EmptyState
              title={term || abaAtual ? "Sem resultados" : "Ainda não há encomendas"}
              description={term || abaAtual ? "Nenhuma encomenda corresponde aos filtros aplicados." : "As encomendas da loja e os pedidos do configurador aparecem aqui."}
              actionLabel={term || abaAtual ? "Limpar filtros" : undefined}
              actionHref={term || abaAtual ? "/admin/loja/encomendas" : undefined}
            />
          </div>
        ) : (
          <div className="border-t border-border">
            <Table>
              <THead>
                <tr>
                  <TH>Encomenda</TH>
                  <TH>Data</TH>
                  <TH>Cliente</TH>
                  <TH align="right">Total</TH>
                  <TH>Pagamento</TH>
                  <TH>Entrega</TH>
                </tr>
              </THead>
              <TBody>
                {orders.map((order) => {
                  const data = new Date(order.created_at);
                  return (
                    <tr key={order.id} className="group transition-colors hover:bg-surface-mid/40">
                      <TD>
                        <Link href={`/admin/loja/encomendas/${order.id}`} className="font-medium text-foreground transition-colors hover:text-copper">#{order.order_number}</Link>
                      </TD>
                      <TD className="text-muted">
                        {data.toLocaleDateString("pt-PT")} · {data.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                      </TD>
                      <TD>
                        <div className="min-w-0">
                          <span className="block truncate text-foreground">{order.customer_name || "—"}</span>
                          {order.customer_email && <span className="block truncate text-xs text-muted">{order.customer_email}</span>}
                        </div>
                      </TD>
                      <TD align="right" className="text-foreground">{euro(order.total)}</TD>
                      <TD><PaymentBadge status={order.payment_status} /></TD>
                      <TD><FulfillmentBadge status={order.status} paymentMethod={order.payment_method} /></TD>
                    </tr>
                  );
                })}
              </TBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
