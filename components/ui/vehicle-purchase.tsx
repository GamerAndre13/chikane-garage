"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { validarTelemovelPT } from "@/lib/validacao";

// Página de compra / pedido de proposta das viaturas novas, no formato de
// /comprar/<slug>: extras numerados à esquerda, resumo sticky à direita e o
// formulário de dados no mesmo estilo do "Pedir informações" (app/contacto).

export type PurchaseVariant = {
  id: string;
  name: string;
  price: number;
};

export type PurchaseExtra = {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  price: number;
  variants: PurchaseVariant[];
};

type Props = {
  vehicleId: string;
  vehicleSlug: string;
  vehicleName: string;
  brand?: string | null;
  model?: string | null;
  trim?: string | null;
  year?: number | null;
  mileageKm?: number | null;
  saleType?: string | null;
  photoUrl?: string | null;
  basePrice: number | null;
  extras: PurchaseExtra[];
};

// Escolha do cliente por extra: sem entrada = extra não selecionado.
type Selection = { variantId: string | null };

const euro = (value: number) =>
  `${value.toLocaleString("pt-PT", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;

// Mesmo tratamento visual do formulário "Pedir informações" (app/contacto).
const inputStyle = {
  width: "100%",
  padding: "0.75rem 1rem",
  border: "1px solid var(--border)",
  backgroundColor: "var(--background-alt)",
  color: "var(--foreground)",
  fontSize: "0.875rem",
} as const;

const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted";

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

export function VehiclePurchase({
  vehicleId,
  vehicleSlug,
  vehicleName,
  brand,
  model,
  trim,
  year,
  mileageKm,
  saleType,
  photoUrl,
  basePrice,
  extras,
}: Props) {
  const [selection, setSelection] = useState<Record<string, Selection>>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", nif: "", message: "" });

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

  const toggleExtra = (extra: PurchaseExtra) => {
    setSelection((prev) => {
      if (prev[extra.id]) {
        const next = { ...prev };
        delete next[extra.id];
        return next;
      }
      // Com variantes, a primeira é a pré-seleção.
      return { ...prev, [extra.id]: { variantId: extra.variants[0]?.id ?? null } };
    });
  };

  const pickVariant = (extraId: string, variantId: string | null) => {
    setSelection((prev) => (prev[extraId] ? { ...prev, [extraId]: { variantId } } : prev));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.name.trim()) return setError("Indica o teu nome.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError("Indica um email válido.");
    if (!validarTelemovelPT(form.phone)) return setError("Indica um telemóvel português válido (9 dígitos, começa por 9).");
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
    } finally {
      setSending(false);
    }
  };

  const meta = [
    year ? String(year) : null,
    mileageKm != null ? `${mileageKm.toLocaleString("pt-PT")} km` : null,
    saleType === "new" ? "Novo" : "Usado",
  ].filter(Boolean).join(" · ");

  return (
    <div className="mx-auto max-w-[1200px] px-5 pb-24 pt-10 sm:px-8 lg:px-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/catalogo/${vehicleSlug}`} className="font-display text-[11px] uppercase tracking-[0.2em] text-silver transition-colors hover:text-copper">
          ← Voltar à viatura
        </Link>
        <span className="font-display text-[10px] uppercase tracking-[0.2em] text-muted">Chikane Garage · seleção</span>
      </div>

      <p className="mt-8 font-display text-[10px] uppercase tracking-[0.24em] text-copper">Proposta online</p>
      <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.6rem)] font-bold uppercase leading-[0.98] tracking-tight text-foreground">
        {brand} {model} {trim && <span className="text-muted">{trim}</span>}
      </h1>

      {sent ? (
        <div className="mt-10 border border-border bg-surface p-8 sm:p-12">
          <p className="font-display text-[10px] uppercase tracking-[0.24em] text-copper">Proposta enviada</p>
          <h2 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight text-foreground">
            Obrigado{form.name.trim() ? `, ${form.name.trim()}` : ""}!
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-silver">
            Recebemos o teu pedido para a {vehicleName}. Vamos analisar a configuração e contactar-te brevemente com todos os detalhes.
            Enviámos também uma confirmação para <strong className="text-foreground">{form.email.trim()}</strong>.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={`/catalogo/${vehicleSlug}`} className="bg-copper px-6 py-3 font-display text-sm font-semibold uppercase tracking-widest text-white transition-colors hover:bg-copper-light">
              Voltar à viatura
            </Link>
            <Link href="/catalogo" className="border border-border px-6 py-3 font-display text-sm font-semibold uppercase tracking-widest text-silver transition-colors hover:border-copper hover:text-copper">
              Ver catálogo
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px] xl:gap-12">
          <div className="space-y-12">
            <section>
              <h2 className="font-display text-sm uppercase tracking-[0.28em] text-copper">1 · Extras da configuração</h2>
              <p className="mb-5 mt-2 text-xs text-muted">Escolhe os extras que queres incluir. O total atualiza à medida das escolhas.</p>

              {extras.length === 0 ? (
                <p className="border border-border bg-surface px-5 py-6 text-sm text-muted">
                  Esta configuração ainda não tem extras opcionais. Podes enviar a proposta com o preço base e falamos contigo sobre as opções disponíveis.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {extras.map((extra) => {
                    const picked = selection[extra.id];
                    const active = Boolean(picked);
                    const currentPrice = picked?.variantId
                      ? extra.variants.find((item) => item.id === picked.variantId)?.price ?? extra.price
                      : extra.price;
                    return (
                      <article
                        key={extra.id}
                        className={`border transition-colors ${active ? "border-copper bg-surface" : "border-border hover:border-copper"}`}
                      >
                        <label className="flex cursor-pointer gap-4 p-3">
                          {extra.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element -- fotografia vem do R2 (domínio configurável)
                            <img src={extra.image_url} alt="" loading="lazy" className="h-20 w-20 shrink-0 object-cover" />
                          ) : (
                            <span className="grid h-20 w-20 shrink-0 place-items-center border border-border text-[10px] text-muted">Sem foto</span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block font-display text-sm uppercase leading-tight tracking-wide text-foreground">{extra.name}</span>
                            {extra.description && <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted">{extra.description}</span>}
                            <span className="mt-1 block text-sm text-copper">+ {euro(Number(currentPrice) || 0)}</span>
                          </span>
                          <span className={`grid h-6 w-6 shrink-0 place-items-center border ${active ? "border-copper bg-copper text-black" : "border-border"}`}>
                            {active && (
                              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
                            )}
                          </span>
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={active}
                            onChange={() => toggleExtra(extra)}
                          />
                        </label>

                        {active && extra.variants.length > 0 && (
                          <div className="flex flex-wrap gap-2 border-t border-border px-3 py-2.5">
                            {extra.variants.map((variant) => {
                              const selectedVariant = picked?.variantId === variant.id;
                              return (
                                <button
                                  key={variant.id}
                                  type="button"
                                  onClick={() => pickVariant(extra.id, variant.id)}
                                  aria-pressed={selectedVariant}
                                  className={`border px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.14em] transition-colors ${selectedVariant ? "border-copper bg-copper text-black" : "border-border text-silver hover:border-copper hover:text-copper"}`}
                                >
                                  {variant.name} · {euro(Number(variant.price) || 0)}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section>
              <h2 className="font-display text-sm uppercase tracking-[0.28em] text-copper">2 · Os teus dados</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="compra-nome" className={labelCls}>Nome completo *</label>
                  <input id="compra-nome" name="name" autoComplete="name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label htmlFor="compra-email" className={labelCls}>Email *</label>
                  <input id="compra-email" name="email" type="email" autoComplete="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label htmlFor="compra-telefone" className={labelCls}>Telefone *</label>
                  <input id="compra-telefone" name="phone" type="tel" autoComplete="tel" required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label htmlFor="compra-nif" className={labelCls}>NIF *</label>
                  <input id="compra-nif" name="nif" inputMode="numeric" maxLength={9} required value={form.nif} onChange={(event) => setForm({ ...form, nif: event.target.value.replace(/[^\d]/g, "") })} style={inputStyle} />
                  <p className="mt-1 text-xs text-muted">Necessário para emitir a proposta.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-display text-sm uppercase tracking-[0.28em] text-copper">3 · Mensagem</h2>
              <div className="mt-5">
                <label htmlFor="compra-mensagem" className={labelCls}>Notas (opcional)</label>
                <textarea id="compra-mensagem" name="message" rows={5} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Retoma, prazo de entrega, financiamento..." style={{ ...inputStyle, resize: "vertical" as const }} />
              </div>
            </section>
          </div>

          <aside className="h-max border border-border bg-surface p-5 lg:sticky lg:top-24">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- fotografia vem do R2 (domínio configurável)
              <img src={photoUrl} alt={`${brand} ${model}`} className="aspect-[16/10] w-full object-cover" />
            ) : (
              <div className="grid aspect-[16/10] w-full place-items-center border border-border text-xs text-muted">Sem fotografia</div>
            )}
            <p className="mt-3 text-xs text-muted">{meta}</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Viatura</dt>
                <dd className="text-foreground">{basePrice != null ? euro(base) : "Sob consulta"}</dd>
              </div>
              {chosen.map((item) => (
                <div key={item.extra_id} className="flex justify-between gap-3">
                  <dt className="text-muted">{item.name}{item.variant_name ? ` · ${item.variant_name}` : ""}</dt>
                  <dd className="whitespace-nowrap text-foreground">{euro(Number(item.price) || 0)}</dd>
                </div>
              ))}
              {chosen.length === 0 && <p className="text-xs leading-5 text-muted">Sem extras selecionados.</p>}
              <div className="flex justify-between gap-3 border-t border-border pt-3 font-display text-lg">
                <dt className="uppercase tracking-wide text-foreground">Total</dt>
                <dd className="text-copper">{basePrice != null ? euro(total) : "Sob consulta"}</dd>
              </div>
            </dl>

            {error && <div role="alert" className="mt-4 border-l-4 border-red-500 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>}

            <button
              type="submit"
              disabled={sending}
              className="mt-5 w-full bg-copper px-6 py-3 font-display text-sm font-semibold uppercase tracking-widest text-white transition-colors hover:bg-copper-light disabled:opacity-50"
            >
              {sending ? "A enviar…" : "Pedir proposta"}
            </button>
            <p className="mt-3 text-xs leading-5 text-muted">
              Valores indicativos sem custos de legalização. Confirmamos tudo contigo antes de qualquer compromisso.
            </p>
          </aside>
        </form>
      )}
    </div>
  );
}
