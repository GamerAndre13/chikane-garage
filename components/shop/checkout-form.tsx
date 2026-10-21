"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createShopOrder } from "@/app/actions/shop";
import { useShopCart } from "@/components/shop/cart-provider";

export function CheckoutForm() {
  const { lines, hydrated, clear } = useShopCart();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  function submit(formData: FormData) {
    setError("");
    startTransition(async () => {
      const result = await createShopOrder({
        items: lines.map(({ variantId, quantity }) => ({ variant_id: variantId, quantity })),
        customer: Object.fromEntries(formData.entries()),
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

  return <form action={submit} className="grid gap-10 lg:grid-cols-[1fr_340px]">
    <div className="space-y-8">
      <section className="border border-border bg-surface p-5 sm:p-7">
        <h2 className="font-display text-xl uppercase text-foreground">Contacto</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field name="customer_name" label="Nome completo" required />
          <Field name="customer_email" label="Email" type="email" required />
          <Field name="customer_phone" label="Telemóvel" type="tel" required />
          <Field name="nif" label="NIF (opcional)" inputMode="numeric" />
        </div>
      </section>
      <section className="border border-border bg-surface p-5 sm:p-7">
        <h2 className="font-display text-xl uppercase text-foreground">Morada de envio</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field name="shipping_name" label="Nome de quem recebe" required />
          <Field name="shipping_phone" label="Telemóvel" type="tel" required />
          <Field name="shipping_line1" label="Morada" required className="sm:col-span-2" />
          <Field name="shipping_line2" label="Complemento (opcional)" className="sm:col-span-2" />
          <Field name="shipping_postal_code" label="Código postal" required />
          <Field name="shipping_city" label="Localidade" required />
          <label className="block text-xs uppercase tracking-widest text-muted sm:col-span-2">País
            <select name="shipping_country" defaultValue="PT" className="mt-2 block w-full border border-border bg-background px-3 py-3 text-sm text-foreground">
              <option value="PT">Portugal</option><option value="ES">Espanha</option><option value="FR">França</option><option value="DE">Alemanha</option><option value="BE">Bélgica</option><option value="NL">Países Baixos</option><option value="IT">Itália</option><option value="AT">Áustria</option><option value="IE">Irlanda</option><option value="LU">Luxemburgo</option><option value="PL">Polónia</option><option value="SE">Suécia</option><option value="DK">Dinamarca</option><option value="FI">Finlândia</option><option value="GR">Grécia</option><option value="CZ">Chéquia</option><option value="RO">Roménia</option><option value="HU">Hungria</option><option value="BG">Bulgária</option><option value="HR">Croácia</option><option value="SI">Eslovénia</option><option value="SK">Eslováquia</option><option value="EE">Estónia</option><option value="LV">Letónia</option><option value="LT">Lituânia</option><option value="CY">Chipre</option><option value="MT">Malta</option><option value="IS">Islândia</option><option value="NO">Noruega</option><option value="CH">Suíça</option>
            </select>
          </label>
        </div>
        <input type="hidden" name="billing_same_as_shipping" value="true" />
      </section>
      <section className="border border-border bg-surface p-5 sm:p-7">
        <h2 className="font-display text-xl uppercase text-foreground">Pagamento</h2>
        <div className="mt-5 space-y-3">
          <label className="flex cursor-pointer items-start gap-3 border border-border p-4 text-sm"><input type="radio" name="payment_method" value="card" defaultChecked className="mt-0.5 accent-[var(--copper)]" /><span><strong className="font-medium text-foreground">Cartão</strong><span className="mt-1 block text-xs text-muted">Pagamento seguro por cartão.</span></span></label>
          <label className="flex cursor-pointer items-start gap-3 border border-border p-4 text-sm"><input type="radio" name="payment_method" value="mb_way" className="mt-0.5 accent-[var(--copper)]" /><span><strong className="font-medium text-foreground">MB WAY</strong><span className="mt-1 block text-xs text-muted">Receberás um pedido de pagamento na aplicação.</span></span></label>
        </div>
      </section>
      <section className="border border-border bg-surface p-5 sm:p-7">
        <label className="block font-display text-xl uppercase text-foreground" htmlFor="coupon_code">Cupão de desconto</label>
        <input id="coupon_code" name="coupon_code" autoComplete="off" className="mt-4 w-full border border-border bg-background px-3 py-3 text-sm uppercase text-foreground sm:max-w-sm" placeholder="Código do cupão" />
        <label className="mt-6 block text-xs uppercase tracking-widest text-muted" htmlFor="customer_note">Nota para a garagem (opcional)
          <textarea id="customer_note" name="customer_note" rows={3} className="mt-2 block w-full border border-border bg-background px-3 py-3 text-sm normal-case tracking-normal text-foreground" />
        </label>
      </section>
    </div>
    <aside className="h-fit border border-border bg-surface p-5 sm:p-6 lg:sticky lg:top-28">
      <h2 className="font-display text-xl uppercase text-foreground">Rever encomenda</h2>
      <ul className="mt-5 divide-y divide-border border-y border-border">
        {lines.map((line) => <li key={line.key} className="flex justify-between gap-4 py-3 text-sm"><span className="text-muted">{line.quantity} × {line.name} <span className="block text-xs">{line.variantName}</span></span><span className="shrink-0 text-foreground">{new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(line.price * line.quantity)}</span></li>)}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-muted">Os portes e o total final serão confirmados pelo servidor antes do pagamento. IVA incluído.</p>
      {error && <p role="alert" className="mt-5 border border-red/50 bg-red/10 p-3 text-sm text-red-light">{error}</p>}
      <button disabled={busy} className="mt-6 w-full bg-copper px-5 py-4 font-display text-xs uppercase tracking-widest text-black transition-colors hover:bg-copper-light disabled:opacity-50">{busy ? "A preparar pagamento…" : "Confirmar e pagar"}</button>
      <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">Ao continuar, confirmas que leste os <Link href="/termos-e-condicoes" className="underline">termos e condições</Link> e a <Link href="/envios-e-devolucoes" className="underline">política de envios e devoluções</Link>.</p>
    </aside>
  </form>;
}

function Field({ name, label, required, type = "text", className = "", inputMode }: { name: string; label: string; required?: boolean; type?: string; className?: string; inputMode?: "numeric" }) {
  return <label className={`block text-xs uppercase tracking-widest text-muted ${className}`}>{label}
    <input name={name} type={type} inputMode={inputMode} required={required} autoComplete={name.replaceAll("_", "-")} className="mt-2 block w-full border border-border bg-background px-3 py-3 text-sm normal-case tracking-normal text-foreground" />
  </label>;
}
