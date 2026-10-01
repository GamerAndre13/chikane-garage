import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sobre Nós",
  description: "Conhece a Chikane Garage e consulta o catálogo de viaturas disponíveis.",
};

export default function SobrePage() {
  return <div className="bg-[#090909]">
    <section className="relative flex min-h-[62vh] items-end overflow-hidden sm:min-h-[72vh]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1800&q=75" alt="Automóvel numa garagem, imagem ilustrativa" className="absolute inset-0 h-full w-full object-cover object-center" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/65 to-black/20" />
      <div className="relative z-10 mx-auto w-full max-w-[1440px] px-5 pb-16 pt-24 sm:px-8 sm:pb-20 lg:px-12">
        <p className="font-display text-[10px] uppercase tracking-[0.28em] text-copper">Chikane Garage</p>
        <h1 className="mt-6 max-w-4xl font-display text-5xl font-bold uppercase leading-[0.92] tracking-tight text-white sm:text-7xl lg:text-[6.5rem]">Viaturas.<br/><span className="text-copper">Sem rodeios.</span></h1>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">A Chikane Garage apresenta viaturas e respetiva informação num só lugar. Consulta o catálogo e fala connosco para esclarecer dúvidas sobre cada unidade.</p>
        <Link href="/catalogo" className="mt-8 inline-flex min-h-12 items-center bg-copper px-6 py-4 font-display text-xs font-semibold uppercase tracking-widest text-black transition-colors hover:bg-copper-light">Explorar catálogo</Link>
      </div>
    </section>
    <section className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
      <div className="grid gap-10 md:grid-cols-2 md:gap-16">
        <div><p className="font-display text-[10px] uppercase tracking-[0.26em] text-copper">Como funciona</p><h2 className="mt-4 font-display text-3xl font-semibold uppercase leading-tight text-white sm:text-4xl">Informação por viatura</h2><p className="mt-5 text-sm leading-7 text-white/70">Cada ficha reúne os dados disponíveis, fotografias, equipamento e preço indicado. Como as condições podem variar de unidade para unidade, confirma diretamente com a equipa os detalhes antes de tomar uma decisão.</p></div>
        <div className="border border-white/10 bg-[#111] p-6 sm:p-8"><h2 className="font-display text-xl font-semibold uppercase text-white">Queres saber mais?</h2><p className="mt-3 text-sm leading-6 text-white/70">Envia um pedido sobre uma viatura específica ou coloca uma questão geral através do formulário.</p><Link href="/contacto" className="mt-6 inline-flex min-h-11 items-center border border-copper px-5 py-3 font-display text-xs font-semibold uppercase tracking-widest text-copper transition-colors hover:bg-copper hover:text-black">Contactar a equipa</Link></div>
      </div>
    </section>
  </div>;
}
