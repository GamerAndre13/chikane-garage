import Link from "next/link";

export const metadata = {
  title: "About Us | Chikane Garage",
  description: "A história da Chikane Garage: viaturas BMW escolhidas, inspecionadas e conduzidas por quem as vende.",
};

export default function SobrePage() {
  return <div className="bg-[#090909]">
    <section className="relative flex min-h-[66vh] items-end overflow-hidden sm:min-h-[76vh]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="https://images.unsplash.com/photo-1555215695-3004980ad54e?w=2000&q=85" alt="BMW numa garagem ao anoitecer" className="absolute inset-0 h-full w-full object-cover object-center" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/65 to-black/10" />
      <div className="relative z-10 mx-auto w-full max-w-[1440px] px-5 pb-16 pt-24 sm:px-8 sm:pb-20 lg:px-12">
        <p className="font-display text-[10px] uppercase tracking-[0.28em] text-copper">Desde 2016 <span className="px-2 text-white/35">·</span> Porto → Munique → Porto</p>
        <h1 className="mt-6 max-w-4xl font-display text-5xl font-bold uppercase leading-[0.92] tracking-tight text-white sm:text-7xl lg:text-[6.5rem]">Não vendemos<br/><span className="text-copper">carros usados.</span></h1>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base">Trazemos as unidades que nós próprios conduziríamos. Uma de cada vez, escolhida à mão em leilões fechados e stands privados na Alemanha.</p>
      </div>
      <div className="absolute bottom-0 left-5 h-px w-20 bg-copper sm:left-8 lg:left-12" />
    </section>

    <section className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
      <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
        <div className="max-w-2xl">
          <p className="font-display text-[10px] uppercase tracking-[0.26em] text-copper">A História</p>
          <h2 className="mt-5 font-display text-4xl font-semibold uppercase leading-[1.05] tracking-tight text-white sm:text-6xl">Começou com um 320d e demasiadas viagens à Baviera</h2>
          <div className="mt-7 h-px w-16 bg-copper" />
          <div className="mt-7 space-y-5 text-sm leading-[1.9] text-white/60 sm:text-base">
            <p>O primeiro carro foi para mim. Um 320d M Sport encontrado num pequeno stand perto de Ingolstadt, trazido de volta pela A1 numa noite de Novembro. Depois foi para um amigo. Depois para o amigo dele. Ao fim de dois anos, o hobby tinha-se tornado uma garagem.</p>
            <p>A Chikane Garage nasceu dessa obsessão: perceber que a diferença entre um bom e um mau negócio está nos detalhes que ninguém verifica — o histórico real, a corrosão nos braços de suspensão, o desgaste dos bancos que não bate certo com a quilometragem declarada.</p>
            <p>Hoje viajamos à Alemanha todos os meses. Vemos os carros pessoalmente, fotografamos o que está mal antes de fotografar o que está bem, e só compramos quando a unidade passa a nossa lista de 140 pontos. Se não passa, não entra na garagem.</p>
          </div>
          <Link href="/catalogo" className="mt-8 inline-flex items-center gap-5 border-b border-copper pb-3 font-display text-[10px] font-semibold uppercase tracking-[0.17em] text-white transition-colors hover:text-copper">Ver o que está na garagem <span className="text-copper">↗</span></Link>
        </div>

        <div className="grid grid-cols-2 gap-3 self-center">
          <figure className="relative col-span-2 overflow-hidden sm:col-span-1 sm:row-span-2 sm:mt-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=900&q=85" alt="Inspecção de uma viatura na garagem" className="h-64 w-full object-cover sm:h-full sm:min-h-[480px]" />
            <figcaption className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-4 pb-4 pt-12 font-display text-[9px] uppercase tracking-[0.18em] text-white">Inspecção · Munique</figcaption>
          </figure>
          <figure className="relative overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=700&q=85" alt="Detalhe automóvel verificado antes da entrega" className="h-44 w-full object-cover sm:h-60" />
            <figcaption className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-3 pb-3 pt-10 font-display text-[8px] uppercase tracking-[0.14em] text-white">Detalhe · Pré-entrega</figcaption>
          </figure>
          <div className="flex flex-col justify-center border border-white/10 bg-[#111] p-4 sm:p-6">
            <span className="font-display text-4xl font-semibold text-copper sm:text-5xl">140</span><span className="mt-2 text-[10px] leading-relaxed text-white/50 sm:text-xs">pontos de inspecção por viatura</span>
          </div>
          <div className="flex flex-col justify-center border border-white/10 bg-[#111] p-4 sm:p-6"><span className="font-display text-4xl font-semibold text-copper sm:text-5xl">12</span><span className="mt-2 text-[10px] leading-relaxed text-white/50 sm:text-xs">meses de garantia mecânica incluída</span></div>
          <div className="flex flex-col justify-center border border-white/10 bg-[#111] p-4 sm:p-6"><span className="font-display text-4xl font-semibold text-copper sm:text-5xl">100%</span><span className="mt-2 text-[10px] leading-relaxed text-white/50 sm:text-xs">das viaturas compradas presencialmente</span></div>
        </div>
      </div>
    </section>
  </div>;
}
