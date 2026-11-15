"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { validarNumero } from "@/lib/validacao";
import { FieldError, campoClasse } from "@/components/ui/field-error";
import { useDialogs } from "@/components/ui/dialogs";
import { useToast } from "@/components/ui/toast";
import { cheapestVariantFor, type ExtraVariantSummary } from "@/lib/extra-variants";
import {
  calcularTotaisProposta,
  DISCOUNT_SCOPE_LABELS,
  DISCOUNT_SCOPE_OPTIONS,
  limiteDesconto,
  normalizarAmbito,
  type DiscountScope,
} from "@/lib/proposal-pricing";

interface ExtraItem {
  extra_id?: string;
  catalog_extra_id?: string;
  variant_id?: string | null;
  name?: string;
  variant_name?: string | null;
  price?: number;
}

interface Proposal {
  id: string;
  vehicle_id: string | null;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  nif: string;
  base_price: number | null;
  extras_total: number | null;
  total_price: number | null;
  discount: number | null;
  discount_scope: string | null;
  legalization_fee: number | null;
  final_price: number | null;
  selected_extras: ExtraItem[] | null;
  message: string | null;
  status: string;
  admin_notes: string | null;
  final_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

// Extra do catálogo pronta a juntar à proposta.
// A variante escolhida (quando o extra tem variantes) é a que define o preço.
interface CatalogExtra {
  extra_id: string;
  variant_id: string | null;
  name: string;
  variant_name: string | null;
  price: number;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendente" },
  { value: "contacted", label: "Contactado" },
  { value: "in_progress", label: "Em negociação" },
  { value: "proposal_sent", label: "Proposta final enviada" },
  { value: "closed_won", label: "Fechado - Ganho" },
  { value: "closed_lost", label: "Fechado - Perdido" },
];

const euroFmt = (value: number) => `${Number(value).toLocaleString("pt-PT")} €`;

interface ProposalVehicle {
  brand: string | null;
  model: string | null;
  trim: string | null;
  slug: string;
  registration_year: number | null;
  price: number | null;
}

export default function PropostaDetalhe() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [vehicle, setVehicle] = useState<ProposalVehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [discount, setDiscount] = useState("");
  const [discountScope, setDiscountScope] = useState<DiscountScope>("total");
  const [legalization, setLegalization] = useState("");
  const [extrasList, setExtrasList] = useState<ExtraItem[]>([]);
  const [catalogExtras, setCatalogExtras] = useState<CatalogExtra[]>([]);
  // Variantes ativas de cada extra do catálogo (para escolher ao adicionar e
  // para trocar a variante de um extra já na proposta).
  const [variantsByExtra, setVariantsByExtra] = useState<Record<string, ExtraVariantSummary[]>>({});
  // Preço base de cada extra (usado quando se escolhe "Sem variante").
  const [basePrices, setBasePrices] = useState<Record<string, number>>({});
  const [extraToAdd, setExtraToAdd] = useState("");
  const [extraVariantToAdd, setExtraVariantToAdd] = useState("");
  const [sendingFinal, setSendingFinal] = useState(false);
  const { mostrarErro, confirmar } = useDialogs();
  const { toast } = useToast();
  // Erro do campo do desconto (itens 13/14), validado ao sair do campo.
  const [erroDesconto, setErroDesconto] = useState<string | null>(null);
  // Erro do valor da legalização, validado ao sair do campo.
  const [erroLegalizacao, setErroLegalizacao] = useState<string | null>(null);
  // Campos que vinham vazios e foram calculados aqui (viatura + extras).
  const [autoFilled, setAutoFilled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("sale_proposals").select("*").eq("id", id).single();
      if (cancelled || !data) {
        if (!cancelled) setLoading(false);
        return;
      }

      // Viatura primeiro: o preço dela é a base do preenchimento automático.
      let vehicleData: ProposalVehicle | null = null;
      if (data.vehicle_id) {
        const { data: v } = await supabase
          .from("vehicles")
          .select("brand, model, trim, slug, registration_year, price")
          .eq("id", data.vehicle_id)
          .maybeSingle();
        vehicleData = (v as ProposalVehicle | null) ?? null;
      }
      if (cancelled) return;

      // Preenchimento automático: o que veio vazio é calculado a partir do
      // preço da viatura e dos extras que o cliente escolheu no configurador.
      const extras = Array.isArray(data.selected_extras) ? (data.selected_extras as ExtraItem[]) : [];
      const extrasTotal =
        data.extras_total != null
          ? Number(data.extras_total)
          : extras.reduce((sum, extra) => sum + (Number(extra.price) || 0), 0);
      const basePrice =
        data.base_price != null
          ? Number(data.base_price)
          : vehicleData?.price != null
            ? Number(vehicleData.price)
            : null;
      const totalPrice =
        data.total_price != null
          ? Number(data.total_price)
          : basePrice != null
            ? basePrice + extrasTotal
            : null;
      const discountValue = data.discount != null ? Number(data.discount) : 0;
      const scope = normalizarAmbito(data.discount_scope);
      const legalizationValue = data.legalization_fee != null ? Number(data.legalization_fee) : 0;
      const totals = calcularTotaisProposta({
        basePrice,
        extrasTotal,
        discount: discountValue,
        legalization: legalizationValue,
        scope,
      });
      const finalPrice = data.final_price != null ? Number(data.final_price) : totals.finalPrice;

      setProposal({
        ...(data as Proposal),
        base_price: basePrice,
        extras_total: extrasTotal,
        total_price: totalPrice,
        final_price: finalPrice,
      });
      setVehicle(vehicleData);
      setAutoFilled(
        data.base_price == null || data.extras_total == null || data.total_price == null || data.final_price == null
      );
      setStatus(data.status || "pending");
      setAdminNotes(data.admin_notes || "");
      setDiscount(data.discount ? String(data.discount) : "");
      setDiscountScope(scope);
      setLegalization(data.legalization_fee ? String(data.legalization_fee) : "");
      setExtrasList(extras);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Catálogo de extras ativos — para acrescentar ou trocar extras na proposta.
  // Cada extra guarda a variante mais barata como sugestão; as restantes variantes
  // ficam disponíveis no seletor.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: catalog }, { data: variants }] = await Promise.all([
        supabase.from("vehicle_extra_catalog").select("id, name, price, position").eq("is_active", true).order("position"),
        supabase
          .from("vehicle_extra_variants")
          .select("id, extra_id, name, price, position, is_active")
          .eq("is_active", true)
          .order("position"),
      ]);
      if (cancelled) return;
      const variantes = (variants ?? []) as ExtraVariantSummary[];
      const mapa: Record<string, ExtraVariantSummary[]> = {};
      for (const variante of variantes) {
        (mapa[variante.extra_id] ||= []).push(variante);
      }
      const precos: Record<string, number> = {};
      for (const item of catalog ?? []) {
        precos[item.id] = Number(item.price) || 0;
      }
      const lista = (catalog ?? []).map((item) => {
        const variante = cheapestVariantFor(item.id, variantes);
        return {
          extra_id: item.id,
          variant_id: variante?.id ?? null,
          name: item.name,
          variant_name: variante?.name ?? null,
          price: variante ? Number(variante.price) || 0 : Number(item.price) || 0,
        } satisfies CatalogExtra;
      });
      setCatalogExtras(lista);
      setVariantsByExtra(mapa);
      setBasePrices(precos);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Desconto e legalização em euros definidos pelo backoffice (0 = sem valor).
  const discountValue = Math.max(0, Number(discount.replace(",", ".")) || 0);
  const legalizationValue = Math.max(0, Number(legalization.replace(",", ".")) || 0);
  // Extras e totais são sempre recalculados a partir da lista editável.
  const basePrice = proposal?.base_price != null ? Number(proposal.base_price) : null;
  const extrasTotal = extrasList.reduce((sum, extra) => sum + (Number(extra.price) || 0), 0);
  const totals = calcularTotaisProposta({
    basePrice,
    extrasTotal,
    discount: discountValue,
    legalization: legalizationValue,
    scope: discountScope,
  });
  const totalPrice = totals.totalPrice;
  const finalPrice = totals.finalPrice;
  // Variantes do extra escolhido no seletor de "adicionar extra".
  const variantesDoExtraEscolhido = extraToAdd ? variantsByExtra[extraToAdd] ?? [] : [];

  // Validação do desconto: número >= 0 e nunca superior ao valor onde incide
  // (total, extras ou viatura, conforme o âmbito escolhido).
  const validarDesconto = (valor: string, scope: DiscountScope = discountScope): string | null => {
    const msg = validarNumero(valor, { rotulo: "O desconto", min: 0, obrigatorio: false });
    if (msg) return msg;
    const numero = Number(valor.replace(",", ".")) || 0;
    const limite = limiteDesconto({ basePrice, extrasTotal, scope });
    if (limite != null && numero > limite) {
      const onde = scope === "extras" ? "o total dos extras" : scope === "vehicle" ? "o preço da viatura" : "o total da proposta";
      return `O desconto não pode ser superior a ${onde}.`;
    }
    return null;
  };

  const validarLegalizacao = (valor: string): string | null =>
    validarNumero(valor, { rotulo: "A legalização", min: 0, obrigatorio: false });

  // Acrescenta um extra do catálogo (evita duplicados), com a variante
  // escolhida no seletor (ou sem variante, se assim ficou).
  const adicionarExtra = () => {
    const escolhido = catalogExtras.find((item) => item.extra_id === extraToAdd);
    if (!escolhido) return;
    const variantes = variantsByExtra[escolhido.extra_id] ?? [];
    const variante = extraVariantToAdd ? variantes.find((item) => item.id === extraVariantToAdd) ?? null : null;
    const novo: ExtraItem = {
      extra_id: escolhido.extra_id,
      variant_id: variante?.id ?? null,
      name: escolhido.name,
      variant_name: variante?.name ?? null,
      price: variante ? Number(variante.price) || 0 : basePrices[escolhido.extra_id] ?? escolhido.price,
    };
    setExtrasList((prev) =>
      prev.some((extra) => (extra.extra_id ?? extra.catalog_extra_id) === novo.extra_id) ? prev : [...prev, novo]
    );
    setExtraToAdd("");
    setExtraVariantToAdd("");
  };

  // Troca a variante de um extra que já está na proposta (e o respetivo preço).
  const alterarVarianteDoExtra = (indice: number, variantId: string) => {
    setExtrasList((prev) =>
      prev.map((extra, i) => {
        if (i !== indice) return extra;
        const extraId = extra.extra_id ?? extra.catalog_extra_id ?? "";
        const variante = (variantsByExtra[extraId] ?? []).find((item) => item.id === variantId);
        return {
          ...extra,
          variant_id: variante?.id ?? null,
          variant_name: variante?.name ?? null,
          // Sem variante escolhida volta o preço base do extra.
          price: variante ? Number(variante.price) || 0 : basePrices[extraId] ?? extra.price,
        };
      })
    );
  };

  const removerExtra = (indice: number) => {
    setExtrasList((prev) => prev.filter((_, i) => i !== indice));
  };

  // Grava a proposta com os extras, o desconto, a legalização e o total final.
  const handleSave = async (): Promise<boolean> => {
    if (!proposal) return false;
    const erroD = validarDesconto(discount);
    const erroL = validarLegalizacao(legalization);
    setErroDesconto(erroD);
    setErroLegalizacao(erroL);
    if (erroD || erroL) return false;
    setSaving(true);
    const { error } = await supabase
      .from("sale_proposals")
      .update({
        status,
        admin_notes: adminNotes,
        // Os valores automáticos também ficam gravados (útil nas propostas
        // antigas que só tinham o total em branco).
        base_price: basePrice,
        selected_extras: extrasList,
        extras_total: extrasTotal,
        total_price: totalPrice,
        discount: discountValue,
        discount_scope: discountScope,
        legalization_fee: legalizationValue,
        final_price: finalPrice,
      })
      .eq("id", proposal.id);
    if (error) {
      mostrarErro({ titulo: "Não foi possível guardar", mensagem: error.message });
      setSaving(false);
      return false;
    }
    setProposal({
      ...proposal,
      status,
      admin_notes: adminNotes,
      selected_extras: extrasList,
      extras_total: extrasTotal,
      total_price: totalPrice,
      discount: discountValue,
      discount_scope: discountScope,
      legalization_fee: legalizationValue,
      final_price: finalPrice,
    });
    setAutoFilled(false);
    toast({ variant: "success", title: "Proposta guardada" });
    router.refresh();
    setSaving(false);
    return true;
  };

  // Enviar proposta final: grava primeiro, envia o email e só depois marca o
  // estado como "enviada" (a rota faz o mesmo do lado do servidor).
  const handleEnviarFinal = async () => {
    if (!proposal) return;
    const ok = await confirmar({
      titulo: "Enviar proposta final",
      mensagem: `Enviar a proposta final${finalPrice != null ? ` de ${euroFmt(finalPrice)}` : ""} para ${proposal.email}? O cliente recebe o resumo com o link para a compra.`,
      confirmar: "Enviar proposta",
      cancelar: "Cancelar",
    });
    if (!ok) return;
    const guardado = await handleSave();
    if (!guardado) return;
    setSendingFinal(true);
    try {
      const resposta = await fetch("/api/admin/proposal-final", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposal_id: proposal.id }),
      });
      const dados = (await resposta.json().catch(() => ({}))) as { error?: string };
      if (!resposta.ok) {
        mostrarErro({
          titulo: "Proposta não enviada",
          mensagem: dados.error || "Não foi possível enviar a proposta final.",
        });
        return;
      }
      const enviadoEm = new Date().toISOString();
      setStatus("proposal_sent");
      setProposal((prev) =>
        prev ? { ...prev, status: "proposal_sent", final_sent_at: enviadoEm, final_price: finalPrice } : prev
      );
      toast({
        variant: "success",
        title: "Proposta final enviada",
        description: `Email enviado para ${proposal.email}.`,
      });
    } catch {
      mostrarErro({
        titulo: "Proposta não enviada",
        mensagem: "Falha de rede ao enviar a proposta final. Tenta novamente.",
      });
    } finally {
      setSendingFinal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: "var(--muted)" }}>A carregar...</p>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div>
        <p style={{ color: "var(--muted)" }}>Proposta não encontrada</p>
        <Link href="/admin/propostas" className="text-sm" style={{ color: "var(--copper-deep)" }}>
          Voltar
        </Link>
      </div>
    );
  }

  const date = new Date(proposal.created_at).toLocaleString("pt-PT");
  const enviadaEm = proposal.final_sent_at
    ? new Date(proposal.final_sent_at).toLocaleString("pt-PT")
    : null;
  // Extras do catálogo que ainda não estão na proposta (para o seletor).
  const extrasDisponiveis = catalogExtras.filter(
    (item) => !extrasList.some((extra) => (extra.extra_id ?? extra.catalog_extra_id) === item.extra_id)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl uppercase tracking-wide" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>
            Proposta #{proposal.id.slice(0, 8)}
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Criada a {date}
          </p>
        </div>
        <Link href="/admin/propostas" className="text-sm" style={{ color: "var(--muted)" }}>
          ← Voltar à lista
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="border rounded p-5" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--copper-deep)" }}>
            Dados do cliente
          </p>
          <div className="grid gap-3 text-sm">
            <div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Nome
              </p>
              <p style={{ color: "var(--foreground)" }}>{proposal.name}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Email
              </p>
              <p style={{ color: "var(--foreground)" }}>{proposal.email}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Telefone
              </p>
              <p style={{ color: "var(--foreground)" }}>{proposal.phone || "-"}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                NIF
              </p>
              <p style={{ color: "var(--foreground)" }}>{proposal.nif}</p>
            </div>
            {proposal.message && (
              <div>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  Mensagem
                </p>
                <p className="whitespace-pre-wrap" style={{ color: "var(--foreground)" }}>
                  {proposal.message}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="border rounded p-5" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--copper-deep)" }}>
            Viatura configurada
          </p>
          {autoFilled && (
            <p className="mb-3 rounded px-3 py-2 text-[11px] leading-5" style={{ backgroundColor: "var(--background-alt)", color: "var(--muted)" }}>
              Os valores em branco foram preenchidos automaticamente com o preço da viatura e os extras escolhidos. Guarda a proposta para fixar estes números.
            </p>
          )}
          {vehicle ? (
            <div className="mb-4">
              <p style={{ color: "var(--foreground)" }}>
                {vehicle.brand} {vehicle.model} {vehicle.trim || ""}
              </p>
              {vehicle.registration_year && (
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  {vehicle.registration_year}
                </p>
              )}
              {vehicle.slug && (
                <Link href={`/catalogo/${vehicle.slug}`} target="_blank" className="text-xs" style={{ color: "var(--copper-deep)" }}>
                  Ver ficha pública
                </Link>
              )}
            </div>
          ) : (
            <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
              Viatura não encontrada
            </p>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: "var(--muted)" }}>Preço base</span>
              <span style={{ color: "var(--foreground)" }}>{basePrice != null ? euroFmt(basePrice) : "-"}</span>
            </div>
            <div className="pt-2 border-t" style={{ borderColor: "var(--border)" }}>
              <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>
                Extras ({extrasList.length})
              </p>
              {extrasList.length > 0 ? (
                <div className="space-y-2">
                  {extrasList.map((ex, idx) => {
                    const extraId = ex.extra_id ?? ex.catalog_extra_id ?? "";
                    const variantes = variantsByExtra[extraId] ?? [];
                    return (
                      <div key={idx} className="flex flex-wrap items-center justify-between gap-2">
                        <span className="min-w-0 flex-1" style={{ color: "var(--foreground)" }}>
                          {ex.name}
                          {ex.variant_name && variantes.length === 0 ? ` - ${ex.variant_name}` : ""}
                        </span>
                        <span className="flex items-center gap-2">
                          {variantes.length > 0 && (
                            <select
                              value={ex.variant_id ?? ""}
                              onChange={(e) => alterarVarianteDoExtra(idx, e.target.value)}
                              aria-label={`Variante de ${ex.name || "extra"}`}
                              title="Variante do extra"
                              className="max-w-[190px] min-h-9 rounded border bg-background px-2 py-1 text-xs"
                              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                            >
                              <option value="">Sem variante</option>
                              {variantes.map((variante) => (
                                <option key={variante.id} value={variante.id}>
                                  {variante.name} · {euroFmt(Number(variante.price) || 0)}
                                </option>
                              ))}
                            </select>
                          )}
                          <span className="w-20 text-right" style={{ color: "var(--foreground)" }}>
                            {euroFmt(Number(ex.price) || 0)}
                          </span>
                          <button
                            type="button"
                            onClick={() => removerExtra(idx)}
                            aria-label={`Remover ${ex.name || "extra"}`}
                            title="Remover extra"
                            className="inline-flex h-7 w-7 items-center justify-center rounded border text-sm transition-colors"
                            style={{ borderColor: "var(--border)", color: "var(--red-light)" }}
                          >
                            ×
                          </button>
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  Sem extras selecionados.
                </p>
              )}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <select
                  value={extraToAdd}
                  onChange={(e) => {
                    const extraId = e.target.value;
                    setExtraToAdd(extraId);
                    // Sugere logo a variante mais barata (ou nenhuma).
                    const variantes = variantsByExtra[extraId] ?? [];
                    setExtraVariantToAdd(cheapestVariantFor(extraId, variantes)?.id ?? "");
                  }}
                  aria-label="Extra a adicionar"
                  className="min-w-0 flex-1 rounded border bg-background px-3 py-2 text-sm"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                >
                  <option value="">Escolher extra…</option>
                  {extrasDisponiveis.map((item) => (
                    <option key={item.extra_id} value={item.extra_id}>
                      {item.name} · a partir de {euroFmt(item.price)}
                    </option>
                  ))}
                </select>
                {variantesDoExtraEscolhido.length > 0 && (
                  <select
                    value={extraVariantToAdd}
                    onChange={(e) => setExtraVariantToAdd(e.target.value)}
                    aria-label="Variante do extra a adicionar"
                    className="min-w-0 flex-1 rounded border bg-background px-3 py-2 text-sm"
                    style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                  >
                    <option value="">Sem variante</option>
                    {variantesDoExtraEscolhido.map((variante) => (
                      <option key={variante.id} value={variante.id}>
                        {variante.name} · {euroFmt(Number(variante.price) || 0)}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={adicionarExtra}
                  disabled={!extraToAdd}
                  className="rounded border px-3 py-2 text-xs font-semibold uppercase tracking-widest transition-colors disabled:opacity-40"
                  style={{ borderColor: "var(--copper-deep)", color: "var(--copper-deep)" }}
                >
                  Adicionar
                </button>
              </div>
            </div>
            <div className="flex justify-between pt-2 border-t" style={{ borderColor: "var(--border)" }}>
              <span style={{ color: "var(--muted)" }}>Total extras</span>
              <span style={{ color: "var(--foreground)" }}>{euroFmt(extrasTotal)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t text-base" style={{ borderColor: "var(--border)" }}>
              <span style={{ color: "var(--muted)" }}>Total estimado</span>
              <span
                style={{
                  color: discountValue > 0 || legalizationValue > 0 ? "var(--muted)" : "var(--foreground)",
                  textDecoration: discountValue > 0 || legalizationValue > 0 ? "line-through" : "none",
                }}
              >
                {totalPrice != null ? euroFmt(totalPrice) : "-"}
              </span>
            </div>
            {discountValue > 0 && (
              <div className="flex justify-between">
                <span style={{ color: "var(--muted)" }}>Desconto · {DISCOUNT_SCOPE_LABELS[discountScope]}</span>
                <span style={{ color: "#22c55e" }}>− {euroFmt(totals.appliedDiscount)}</span>
              </div>
            )}
            {legalizationValue > 0 && (
              <div className="flex justify-between">
                <span style={{ color: "var(--muted)" }}>Legalização</span>
                <span style={{ color: "var(--foreground)" }}>+ {euroFmt(legalizationValue)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t text-base" style={{ borderColor: "var(--border)" }}>
              <span style={{ color: "var(--foreground)" }}>Total da proposta</span>
              <span style={{ color: "var(--copper-deep)" }}>{finalPrice != null ? euroFmt(finalPrice) : "-"}</span>
            </div>
            {enviadaEm && (
              <p className="pt-1 text-xs" style={{ color: "var(--muted)" }}>
                Proposta final enviada a {enviadaEm}.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 border rounded p-5" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
        <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--copper-deep)" }}>
          Gestão da proposta
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-xs uppercase tracking-widest mb-1 block" style={{ color: "var(--muted)" }}>
              Estado
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded bg-background"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="proposta-desconto-ambito" className="text-xs uppercase tracking-widest mb-1 block" style={{ color: "var(--muted)" }}>
              Desconto incide em
            </label>
            <select
              id="proposta-desconto-ambito"
              value={discountScope}
              onChange={(e) => {
                const novo = normalizarAmbito(e.target.value);
                setDiscountScope(novo);
                // Revalida o valor já escrito para o novo âmbito.
                if (discount) setErroDesconto(validarDesconto(discount, novo));
              }}
              className="w-full px-3 py-2 text-sm border rounded bg-background"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              {DISCOUNT_SCOPE_OPTIONS.map((scope) => (
                <option key={scope} value={scope}>
                  {DISCOUNT_SCOPE_LABELS[scope]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="proposta-desconto" className="text-xs uppercase tracking-widest mb-1 block" style={{ color: "var(--muted)" }}>
              Desconto (€)
            </label>
            <input
              id="proposta-desconto"
              inputMode="decimal"
              value={discount}
              aria-invalid={Boolean(erroDesconto)}
              onBlur={(e) => setErroDesconto(validarDesconto(e.target.value))}
              onChange={(e) => {
                const valor = e.target.value.replace(/[^\d.,]/g, "");
                setDiscount(valor);
                // Depois de marcado, revalida enquanto escreve.
                if (erroDesconto) setErroDesconto(validarDesconto(valor));
              }}
              placeholder="0"
              className={campoClasse("w-full px-3 py-2 text-sm border rounded bg-background", erroDesconto)}
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            />
            <FieldError message={erroDesconto} />
          </div>
          <div>
            <label htmlFor="proposta-legalizacao" className="text-xs uppercase tracking-widest mb-1 block" style={{ color: "var(--muted)" }}>
              Legalização (€)
            </label>
            <input
              id="proposta-legalizacao"
              inputMode="decimal"
              value={legalization}
              aria-invalid={Boolean(erroLegalizacao)}
              onBlur={(e) => setErroLegalizacao(validarLegalizacao(e.target.value))}
              onChange={(e) => {
                const valor = e.target.value.replace(/[^\d.,]/g, "");
                setLegalization(valor);
                if (erroLegalizacao) setErroLegalizacao(validarLegalizacao(valor));
              }}
              placeholder="0"
              className={campoClasse("w-full px-3 py-2 text-sm border rounded bg-background", erroLegalizacao)}
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            />
            <FieldError message={erroLegalizacao} />
          </div>
        </div>
        <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
          Total final da proposta:{" "}
          <strong style={{ color: "var(--copper-deep)" }}>{finalPrice != null ? euroFmt(finalPrice) : "-"}</strong>
        </p>
        <div className="mt-4">
          <label className="text-xs uppercase tracking-widest mb-1 block" style={{ color: "var(--muted)" }}>
            Notas internas
          </label>
          <textarea
            rows={6}
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded bg-background"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            placeholder="Notas para a equipa..."
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || sendingFinal}
            className="px-4 py-2 rounded text-sm font-medium"
            style={{ backgroundColor: "var(--copper-deep)", color: "var(--background-alt)", opacity: saving || sendingFinal ? 0.6 : 1 }}
          >
            {saving ? "A guardar..." : "Guardar alterações"}
          </button>
          <button
            type="button"
            onClick={handleEnviarFinal}
            disabled={saving || sendingFinal || finalPrice == null}
            title={finalPrice == null ? "Falta o preço base da viatura para calcular o total." : undefined}
            className="px-4 py-2 rounded border text-sm font-semibold uppercase tracking-widest transition-colors disabled:opacity-50"
            style={{ borderColor: "var(--copper-deep)", color: "var(--copper-deep)" }}
          >
            {sendingFinal ? "A enviar..." : "Enviar proposta final"}
          </button>
          {enviadaEm && (
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              Enviada a {enviadaEm}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
