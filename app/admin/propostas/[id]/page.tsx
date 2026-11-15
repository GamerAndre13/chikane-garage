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

// Extra do catálogo pronta a juntar à proposta (já com a variante mais barata).
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
  const [legalization, setLegalization] = useState("");
  const [extrasList, setExtrasList] = useState<ExtraItem[]>([]);
  const [catalogExtras, setCatalogExtras] = useState<CatalogExtra[]>([]);
  const [extraToAdd, setExtraToAdd] = useState("");
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
      const legalizationValue = data.legalization_fee != null ? Number(data.legalization_fee) : 0;
      const finalPrice =
        data.final_price != null
          ? Number(data.final_price)
          : totalPrice != null
            ? Math.max(0, totalPrice - discountValue + legalizationValue)
            : null;

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
      setLegalization(data.legalization_fee ? String(data.legalization_fee) : "");
      setExtrasList(extras);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Catálogo de extras ativos — para acrescentar ou trocar extras na proposta.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: catalog }, { data: variants }] = await Promise.all([
        supabase.from("vehicle_extra_catalog").select("id, name, price, position").eq("is_active", true).order("position"),
        supabase.from("vehicle_extra_variants").select("extra_id, name, price, position, is_active").eq("is_active", true),
      ]);
      if (cancelled) return;
      const lista = (catalog ?? []).map((item) => {
        const variante = cheapestVariantFor(item.id, (variants ?? []) as ExtraVariantSummary[]);
        return {
          extra_id: item.id,
          variant_id: variante?.id ?? null,
          name: item.name,
          variant_name: variante?.name ?? null,
          price: variante ? Number(variante.price) || 0 : Number(item.price) || 0,
        } satisfies CatalogExtra;
      });
      setCatalogExtras(lista);
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
  const totalPrice = basePrice != null ? basePrice + extrasTotal : null;
  const finalPrice =
    totalPrice != null ? Math.max(0, totalPrice - discountValue + legalizationValue) : null;

  // Validação do desconto: número >= 0 e nunca superior ao total da proposta.
  const validarDesconto = (valor: string): string | null => {
    const msg = validarNumero(valor, { rotulo: "O desconto", min: 0, obrigatorio: false });
    if (msg) return msg;
    const numero = Number(valor.replace(",", ".")) || 0;
    if (totalPrice != null && numero > totalPrice) return "O desconto não pode ser superior ao total da proposta.";
    return null;
  };

  const validarLegalizacao = (valor: string): string | null =>
    validarNumero(valor, { rotulo: "A legalização", min: 0, obrigatorio: false });

  // Acrescenta um extra do catálogo (evita duplicados).
  const adicionarExtra = () => {
    const escolhido = catalogExtras.find((item) => item.extra_id === extraToAdd);
    if (!escolhido) return;
    setExtrasList((prev) =>
      prev.some((extra) => (extra.extra_id ?? extra.catalog_extra_id) === escolhido.extra_id)
        ? prev
        : [...prev, { ...escolhido }]
    );
    setExtraToAdd("");
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
                <div className="space-y-1">
                  {extrasList.map((ex, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3">
                      <span style={{ color: "var(--foreground)" }}>
                        {ex.name}
                        {ex.variant_name ? ` - ${ex.variant_name}` : ""}
                      </span>
                      <span className="flex items-center gap-2">
                        <span style={{ color: "var(--foreground)" }}>{euroFmt(Number(ex.price) || 0)}</span>
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
                  ))}
                </div>
              ) : (
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  Sem extras selecionados.
                </p>
              )}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <select
                  value={extraToAdd}
                  onChange={(e) => setExtraToAdd(e.target.value)}
                  aria-label="Extra a adicionar"
                  className="min-w-0 flex-1 rounded border bg-background px-3 py-2 text-sm"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                >
                  <option value="">Escolher extra…</option>
                  {extrasDisponiveis.map((item) => (
                    <option key={item.extra_id} value={item.extra_id}>
                      {item.name}
                      {item.variant_name ? ` - ${item.variant_name}` : ""} · {euroFmt(item.price)}
                    </option>
                  ))}
                </select>
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
                <span style={{ color: "var(--muted)" }}>Desconto</span>
                <span style={{ color: "#22c55e" }}>− {euroFmt(discountValue)}</span>
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
        <div className="grid gap-4 sm:grid-cols-3">
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
