import { CheckoutForm } from "@/components/shop/checkout-form";

export const metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return <div className="mx-auto max-w-[1280px] px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:px-12">
    <p className="font-display text-[10px] uppercase tracking-[0.28em] text-copper">Compra segura</p>
    <h1 className="mt-3 font-display text-5xl font-bold uppercase leading-none text-foreground sm:text-7xl">Finalizar encomenda</h1>
    <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted">Podes comprar como convidado. A encomenda só fica paga depois da confirmação do prestador de pagamento.</p>
    <div className="mt-10"><CheckoutForm /></div>
  </div>;
}
