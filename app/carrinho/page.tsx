import { CartView } from "@/components/shop/cart-view";

export const metadata = { title: "Carrinho" };

export default function CarrinhoPage() {
  return <div className="mx-auto max-w-[1280px] px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:px-12">
    <p className="font-display text-[10px] uppercase tracking-[0.28em] text-copper">Garage store</p>
    <h1 className="mt-3 font-display text-5xl font-bold uppercase leading-none text-foreground sm:text-7xl">O teu carrinho</h1>
    <div className="mt-10"><CartView /></div>
  </div>;
}
