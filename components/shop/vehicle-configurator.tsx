"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createVehicleQuoteRequest } from "@/app/actions/shop";
import { euro } from "@/lib/shop-format";

// Compra online de viatura nova 0 km (/catalogo/[slug]/configurar): o cliente
// monta a viatura com os extras compatíveis, escolhe a entrega e envia o
// pedido de encomenda à equipa. Não há pagamento online — depois do envio, a
// garagem contacta-o para fechar detalhes, e ele acompanha o percurso pelo
// link do comprovativo.
//
// O passo «1 · Extras incluídos na compra» está organizado por secções (ex.:
// Jantes, Pneus, Tapetes) e em cada secção escolhe-se uma opção — como no
// configurador da BMW — ou nenhuma. Clicar na opção outra vez desmarca-a.
// Nas jantes mostram-se no máximo 4 modelos diferentes; o que varia depois é
// o tamanho (variantes do artigo), nunca a cor.
export type ConfiguratorAccessory = {
  id: string;
  name: string;
  price: number;
  category?: string | null;
  stock_mode?: string | null;
  image?: string | null;
  variants: { id: string; name: string; price_delta: number }[];
};

type Delivery = "stand" | "home";

type Props = {
  vehicle: {
    id: string;
    slug: string;
    name: string;
    trim?: string | null;
    price: number;
    image?: string | null;
    year?: number | null;
    mileageKm?: number | null;
  };
  accessories: ConfiguratorAccessory[];
  prefill?: { name?: string; email?: string; phone?: string };
};

const SEM_CATEGORIA = "Outros extras";
// Valor combinado para a entrega em casa — o servidor aplica exatamente o mesmo.
const ENTREGA_CASA = 350;
const MAX_JANTES = 4;

const isWheels = (title: string) => /jante/i.test(title);

export function VehicleConfigurator({ vehicle, accessories, prefill }: Props) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Record<string, string | null>>({});
  const [delivery, setDelivery] = useState<Delivery>("stand");
  const [name, setName] = useState(prefill?.name ?? "");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [phone, setPhone] = useState(prefill?.phone ?? "");
  const [nif, setNif] = useState("");

  // Secções do configurador: agrupadas pela categoria do artigo compatível.
  // Nas jantes limitamos a 4 modelos — a variação fica no tamanho (variantes).
  const sections = useMemo(() => {
    const groups = new Map<string, ConfiguratorAccessory[]>();
    for (const item of accessories) {
      const key = (item.category || SEM_CATEGORIA).trim();
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    return [...groups.entries()].map(([title, items]) => ({
      title,
      wheels: isWheels(title),
      items: isWheels(title) ? items.slice(0, MAX_JANTES) : items,
    }));
  }, [accessories]);

  const extrasTotal = useMemo(() => accessories.reduce((sum, item) => {
    if (!(item.id in selected)) return sum;
    const variant = item.variants.find((option) => option.id === selected[item.id]) ?? item.variants[0];
    return sum + item.price + Number(variant?.price_delta ?? 0);
  }, 0), [accessories, selected]);

  const deliveryFee = delivery === "home" ? ENTREGA_CASA : 0;
  const total = vehicle.price + extrasTotal + deliveryFee;
  const mileage = vehicle.mileageKm ?? 0;

  // Escolha única por secção: ao selecionar uma opção, as restantes da mesma
  // secção saem da configuração. Clicar na mesma opção desmarca-a.
  function choose(item: ConfiguratorAccessory) {
    setSelected((current) => {
      const section = (item.category || SEM_CATEGORIA).trim();
      const wasSelected = item.id in current;
      const next = { ...current };
      for (const other of accessories) {
        if ((other.category || SEM_CATEGORIA).trim() === section) delete next[other.id];
      }
      if (!wasSelected) next[item.id] = item.variants[0]?.id ?? null;
      return next;
    });
  }

  function submit() {
    setError("");
    startTransition(async () => {
      const result = await createVehicleQuoteRequest({
        vehicleId: vehicle.id,
        accessories: Object.entries(selected).map(([productId, variantId]) => ({ product_id: productId, variant_id: variantId })),
        delivery,
        customer: {
          customer_name: name.trim(),
          customer_email: email.trim(),
          customer_phone: phone.trim(),
          customer_nif: nif.replace(/\D/g, ""),
        },
      });
      if (result.error) { setError(result.error); return; }
      if (result.orderToken) router.push(`/encomenda/${result.orderToken}`);
    });
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); submit(); }} className="grid gap-10 lg:grid-cols-[1fr_360px]">
      <div className="space-y-8">
        {/* 1 · Extras por secções (escolha única em cada uma) */}
        <section className="border border-border bg-surface p-5 sm:p-7">
          <h2 className="font-display text-xl uppercase tracking-tight text-foreground"><span className="text-copper">1 ·</span> Extras incluídos na compra</h2>
          <p className="mt-2 text-sm leading-6 text-silver">Montados por nós antes da entrega.</p>

          {sections.length === 0 ? (
            <p className="mt-5 border border-border bg-surface-mid p-4 text-sm text-silver">De momento não há extras compatíveis publicados para esta viatura. Envia o pedido mesmo assim e falamos contigo sobre o que queres incluir.</p>
          ) : (
            <div className="mt-6 space-y-8">
              {sections.map((section) => {
                const chosen = section.items.find((item) => item.id in selected) ?? null;
                return (
                  <div key={section.title}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
                      <h3 className="font-display text-sm uppercase tracking-[0.18em] text-foreground">{section.title}</h3>
                      {chosen ? (
                        <button type="button" onClick={() => choose(chosen)} className="font-display text-[10px] uppercase tracking-[0.16em] text-muted transition-colors hover:text-copper">Remover escolha</button>
                      ) : (
                        <span className="font-display text-[10px] uppercase tracking-[0.16em] text-muted">Escolhe uma opção</span>
                      )}
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {section.items.map((item) => {
                        const isChosen = item.id in selected;
                        const variant = item.variants.find((option) => option.id === selected[item.id]) ?? item.variants[0];
                        return (
                          <div key={item.id} className={`relative flex flex-col border p-3 transition-colors ${isChosen ? "border-copper bg-copper/10" : "border-border bg-surface hover:border-copper/60"}`}>
                            <button type="button" onClick={() => choose(item)} aria-pressed={isChosen} className="flex w-full flex-1 items-start gap-3 pr-8 text-left">
                              <span className="h-16 w-20 shrink-0 overflow-hidden border border-border bg-surface-mid">
                                {item.image
                                  // eslint-disable-next-line @next/next/no-img-element -- fotografia do artigo (R2/SVG local) sem dimensões conhecidas
                                  ? <img src={item.image} alt="" className="h-full w-full object-cover" />
                                  : <span className="flex h-full items-center justify-center font-display text-[8px] uppercase tracking-widest text-muted">Chikane</span>}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block font-display text-sm uppercase leading-tight text-foreground">{item.name}</span>
                                <span className="mt-1 block font-display text-sm text-copper">+ {euro(item.price + Number(variant?.price_delta ?? 0))}</span>
                                {(item.stock_mode === "on_request") && <span className="mt-1 block text-[11px] text-muted">só por encomenda</span>}
                              </span>
                            </button>
                            <span aria-hidden="true" className={`pointer-events-none absolute right-3 top-3 flex h-5 w-5 items-center justify-center border text-[11px] ${isChosen ? "border-copper bg-copper text-black" : "border-white/25 text-transparent"}`}>✓</span>
                            {isChosen && item.variants.length > 1 && (
                              <div className="mt-3 border-t border-white/10 pt-3">
                                <p className="text-[10px] uppercase tracking-widest text-muted">{section.wheels ? "Tamanho" : "Opção"}</p>
                                {section.wheels ? (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {item.variants.map((option) => {
                                      const active = (selected[item.id] ?? "") === option.id;
                                      return (
                                        <button key={option.id} type="button" onClick={() => setSelected((current) => ({ ...current, [item.id]: option.id }))} aria-pressed={active} className={`border px-3 py-1.5 font-display text-xs uppercase tracking-wider transition-colors ${active ? "border-copper bg-copper text-black" : "border-border text-silver hover:border-copper/60"}`}>
                                          {option.name}{Number(option.price_delta) > 0 && <span className="ml-1 text-[10px]">+{euro(Number(option.price_delta))}</span>}
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <select value={selected[item.id] ?? ""} onChange={(event) => setSelected((current) => ({ ...current, [item.id]: event.target.value }))} className="mt-2 block w-full border border-border bg-background px-3 py-2 text-sm text-foreground">
                                    {item.variants.map((option) => <option key={option.id} value={option.id}>{option.name}{Number(option.price_delta) > 0 ? ` — +${euro(Number(option.price_delta))}` : ""}</option>)}
                                  </select>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 2 · Entrega */}
        <section className="border border-border bg-surface p-5 sm:p-7">
          <h2 className="font-display text-xl uppercase tracking-tight text-foreground"><span className="text-copper">2 ·</span> Entrega</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => setDelivery("stand")} aria-pressed={delivery === "stand"} className={`flex items-center justify-between gap-3 border p-4 text-left transition-colors ${delivery === "stand" ? "border-copper bg-copper/10" : "border-border bg-surface hover:border-copper/60"}`}>
              <span>
                <span className="block font-display text-sm uppercase tracking-wide text-foreground">Levantar no stand</span>
                <span className="mt-1 block text-xs text-muted">Lisboa, Portugal</span>
              </span>
              <span className="shrink-0 font-display text-sm text-copper">Grátis</span>
            </button>
            <button type="button" onClick={() => setDelivery("home")} aria-pressed={delivery === "home"} className={`flex items-center justify-between gap-3 border p-4 text-left transition-colors ${delivery === "home" ? "border-copper bg-copper/10" : "border-border bg-surface hover:border-copper/60"}`}>
              <span>
                <span className="block font-display text-sm uppercase tracking-wide text-foreground">Entrega em casa</span>
                <span className="mt-1 block text-xs text-muted">Em Portugal continental</span>
              </span>
              <span className="shrink-0 font-display text-sm text-copper">+ {euro(ENTREGA_CASA)}</span>
            </button>
          </div>
        </section>

        {/* 3 · Dados do cliente */}
        <section className="border border-border bg-surface p-5 sm:p-7">
          <h2 className="font-display text-xl uppercase tracking-tight text-foreground"><span className="text-copper">3 ·</span> Os seus dados</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Nome completo" value={name} onChange={setName} required />
            <Field label="Email" type="email" value={email} onChange={setEmail} required />
            <Field label="Telefone" type="tel" value={phone} onChange={setPhone} required />
            <Field label="NIF" value={nif} onChange={setNif} inputMode="numeric" />
          </div>
        </section>
      </div>

      {/* Painel lateral: resumo do pedido */}
      <aside className="h-fit border border-border bg-surface lg:sticky lg:top-28">
        <div className="aspect-[4/3] w-full overflow-hidden border-b border-border bg-surface-mid">
          {vehicle.image
            // eslint-disable-next-line @next/next/no-img-element -- imagem R2 externa sem dimensões conhecidas
            ? <img src={vehicle.image} alt={vehicle.name} className="h-full w-full object-cover" />
            : <span className="flex h-full items-center justify-center font-display text-[10px] uppercase tracking-[0.24em] text-muted">Chikane Garage</span>}
        </div>
        <div className="p-5 sm:p-6">
          <p className="font-display text-sm uppercase leading-tight text-foreground">{vehicle.name}</p>
          <p className="mt-2 font-display text-[11px] uppercase tracking-[0.18em] text-muted">{[vehicle.year, `${mileage.toLocaleString("pt-PT")} km`, "Novo"].filter(Boolean).join(" · ")}</p>

          <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted">Viatura</dt><dd className="text-foreground">{euro(vehicle.price)}</dd></div>
            {accessories.filter((item) => item.id in selected).map((item) => {
              const variant = item.variants.find((option) => option.id === selected[item.id]) ?? item.variants[0];
              return <div key={item.id} className="flex justify-between gap-4"><dt className="min-w-0 text-muted">{item.name}{variant && item.variants.length > 1 ? <span className="block text-xs">{variant.name}</span> : null}</dt><dd className="shrink-0 text-foreground">{euro(item.price + Number(variant?.price_delta ?? 0))}</dd></div>;
            })}
            <div className="flex justify-between gap-4"><dt className="text-muted">Entrega</dt><dd className="text-foreground">{delivery === "home" ? `+ ${euro(ENTREGA_CASA)}` : "Grátis"}</dd></div>
            <div className="flex items-end justify-between gap-4 border-t border-border pt-3">
              <dt className="font-display text-[11px] uppercase tracking-[0.2em] text-foreground">Total</dt>
              <dd className="font-display text-2xl leading-none text-copper">{euro(total)}</dd>
            </div>
          </dl>

          {error && <p role="alert" className="mt-5 border border-red/50 bg-red/10 p-3 text-sm text-red-light">{error}</p>}
          <button type="submit" disabled={busy} className="mt-6 w-full bg-copper px-5 py-4 font-display text-xs uppercase tracking-widest text-black transition-colors hover:bg-copper-light disabled:opacity-50">{busy ? "A enviar pedido…" : "Confirmar compra"}</button>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">A viatura fica reservada no teu nome. Enviamos os dados de pagamento e o contrato por email.</p>
          <p className="mt-2 text-center text-[11px] leading-relaxed text-muted">Sem cobrança agora. <Link href="/termos-e-condicoes" className="underline">Termos</Link>.</p>
        </div>
      </aside>
    </form>
  );
}

function Field({ label, value, onChange, type = "text", required, inputMode, className = "" }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; inputMode?: "numeric"; className?: string }) {
  return <label className={`block text-xs uppercase tracking-widest text-muted ${className}`}>{label}
    <input type={type} inputMode={inputMode} value={value} onChange={(event) => onChange(event.target.value)} required={required} className="mt-2 block w-full border border-border bg-background px-3 py-3 text-sm normal-case tracking-normal text-foreground" />
  </label>;
}
