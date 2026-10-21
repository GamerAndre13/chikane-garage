import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { euro } from "@/lib/shop";
import { PaymentBadge, FulfillmentBadge } from "@/app/admin/loja/badges";

const ENTREGAR = ["pending_payment", "paid", "preparing"];
const FECHADAS = ["delivered", "cancelled", "refunded", "returned"];

// Lista de encomendas no formato Shopify: abas com contagens (Todas / Por
// entregar / Por pagar / Fechadas), pesquisa, colunas de data, cliente, total
// e etiquetas coloridas de pagamento e entrega.
export default async function EncomendasLojaPage({ searchParams }: PageProps<"/admin/loja/encomendas">) {
  const { q, aba } = await searchParams;
  const term = String(q ?? "").trim().slice(0, 80);
  const safe = term.replace(/[%,()]/g, " ");
  const abaParam = String(aba ?? "");
  const abaAtual = ["por-entregar", "por-pagar", "fechadas"].includes(abaParam) ? abaParam : "";

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
  let query = supabase.from("orders").select("id,order_number,customer_name,customer_email,status,payment_status,total,created_at").order("created_at", { ascending: false }).limit(200);
  if (safe) query = query.or(search(safe));
  if (abaAtual === "por-entregar") query = query.in("status", ENTREGAR);
  if (abaAtual === "por-pagar") query = query.eq("payment_status", "pending");
  if (abaAtual === "fechadas") query = query.in("status", FECHADAS);
  const [{ data }, todas, porEntregar, porPagar, fechadas] = await Promise.all([
    query,
    countPromise(base()),
    countPromise(base().in("status", ENTREGAR)),
    countPromise(base().eq("payment_status", "pending")),
    countPromise(base().in("status", FECHADAS)),
  ]);
  const orders = (data ?? []) as unknown as { id: string; order_number: string; customer_name: string | null; customer_email: string | null; status: string; payment_status: string | null; total: number; created_at: string }[];

  const tabs = [
    { label: "Todas", value: "", count: todas },
    { label: "Por entregar", value: "por-entregar", count: porEntregar },
    { label: "Por pagar", value: "por-pagar", count: porPagar },
    { label: "Fechadas", value: "fechadas", count: fechadas },
  ];

  return (
    <section>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin/loja" className="font-display text-[10px] uppercase tracking-widest text-copper">← Loja</Link>
          <h1 className="mt-3 font-display text-3xl font-bold uppercase">Encomendas</h1>
        </div>
        <a href="/api/admin/shop/orders/export" className="border border-border px-5 py-3 font-display text-xs uppercase tracking-widest text-muted hover:border-copper hover:text-copper">Exportar CSV</a>
      </header>

      <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
        <nav className="flex gap-1 border-b border-border">
          {tabs.map((tab) => {
            const ativo = abaAtual === tab.value;
            return (
              <Link
                key={tab.value || "todas"}
                href={href({ aba: tab.value })}
                className={`-mb-px border-b-2 px-4 py-2.5 font-display text-xs uppercase tracking-widest transition-colors ${ativo ? "border-copper text-copper" : "border-transparent text-muted hover:text-foreground"}`}
              >
                {tab.label} <span className="ml-1 text-[10px] opacity-70">({tab.count})</span>
              </Link>
            );
          })}
        </nav>
        <form action="/admin/loja/encomendas" className="flex items-center gap-2">
          {abaAtual && <input type="hidden" name="aba" value={abaAtual} />}
          <input
            type="search"
            name="q"
            defaultValue={term}
            placeholder="Pesquisar nº, cliente ou email…"
            className="w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground sm:w-64"
          />
          <button type="submit" className="border border-border px-3 py-2.5 font-display text-[10px] uppercase tracking-widest text-muted hover:border-copper hover:text-copper">Pesquisar</button>
        </form>
      </div>

      {!orders.length ? (
        <p className="mt-8 border border-border p-8 text-center text-sm text-muted">
          {term || abaAtual ? <>Nenhuma encomenda corresponde a estes filtros — <Link href="/admin/loja/encomendas" className="text-copper underline">limpar filtros</Link>.</> : <>Ainda não há encomendas na loja.</>}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto border border-border bg-surface">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border font-display text-[10px] uppercase tracking-widest text-muted">
                <th className="px-4 py-3 text-left font-normal">Encomenda</th>
                <th className="px-4 py-3 text-left font-normal">Data</th>
                <th className="px-4 py-3 text-left font-normal">Cliente</th>
                <th className="px-4 py-3 text-right font-normal">Total</th>
                <th className="px-4 py-3 text-left font-normal">Pagamento</th>
                <th className="px-4 py-3 text-left font-normal">Entrega</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const data = new Date(order.created_at);
                return (
                  <tr key={order.id} className="border-b border-border/50 last:border-b-0 hover:bg-surface-mid/40">
                    <td className="px-4 py-3">
                      <Link href={`/admin/loja/encomendas/${order.id}`} className="font-medium text-foreground hover:text-copper">#{order.order_number}</Link>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {data.toLocaleDateString("pt-PT")} <span className="text-xs opacity-70">{data.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block truncate text-foreground">{order.customer_name || "—"}</span>
                      {order.customer_email && <span className="block truncate text-xs text-muted">{order.customer_email}</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">{euro(order.total)}</td>
                    <td className="px-4 py-3"><PaymentBadge status={order.payment_status} /></td>
                    <td className="px-4 py-3"><FulfillmentBadge status={order.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
