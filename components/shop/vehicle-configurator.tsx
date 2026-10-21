"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createVehicleQuoteRequest } from "@/app/actions/shop";
import { euro } from "@/lib/shop-format";

// Configurador de viatura nova 0 km (/catalogo/[slug]/configurar): o cliente
// monta a viatura com os acessórios compatíveis e envia um pedido de encomenda
// à equipa. Não há pagamento online — depois do envio, a garagem contacta-o
// para fechar detalhes, e ele acompanha o percurso pelo link do comprovativo.
export type ConfiguratorAccessory = {
  id: string;
  name: string;
  price: number;
  category?: string | null;
  stock_mode?: string | null;
  variants: { id: string; name: string; price_delta: number }[];
};

type Props = {
  vehicle: {
    id: string;
    slug: string;
    name: string;
    trim?: string | null;
    price: number;
    image?: string | null;
  };
  accessories: ConfiguratorAccessory[];
  prefill?: { name?: string; email?: string; phone?: string };
};

export function VehicleConfigurator({ vehicle, accessories, prefill }: Props) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Record<string, string | null>>({});
  const [name, setName] = useState(prefill?.name ?? "");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [phone, setPhone] = useState(prefill?.phone ?? "");
  const [note, setNote] = useState("");
  const [financing, setFinancing] = useState(false);
  const [tradeIn, setTradeIn] = useState(false);

  const total = useMemo(() => vehicle.price + accessories.reduce((sum, item) => {
    if (!(item.id in selected)) return sum;
    const variant = item.variants.find((option) => option.id === selected[item.id]) ?? item.variants[0];
    return sum + item.price + Number(variant?.price_delta ?? 0);
  }, 0), [vehicle.price, accessories, selected]);

  function toggle(item: ConfiguratorAccessory) {
    setSelected((current) => {
      if (item.id in current) {
        const next = { ...current };
        delete next[item.id];
        return next;
      }
      return { ...current, [item.id]: item.variants[0]?.id ?? null };
    });
  }

  function submit() {
    setError("");
    startTransition(async () => {
      const result = await createVehicleQuoteRequest({
        vehicleId: vehicle.id,
        accessories: Object.entries(selected).map(([productId, variantId]) => ({ product_id: productId, variant_id: variantId })),
        customer: {
          customer_name: name.trim(),
          customer_email: email.trim(),
          customer_phone: phone.trim(),
          customer_note: [note.trim(), financing ? "Pedido simulação de financiamento." : "", tradeIn ? "Tem viatura em retoma a oferecer." : ""].filter(Boolean).join("\n"),
        },
      });
      if (result.error) { setError(result.error); return; }
      if (result.orderToken) router.push(`/encomenda/${result.orderToken}`);
    });
  }

  const count = Object.keys(selected).length;

  return (
    <form onSubmit={(event) => { event.preventDefault(); submit(); }} className="grid gap-10 lg:grid-cols-[1fr_360px]">
      <div className="space-y-8">
        {/* Viatura */}
        <section className="border border-border bg-surface p-5 sm:p-7">
          <p className="font-display text-[10px] uppercase tracking-[0.24em] text-copper">A tua configuração</p>
          <div className="mt-4 flex items-start gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element -- imagem R2 externa sem dimensões conhecidas */}
            {vehicle.image && <img src={vehicle.image} alt="" className="h-24 w-32 shrink-0 border border-border object-cover" />}
            <div>
              <h2 className="font-display text-2xl font-bold uppercase text-foreground">{vehicle.name}</h2>
              {vehicle.trim && <p className="mt-1 font-display text-xs uppercase tracking-[0.2em] text-silver">{vehicle.trim}</p>}
              <p className="mt-3 font-display text-xl text-copper">{euro(vehicle.price)}</p>
              <p className="mt-1 text-xs text-muted">Viatura nova 0 km · por encomenda</p>
            </div>
          </div>
        </section>

        {/* Acessórios compatíveis */}
        <section className="border border-border bg-surface p-5 sm:p-7">
          <h2 className="font-display text-xl uppercase text-foreground">Acessórios e peças</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Seleciona o que queres incluir. Todos os artigos são compatíveis com esta viatura — a equipa confirma a instalação e o prazo antes do pagamento.</p>
          {accessories.length === 0 ? (
            <p className="mt-5 border border-border bg-surface-mid p-4 text-sm text-silver">De momento não há artigos compatíveis publicados para esta viatura. Podes enviar o pedido mesmo assim e pedir acessórios na nota.</p>
          ) : (
            <ul className="mt-5 divide-y divide-border border-y border-border">
              {accessories.map((item) => {
                const isChecked = item.id in selected;
                const variant = item.variants.find((option) => option.id === selected[item.id]) ?? item.variants[0];
                return (
                  <li key={item.id} className="py-4">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input type="checkbox" checked={isChecked} onChange={() => toggle(item)} className="mt-1 accent-[var(--copper)]" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <span className="font-display text-sm uppercase text-foreground">{item.name}</span>
                          <span className="font-display text-sm text-copper">{euro(item.price + Number(variant?.price_delta ?? 0))}</span>
                        </span>
                        {(item.category || item.stock_mode === "on_request") && <span className="mt-1 block text-xs text-muted">{[item.category, item.stock_mode === "on_request" ? "só por encomenda" : null].filter(Boolean).join(" · ")}</span>}
                        {isChecked && item.variants.length > 1 && (
                          <label className="mt-3 block text-xs uppercase tracking-widest text-muted">Opção
                            <select value={selected[item.id] ?? ""} onChange={(event) => setSelected((current) => ({ ...current, [item.id]: event.target.value }))} className="mt-2 block w-full max-w-xs border border-border bg-background px-3 py-2 text-sm normal-case tracking-normal text-foreground">
                              {item.variants.map((option) => <option key={option.id} value={option.id}>{option.name}{Number(option.price_delta) > 0 ? ` — +${euro(Number(option.price_delta))}` : ""}</option>)}
                            </select>
                          </label>
                        )}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Contacto */}
        <section className="border border-border bg-surface p-5 sm:p-7">
          <h2 className="font-display text-xl uppercase text-foreground">Os teus dados</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Nome completo" value={name} onChange={setName} required />
            <Field label="Email" type="email" value={email} onChange={setEmail} required />
            <Field label="Telemóvel" type="tel" value={phone} onChange={setPhone} required className="sm:col-span-2" />
          </div>
          <div className="mt-5 space-y-3">
            <label className="flex cursor-pointer items-center gap-3 border border-border p-4 text-sm"><input type="checkbox" checked={financing} onChange={(event) => setFinancing(event.target.checked)} className="accent-[var(--copper)]" /><span className="text-silver">Quero uma simulação de <strong className="text-foreground">financiamento</strong></span></label>
            <label className="flex cursor-pointer items-center gap-3 border border-border p-4 text-sm"><input type="checkbox" checked={tradeIn} onChange={(event) => setTradeIn(event.target.checked)} className="accent-[var(--copper)]" /><span className="text-silver">Tenho <strong className="text-foreground">viatura em retoma</strong> a oferecer</span></label>
          </div>
          <label className="mt-5 block text-xs uppercase tracking-widest text-muted">Nota para a garagem (opcional)
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Cores preferidas, prazo, dúvidas…" className="mt-2 block w-full border border-border bg-background px-3 py-3 text-sm normal-case tracking-normal text-foreground" />
          </label>
        </section>
      </div>

      {/* Resumo + envio */}
      <aside className="h-fit border border-border bg-surface p-5 sm:p-6 lg:sticky lg:top-28">
        <h2 className="font-display text-xl uppercase text-foreground">Resumo do pedido</h2>
        <ul className="mt-5 divide-y divide-border border-y border-border text-sm">
          <li className="flex justify-between gap-4 py-3"><span className="text-muted">{vehicle.name}</span><span className="shrink-0 text-foreground">{euro(vehicle.price)}</span></li>
          {accessories.filter((item) => item.id in selected).map((item) => {
            const variant = item.variants.find((option) => option.id === selected[item.id]) ?? item.variants[0];
            return <li key={item.id} className="flex justify-between gap-4 py-3"><span className="text-muted">{item.name}{variant && item.variants.length > 1 ? <span className="block text-xs">{variant.name}</span> : null}</span><span className="shrink-0 text-foreground">{euro(item.price + Number(variant?.price_delta ?? 0))}</span></li>;
          })}
        </ul>
        <div className="mt-4 flex justify-between border-t border-border pt-4 text-sm"><span className="text-muted">Total de referência</span><span className="font-display text-lg text-copper">{euro(total)}</span></div>
        <p className="mt-2 text-xs leading-relaxed text-muted">Valor de referência com IVA incluído, sujeito a confirmação. Sem pagamento online: a equipa contacta-te nas próximas 24 horas úteis para fechar configuração, prazo e condições.</p>
        {error && <p role="alert" className="mt-5 border border-red/50 bg-red/10 p-3 text-sm text-red-light">{error}</p>}
        <button type="submit" disabled={busy} className="mt-6 w-full bg-copper px-5 py-4 font-display text-xs uppercase tracking-widest text-black transition-colors hover:bg-copper-light disabled:opacity-50">{busy ? "A enviar pedido…" : count > 0 ? `Enviar pedido (${count} acessório${count > 1 ? "s" : ""})` : "Enviar pedido de encomenda"}</button>
        <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">Ao enviar, concordas que a garagem te contacte sobre este pedido. Sem compromisso de compra. <Link href="/termos-e-condicoes" className="underline">Termos</Link>.</p>
      </aside>
    </form>
  );
}

function Field({ label, value, onChange, type = "text", required, className = "" }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; className?: string }) {
  return <label className={`block text-xs uppercase tracking-widest text-muted ${className}`}>{label}
    <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} className="mt-2 block w-full border border-border bg-background px-3 py-3 text-sm normal-case tracking-normal text-foreground" />
  </label>;
}
