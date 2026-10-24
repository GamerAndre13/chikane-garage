"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createShopOrder, quoteCheckout, type CheckoutQuote } from "@/app/actions/shop";
import { useShopCart } from "@/components/shop/cart-provider";

// Dados já conhecidos de um cliente com sessão (perfil + morada predefinida).
// Quando existem, os campos de contacto desaparecem (já estão preenchidos) e
// a morada entra pré-preenchida.
export type CheckoutPrefill = {
  name: string;
  email: string;
  phone: string;
  shipping_name: string;
  shipping_phone: string;
  line1: string;
  line2: string;
  city: string;
  postal_code: string;
  country: string;
};

const money = (value: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);

export function CheckoutForm({ prefill }: { prefill?: CheckoutPrefill }) {
  const { lines, hydrated, clear } = useShopCart();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState("");
  // Pagamento só abre quando todos os campos obrigatórios estão preenchidos.
  const [complete, setComplete] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const loggedIn = Boolean(prefill?.email);
  const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);

  // Resumo real (portes + desconto) pedido ao servidor com os mesmos RPC do
  // pagamento. É só para mostrar: o total cobrado é sempre o que o servidor
  // calcula em place_order.
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoting, setQuoting] = useState(false);
  const quoteTimer = useRef<number | null>(null);
  const quoteRequest = useRef(0);

  function refreshQuote() {
    if (!hydrated || !lines.length) return;
    if (quoteTimer.current) window.clearTimeout(quoteTimer.current);
    const form = formRef.current;
    const data = form ? new FormData(form) : null;
    const postal = String(data?.get("shipping_postal_code") ?? "").trim();
    const country = String(data?.get("shipping_country") ?? "PT");
    if (!data || postal.length < 4) { setQuote(null); setQuoteError(""); setQuoting(false); return; }
    setQuoting(true);
    const request = ++quoteRequest.current;
    quoteTimer.current = window.setTimeout(async () => {
      const result = await quoteCheckout({
        items: lines.map(({ variantId, quantity }) => ({ variant_id: variantId, quantity })),
        country,
        postalCode: postal,
        couponCode: String(data.get("coupon_code") ?? ""),
        email: String(data.get("customer_email") ?? prefill?.email ?? ""),
      });
      if (request !== quoteRequest.current) return; // resposta antiga
      setQuoting(false);
      if (result.error) { setQuote(null); setQuoteError(result.error); return; }
      setQuoteError("");
      setQuote(result.quote ?? null);
    }, 450);
  }

  useEffect(() => () => { if (quoteTimer.current) window.clearTimeout(quoteTimer.current); }, []);

  // Validade inicial (contas com sessão podem já ter tudo preenchido).
  useEffect(() => {
    setComplete(Boolean(formRef.current?.checkValidity()));
    refreshQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, lines]);

  function revalidate() {
    setComplete(Boolean(formRef.current?.checkValidity()));
    refreshQuote();
  }

  function submit(formData: FormData) {
    setError("");
    startTransition(async () => {
      // O nome e o telemóvel de contacto vêm dos campos da morada de envio;
      // o email só é pedido a convidados (clientes com sessão já o têm no perfil).
      const customer = Object.fromEntries(formData.entries());
      if (!String(customer.customer_name ?? "").trim()) customer.customer_name = customer.shipping_name;
      if (!String(customer.customer_phone ?? "").trim()) customer.customer_phone = customer.shipping_phone;
      const result = await createShopOrder({
        items: lines.map(({ variantId, quantity }) => ({ variant_id: variantId, quantity })),
        customer,
        paymentMethod: String(formData.get("payment_method")),
        couponCode: String(formData.get("coupon_code") ?? ""),
      });
      if (result.error) { setError(result.error); return; }
      clear();
      if (result.redirectUrl) window.location.assign(result.redirectUrl);
      else if (result.orderToken) router.push(`/encomenda/${result.orderToken}`);
    });
  }

  if (!hydrated) return <div className="h-48 animate-pulse bg-surface" />;
  if (!lines.length) return <div className="border border-border bg-surface p-8"><p className="font-display text-xl uppercase">O carrinho está vazio</p><Link href="/loja" className="mt-4 inline-block text-sm text-copper underline">Voltar à loja</Link></div>;

  return <form ref={formRef} action={submit} onInput={revalidate} onChange={revalidate} className="grid gap-10 lg:grid-cols-[1fr_340px]">
    <div className="space-y-8">
      {/* Nome e contacto não se repetem: saem da morada de envio. Clientes com
          sessão têm o email no perfil; convidados indicam-no para o comprovativo. */}
      <section className="border border-border bg-surface p-5 sm:p-7">
        <h2 className="font-display text-xl uppercase text-foreground">Morada de envio</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field name="shipping_name" label="Nome de quem recebe" required defaultValue={prefill?.shipping_name} />
          <Field name="shipping_phone" label="Telemóvel" type="tel" required defaultValue={prefill?.shipping_phone} />
          <Field name="nif" label="NIF (opcional)" inputMode="numeric" />
          {loggedIn ? (
            <input type="hidden" name="customer_email" value={prefill?.email ?? ""} />
          ) : (
            <Field name="customer_email" label="Email" type="email" required />
          )}
          <label className="block text-xs uppercase tracking-widest text-muted sm:col-span-2">Morada
            <input name="shipping_line1" required defaultValue={prefill?.line1} autoComplete="shipping-line1" className="mt-2 block w-full border border-border bg-background px-3 py-3 text-sm normal-case tracking-normal text-foreground" />
          </label>
          <label className="block text-xs uppercase tracking-widest text-muted sm:col-span-2">Complemento (opcional)
            <input name="shipping_line2" defaultValue={prefill?.line2} autoComplete="shipping-line2" className="mt-2 block w-full border border-border bg-background px-3 py-3 text-sm normal-case tracking-normal text-foreground" />
          </label>
          <Field name="shipping_postal_code" label="Código postal" defaultValue={prefill?.postal_code} required />
          <Field name="shipping_city" label="Localidade" defaultValue={prefill?.city} required />
          <label className="block text-xs uppercase tracking-widest text-muted sm:col-span-2">País
            <select name="shipping_country" defaultValue={prefill?.country || "PT"} className="mt-2 block w-full border border-border bg-background px-3 py-3 text-sm text-foreground">
              <option value="PT">Portugal</option><option value="ES">Espanha</option><option value="FR">França</option><option value="DE">Alemanha</option><option value="BE">Bélgica</option><option value="NL">Países Baixos</option><option value="IT">Itália</option><option value="AT">Áustria</option><option value="IE">Irlanda</option><option value="LU">Luxemburgo</option><option value="PL">Polónia</option><option value="SE">Suécia</option><option value="DK">Dinamarca</option><option value="FI">Finlândia</option><option value="GR">Grécia</option><option value="CZ">Chéquia</option><option value="RO">Roménia</option><option value="HU">Hungria</option><option value="BG">Bulgária</option><option value="HR">Croácia</option><option value="SI">Eslovénia</option><option value="SK">Eslováquia</option><option value="EE">Estónia</option><option value="LV">Letónia</option><option value="LT">Lituânia</option><option value="CY">Chipre</option><option value="MT">Malta</option><option value="IS">Islândia</option><option value="NO">Noruega</option><option value="CH">Suíça</option>
            </select>
          </label>
        </div>
        <input type="hidden" name="billing_same_as_shipping" value="true" />
      </section>
      {complete ? (
        <section className="border border-border bg-surface p-5 sm:p-7">
          <h2 className="font-display text-xl uppercase text-foreground">Pagamento</h2>
          <div className="mt-5 space-y-3">
            <label className="flex cursor-pointer items-start gap-3 border border-border p-4 text-sm"><input type="radio" name="payment_method" value="card" defaultChecked className="mt-0.5 accent-[var(--copper)]" /><span><strong className="font-medium text-foreground">Cartão</strong><span className="mt-1 block text-xs text-muted">Pagamento seguro por cartão.</span></span></label>
            <label className="flex cursor-pointer items-start gap-3 border border-border p-4 text-sm"><input type="radio" name="payment_method" value="mb_way" className="mt-0.5 accent-[var(--copper)]" /><span><strong className="font-medium text-foreground">MB WAY</strong><span className="mt-1 block text-xs text-muted">Receberás um pedido de pagamento na aplicação.</span></span></label>
          </div>
        </section>
      ) : (
        <section aria-live="polite" className="border border-dashed border-border bg-surface p-5 text-sm sm:p-7">
          <h2 className="font-display text-xl uppercase text-foreground">Pagamento</h2>
          <p className="mt-2 text-muted">Preenche todos os campos da morada para desbloquear o pagamento.</p>
        </section>
      )}
    </div>
    <aside className="h-fit border border-border bg-surface p-5 sm:p-6 lg:sticky lg:top-28">
      <h2 className="font-display text-xl uppercase text-foreground">Rever encomenda</h2>
      <ul className="mt-5 divide-y divide-border border-y border-border">
        {lines.map((line) => <li key={line.key} className="flex justify-between gap-4 py-3 text-sm"><span className="text-muted">{line.quantity} × {line.name} <span className="block text-xs">{line.variantName}</span></span><span className="shrink-0 text-foreground">{money(line.price * line.quantity)}</span></li>)}
      </ul>
      <div className="mt-4 space-y-1 text-sm">
        <div className="flex justify-between gap-4"><span className="text-muted">Subtotal</span><span className="text-foreground">{money(subtotal)}</span></div>
        <div className="flex justify-between gap-4"><span className="text-muted">Portes</span><span className="text-foreground">{quoting ? "A calcular…" : quote ? (quote.onRequest ? "A confirmar" : quote.shipping > 0 ? money(quote.shipping) : "Grátis") : "—"}</span></div>
        {(quote?.zone || quote?.deliveryDaysMin) && <p className="text-[11px] leading-relaxed text-muted">{quote?.zone}{quote?.deliveryDaysMin ? ` · entrega em ${quote.deliveryDaysMin}–${quote.deliveryDaysMax ?? quote.deliveryDaysMin} dias úteis` : ""}</p>}
        {quote && quote.discount > 0 && <div className="flex justify-between gap-4 text-success"><span>Desconto</span><span>-{money(quote.discount)}</span></div>}
        {quote?.coupon && !quote.coupon.valid && <p className="text-[11px] leading-relaxed text-red-light">{quote.coupon.reason ?? "Cupão inválido."}</p>}
        {quote?.onRequest && <p className="text-[11px] leading-relaxed text-warning">Portes a confirmar: a equipa contacta-te antes de cobrar.</p>}
        {quoteError && <p className="text-[11px] leading-relaxed text-red-light">{quoteError}</p>}
        {!quote && !quoteError && <p className="text-[11px] leading-relaxed text-muted">Indica o código postal para ver os portes. IVA incluído.</p>}
        <div className="flex justify-between gap-4 border-t border-border pt-2 font-display text-base"><span className="uppercase">Total</span><span className="text-copper">{money(quote ? quote.total : subtotal)}</span></div>
        {!quote && <p className="text-[11px] leading-relaxed text-muted">O total final inclui os portes e é confirmado pelo servidor antes do pagamento.</p>}
      </div>
      <label className="mt-5 block text-xs uppercase tracking-widest text-muted" htmlFor="coupon_code">Cupão de desconto
        <input id="coupon_code" name="coupon_code" autoComplete="off" className="mt-2 w-full border border-border bg-background px-3 py-3 text-sm uppercase text-foreground" placeholder="Código do cupão" />
      </label>
      {error && <p role="alert" className="mt-5 border border-red/50 bg-red/10 p-3 text-sm text-red-light">{error}</p>}
      <button disabled={busy || !complete} className="mt-6 w-full bg-copper px-5 py-4 font-display text-xs uppercase tracking-widest text-black transition-colors hover:bg-copper-light disabled:opacity-50">{busy ? "A preparar pagamento…" : "Confirmar e pagar"}</button>
      {!complete && <p className="mt-2 text-center text-[11px] leading-relaxed text-muted">Completa a morada de envio para continuar.</p>}
      <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">Ao continuar, confirmas que leste os <Link href="/termos-e-condicoes" className="underline">termos e condições</Link> e a <Link href="/envios-e-devolucoes" className="underline">política de envios e devoluções</Link>.</p>
    </aside>
  </form>;
}

function Field({ name, label, required, type = "text", className = "", inputMode, defaultValue }: { name: string; label: string; required?: boolean; type?: string; className?: string; inputMode?: "numeric"; defaultValue?: string }) {
  return <label className={`block text-xs uppercase tracking-widest text-muted ${className}`}>{label}
    <input name={name} type={type} inputMode={inputMode} required={required} defaultValue={defaultValue} autoComplete={name.replaceAll("_", "-")} className="mt-2 block w-full border border-border bg-background px-3 py-3 text-sm normal-case tracking-normal text-foreground" />
  </label>;
}
