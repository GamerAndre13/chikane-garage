// Etiquetas de estado no formato Shopify (pastilhas com ponto) partilhadas
// entre as listas e as fichas de artigos/encomendas do backoffice.

type Tone = "green" | "amber" | "red" | "gray" | "copper";

const toneClass: Record<Tone, string> = {
  green: "border-success/40 bg-success/10 text-success",
  amber: "border-warning/40 bg-warning/10 text-warning",
  red: "border-red/40 bg-red/10 text-red-light",
  gray: "border-border bg-surface-mid text-silver",
  copper: "border-copper/50 bg-copper/10 text-copper",
};

export function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap border px-2 py-1 font-display text-[10px] uppercase tracking-widest ${toneClass[tone]}`}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

const paymentTone: Record<string, Tone> = { pending: "amber", paid: "green", failed: "red", refunded: "red", partially_refunded: "amber" };
const paymentLabel: Record<string, string> = { pending: "Por pagar", paid: "Paga", failed: "Falhada", refunded: "Reembolsada", partially_refunded: "Reembolso parcial" };

// Estado do pagamento da encomenda (payment_status).
export function PaymentBadge({ status }: { status?: string | null }) {
  const key = status ?? "pending";
  return <Badge tone={paymentTone[key] ?? "gray"}>{paymentLabel[key] ?? "Por pagar"}</Badge>;
}

const fulfillmentTone: Record<string, Tone> = {
  pending_payment: "gray", paid: "gray", preparing: "copper", shipped: "amber",
  delivered: "green", cancelled: "gray", refunded: "red", returned: "red",
};
const fulfillmentLabel: Record<string, string> = {
  pending_payment: "Por preparar", paid: "Por preparar", preparing: "Em preparação", shipped: "Enviada",
  delivered: "Entregue", cancelled: "Cancelada", refunded: "Reembolsada", returned: "Devolvida",
};

// Percurso da encomenda (status) — o lado da entrega/preparação.
export function FulfillmentBadge({ status }: { status?: string | null }) {
  const key = status ?? "pending_payment";
  return <Badge tone={fulfillmentTone[key] ?? "gray"}>{fulfillmentLabel[key] ?? "Por preparar"}</Badge>;
}

const productStatusTone: Record<string, Tone> = { active: "green", draft: "gray", archived: "gray" };
const productStatusLabel: Record<string, string> = { active: "Ativo", draft: "Rascunho", archived: "Arquivado" };

export function ProductStatusBadge({ status }: { status?: string | null }) {
  const key = status ?? "active";
  return <Badge tone={productStatusTone[key] ?? "gray"}>{productStatusLabel[key] ?? "Ativo"}</Badge>;
}

// Tipo de artigo: peça (serve viaturas) ou produto avulso da loja.
export function KindBadge({ kind }: { kind?: string | null }) {
  return kind === "part" ? <Badge tone="copper">Peça</Badge> : <Badge tone="gray">Produto</Badge>;
}
