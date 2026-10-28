"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

// Configurador de extras + pedido de proposta das viaturas novas.
// O cliente escolhe extras (e a variante de cada um), vê o total a atualizar
// em tempo real e envia os seus dados (com NIF obrigatório) para o backoffice.

export type ConfiguratorVariant = {
  id: string;
  name: string;
  price: number;
};

export type ConfiguratorExtra = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  variants: ConfiguratorVariant[];
};

type Props = {
  vehicleId: string;
  vehicleSlug: string;
  vehicleName: string;
  basePrice: number | null;
  extras: ConfiguratorExtra[];
};

// Escolha do cliente por extra: sem entrada = extra não selecionado.
type Selection = { variantId: string | null };

const euro = (value: number) => `${value.toLocaleString("pt-PT", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;

// Validação do NIF português (9 dígitos + dígito de controlo mod 11).
function isValidNif(raw: string): boolean {
  const nif = raw.replace(/\s+/g, "");
  if (!/^\d{9}$/.test(nif)) return false;
  const first = nif[0];
  if (!"1235689".includes(first)) return false;
  let sum = 0;
  for (let i = 0; i < 8; i += 1) sum += Number(nif[i]) * (9 - i);
  const check = 11 - (sum % 11);
  const digit = check >= 10 ? 0 : check;
  return digit === Number(nif[8]);
}

export function VehicleProposalConfigurator({ vehicleId, vehicleSlug, vehicleName, basePrice, extras }: Props) {
  const [selection, setSelection] = useState<Record<string, Selection>>({});
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", nif: "", message: "" });
  const dialogRef = useRef<HTMLDivElement>(null);

  const chosen = useMemo(() => {
    return extras.flatMap((extra) => {
      const picked = selection[extra.id];
      if (!picked) return [];
      const variant = picked.variantId ? extra.variants.find((item) => item.id === picked.variantId) : null;
      return [{
        extra_id: extra.id,
        name: extra.name,
        variant_id: variant?.id ?? null,
        variant_name: variant?.name ?? null,
        price: variant ? variant.price : extra.price,
      }];
    });
  }, [extras, selection]);

  const extrasTotal = useMemo(() => chosen.reduce((sum, item) => sum + (Number(item.price) || 0), 0), [chosen]);
  const base = Number(basePrice) || 0;
  const total = base + extrasTotal;

  const toggleExtra = useCallback((extra: ConfiguratorExtra) => {
    setSelection((prev) => {
      if (prev[extra.id]) {
        const next = { ...prev };
        delete next[extra.id];
        return next;
      }
      // Com variantes, a primeira é a pré-seleção.
      return { ...prev, [extra.id]: { variantId: extra.variants[0]?.id ?? null } };
    });
  }, []);

  const pickVariant = useCallback((extraId: string, variantId: string | null) => {
    setSelection((prev) => (prev[extraId] ? { ...prev, [extraId]: { variantId } } : prev));
  }, []);

  // Fecha com Escape e bloqueia o scroll do fundo enquanto o modal está aberto.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const openModal = () => {
    setError(null);
    setSent(false);
    setOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.name.trim()) return setError("Indica o teu nome.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError("Indica um email válido.");
    if (!isValidNif(form.nif)) return setError("Indica um NIF válido (9 dígitos).");

    setSending(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const payload = {
        vehicle_id: vehicleId,
        user_id: authData?.user?.id ?? null,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        nif: form.nif.replace(/\s+/g, ""),
        base_price: basePrice,
        extras_total: extrasTotal,
        total_price: total,
        selected_extras: chosen,
        message: form.message.trim(),
        source: "website",
      };

      const { error: insertError } = await supabase.from("sale_proposals").insert(payload);
      if (insertError) {
        setError("Não foi possível registar a proposta. Tenta novamente ou contacta-nos por telefone.");
        return;
      }

      // Notificação por email (dono + confirmação ao cliente). Uma falha de
      // email não invalida a proposta — já está guardada no backoffice.
      try {
        await fetch("/api/proposals/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, vehicle_slug: vehicleSlug, vehicle_name: vehicleName }),
        });
      } catch {
        // silencioso: a proposta está guardada
      }

      setSent(true);
      setForm({ name: "", email: "", phone: "", nif: "", message: "" });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <section id="configurador" className="mt-16 border-t border-border pt-10">
        <p className="font-display text-[10px] uppercase tracking-[0.24em] text-copper">Configurador</p>
        <h2 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight text-white">Escolhe os teus extras</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
          Seleciona os extras que queres nesta configuração. O total atualiza à medida das tuas escolhas e no fim podes gerar uma proposta com todos os valores detalhados.
        </p>

        <div className="mt-7 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-3">
            {extras.length === 0 ? (
              <p className="border border-white/10 bg-surface px-5 py-6 text-sm text-white/60">
                Esta configuração ainda não tem extras opcionais. Gera a proposta com o preço base e falamos contigo sobre as opções disponíveis.
              </p>
            ) : (
              extras.map((extra) => {
                const picked = selection[extra.id];
                const active = Boolean(picked);
                const currentPrice = picked?.variantId
                  ? extra.variants.find((item) => item.id === picked.variantId)?.price ?? extra.price
                  : extra.price;
                return (
                  <div
                    key={extra.id}
                    className={`border px-5 py-4 transition-colors ${active ? "border-copper/70 bg-copper/5" : "border-white/10 bg-surface"}`}
                  >
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleExtra(extra)}
                        className="mt-1 h-4 w-4 shrink-0 accent-[var(--copper)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-display text-sm uppercase tracking-wide text-white">{extra.name}</span>
                          <span className="font-display text-sm text-copper">{euro(Number(currentPrice) || 0)}</span>
                        </span>
                        {extra.description && <span className="mt-1 block text-xs leading-5 text-white/60">{extra.description}</span>}
                      </span>
                    </label>

                    {active && extra.variants.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                        {extra.variants.map((variant) => {
                          const selectedVariant = picked?.variantId === variant.id;
                          return (
                            <button
                              key={variant.id}
                              type="button"
                              onClick={() => pickVariant(extra.id, variant.id)}
                              aria-pressed={selectedVariant}
                              className={`border px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.14em] transition-colors ${selectedVariant ? "border-copper bg-copper text-black" : "border-white/15 text-silver hover:border-copper hover:text-copper"}`}
                            >
                              {variant.name} · {euro(Number(variant.price) || 0)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <aside className="h-fit border border-white/10 bg-surface-oxide p-5 sm:p-6 lg:sticky lg:top-24">
            <p className="font-display text-[10px] uppercase tracking-[0.24em] text-copper">Resumo</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-white/60">Viatura</dt>
                <dd className="text-right font-display text-white">{basePrice != null ? euro(base) : "Sob consulta"}</dd>
              </div>
              {chosen.map((item) => (
                <div key={item.extra_id} className="flex items-baseline justify-between gap-3">
                  <dt className="text-white/60">{item.name}{item.variant_name ? ` · ${item.variant_name}` : ""}</dt>
                  <dd className="text-right whitespace-nowrap text-white/80">{euro(Number(item.price) || 0)}</dd>
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-3 border-t border-white/10 pt-3">
                <dt className="font-display text-xs uppercase tracking-[0.16em] text-white/60">Extras</dt>
                <dd className="text-right font-display text-white">{euro(extrasTotal)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t border-white/10 pt-3">
                <dt className="font-display text-xs uppercase tracking-[0.16em] text-copper">Total</dt>
                <dd className="text-right font-display text-2xl text-copper">{basePrice != null ? euro(total) : "Sob consulta"}</dd>
              </div>
            </dl>
            <p className="mt-3 text-[11px] leading-5 text-white/45">Valores indicativos sem custos de legalização. Confirmamos tudo contigo antes de qualquer compromisso.</p>
            <button
              type="button"
              onClick={openModal}
              className="mt-5 w-full bg-copper px-6 py-4 font-display text-xs font-semibold uppercase tracking-[0.24em] text-black transition-colors hover:bg-copper-light"
            >
              Gerar proposta
            </button>
          </aside>
        </div>
      </section>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 px-4 py-10 backdrop-blur-sm"
          onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="proposta-titulo"
            className="w-full max-w-lg border border-white/15 bg-surface p-6 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-display text-[10px] uppercase tracking-[0.24em] text-copper">Proposta</p>
                <h2 id="proposta-titulo" className="mt-2 font-display text-2xl font-bold uppercase tracking-tight text-white">{vehicleName}</h2>
                <p className="mt-1 text-xs text-white/60">{chosen.length ? `${chosen.length} extra(s) · ${euro(extrasTotal)}` : "Configuração base"}{basePrice != null ? ` · total ${euro(total)}` : ""}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="-mr-1 -mt-1 shrink-0 border border-white/15 px-2.5 py-1 font-display text-xs text-silver transition-colors hover:border-copper hover:text-copper"
              >
                ✕
              </button>
            </div>

            {sent ? (
              <div className="mt-6">
                <p className="font-display text-sm uppercase tracking-[0.18em] text-copper">Proposta enviada</p>
                <p className="mt-3 text-sm leading-6 text-white/70">
                  Obrigado! Recebemos o teu pedido e vamos contactar-te com todos os detalhes desta configuração. Enviámos também uma confirmação para o teu email.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-6 w-full border border-copper px-5 py-3 font-display text-xs uppercase tracking-[0.2em] text-copper transition-colors hover:bg-copper hover:text-black"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="proposta-nome" className="mb-1 block font-display text-[10px] uppercase tracking-[0.18em] text-white/60">Nome *</label>
                  <input
                    id="proposta-nome"
                    required
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    className="w-full border border-white/10 bg-black px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-copper"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="proposta-email" className="mb-1 block font-display text-[10px] uppercase tracking-[0.18em] text-white/60">Email *</label>
                    <input
                      id="proposta-email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(event) => setForm({ ...form, email: event.target.value })}
                      className="w-full border border-white/10 bg-black px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-copper"
                    />
                  </div>
                  <div>
                    <label htmlFor="proposta-telefone" className="mb-1 block font-display text-[10px] uppercase tracking-[0.18em] text-white/60">Telefone</label>
                    <input
                      id="proposta-telefone"
                      inputMode="tel"
                      value={form.phone}
                      onChange={(event) => setForm({ ...form, phone: event.target.value })}
                      className="w-full border border-white/10 bg-black px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-copper"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="proposta-nif" className="mb-1 block font-display text-[10px] uppercase tracking-[0.18em] text-white/60">NIF *</label>
                  <input
                    id="proposta-nif"
                    required
                    inputMode="numeric"
                    maxLength={9}
                    value={form.nif}
                    onChange={(event) => setForm({ ...form, nif: event.target.value.replace(/[^\d]/g, "") })}
                    className="w-full border border-white/10 bg-black px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-copper"
                  />
                  <p className="mt-1 text-[11px] text-white/45">Necessário para emitir a proposta.</p>
                </div>
                <div>
                  <label htmlFor="proposta-mensagem" className="mb-1 block font-display text-[10px] uppercase tracking-[0.18em] text-white/60">Mensagem</label>
                  <textarea
                    id="proposta-mensagem"
                    rows={4}
                    value={form.message}
                    onChange={(event) => setForm({ ...form, message: event.target.value })}
                    placeholder="Retoma, prazo de entrega, financiamento..."
                    className="w-full resize-y border border-white/10 bg-black px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-copper"
                  />
                </div>

                {error && <p className="border-l-2 border-red-500 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full bg-copper px-6 py-4 font-display text-xs font-semibold uppercase tracking-[0.24em] text-black transition-colors hover:bg-copper-light disabled:opacity-60"
                >
                  {sending ? "A enviar..." : "Enviar proposta"}
                </button>
                <p className="text-[11px] leading-5 text-white/45">Os teus dados são usados apenas para responder a este pedido.</p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
