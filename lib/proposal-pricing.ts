// ── Cálculo dos valores da proposta ────────────────────────────────────────
// A proposta final é base + extras − desconto + legalização. O desconto pode
// incidir no total, só nos extras ou só na viatura (sale_proposals.
// discount_scope — supabase/036_ambito_desconto.sql).
// O backoffice e o email da proposta final têm de chegar ao mesmo número, por
// isso o cálculo vive aqui.

export type DiscountScope = "total" | "extras" | "vehicle";

export const DISCOUNT_SCOPE_LABELS: Record<DiscountScope, string> = {
  total: "Total da proposta",
  extras: "Apenas nos extras",
  vehicle: "Apenas na viatura",
};

export const DISCOUNT_SCOPE_OPTIONS: DiscountScope[] = ["total", "extras", "vehicle"];

export function normalizarAmbito(valor: string | null | undefined): DiscountScope {
  return valor === "extras" || valor === "vehicle" ? valor : "total";
}

export type ProposalTotals = {
  /** Preço base + extras (sem desconto nem legalização). */
  totalPrice: number | null;
  /** Valor a pagar: base + extras − desconto (no âmbito escolhido) + legalização. */
  finalPrice: number | null;
  /** Desconto efetivamente aplicado (nunca maior do que o valor onde incide). */
  appliedDiscount: number;
};

/**
 * Calcula os totais da proposta.
 *
 * - total   → max(0, base + extras − d) + legalização
 * - extras  → base + max(0, extras − d) + legalização
 * - vehicle → max(0, base − d) + extras + legalização
 *
 * Com `basePrice` nulo não há total possível (devolve nulls), tal como antes.
 */
export function calcularTotaisProposta(input: {
  basePrice: number | null;
  extrasTotal: number;
  discount: number;
  legalization: number;
  scope: DiscountScope;
}): ProposalTotals {
  const base = input.basePrice;
  const extras = Math.max(0, Number(input.extrasTotal) || 0);
  const desconto = Math.max(0, Number(input.discount) || 0);
  const legalizacao = Math.max(0, Number(input.legalization) || 0);

  if (base == null) {
    return { totalPrice: null, finalPrice: null, appliedDiscount: 0 };
  }

  const totalPrice = base + extras;

  if (input.scope === "extras") {
    const aplicado = Math.min(desconto, extras);
    return { totalPrice, finalPrice: base + (extras - aplicado) + legalizacao, appliedDiscount: aplicado };
  }

  if (input.scope === "vehicle") {
    const aplicado = Math.min(desconto, Math.max(0, base));
    return { totalPrice, finalPrice: Math.max(0, base - aplicado) + extras + legalizacao, appliedDiscount: aplicado };
  }

  const aplicado = Math.min(desconto, totalPrice);
  return { totalPrice, finalPrice: Math.max(0, totalPrice - aplicado) + legalizacao, appliedDiscount: aplicado };
}

/** Valor máximo aceite para o desconto, conforme o âmbito. */
export function limiteDesconto(input: {
  basePrice: number | null;
  extrasTotal: number;
  scope: DiscountScope;
}): number | null {
  if (input.basePrice == null) return null;
  const extras = Math.max(0, Number(input.extrasTotal) || 0);
  if (input.scope === "extras") return extras;
  if (input.scope === "vehicle") return Math.max(0, input.basePrice);
  return input.basePrice + extras;
}
