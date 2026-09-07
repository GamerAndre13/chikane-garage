import Link from "next/link";

export const metadata = {
  title: "Sobre Nós | Chikane Garage",
  description: "Conhece a história e o processo da Chikane Garage — especialistas em viaturas diesel BMW de performance.",
};

const STEPS = [
  { number: "01", title: "Seleção", description: "Cada viatura é escolhida a dedo. Analisamos histórico, especificações e estado geral — apenas a melhor passa ao próximo nível." },
  { number: "02", title: "Inspecção", description: "Inspecção técnica completa. Motor, caixa, suspensão, carroçaria — nada é ignorado. Documentamos tudo com fotografias e relatório." },
  { number: "03", title: "Transparência", description: "O que vês é exatamente o que recebes. Sem surpresas, sem omissões. Histórico detalhado, quilómetros verificados." },
  { number: "04", title: "Entrega", description: "Entregamos com garantia Chikane, documentação completa e a seriedade que investiste nestas semanas de processo." },
];

export default function SobrePage() {
  return (
    <div style={{ backgroundColor: "#0a0a0a" }}>
      <section className="relative overflow-hidden py-24 sm:py-32" style={{ backgroundColor: "#141414" }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="font-display text-xs uppercase tracking-[0.3em] text-copper">A Nossa História</p>
          <h1 className="mt-4 font-display text-5xl font-bold uppercase tracking-wide text-foreground sm:text-6xl lg:text-7xl">A Nossa História</h1>
          <div className="mt-4 h-0.5 w-20 bg-copper" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-20">
          <div>
            <h2 className="font-display text-3xl font-bold uppercase tracking-wide text-foreground sm:text-4xl">Especialistas em Performance Diesel BMW</h2>
            <div className="mt-3 h-0.5 w-12 bg-copper" />
            <div className="mt-6 space-y-5 text-sm leading-relaxed text-silver">
              <p>A Chikane Garage nasceu da paixão por viaturas diesel de performance — essas que combinam eficiência brutal com emoção ao volante.</p>
              <p>Não somos um stand convencional. Cada viatura no nosso catálogo passou por um processo rigoroso de seleção, inspecção e preparação.</p>
              <p>A nossa filosofia é simples: seleccionar, inspecionar, documentar e entregar. Sem intermediários, sem surpresas.</p>
            </div>
          </div>
          <div className="relative overflow-hidden rounded">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&q=80" alt="BMW Performance Diesel" className="h-80 w-full object-cover" />
          </div>
        </div>
      </section>

      <section style={{ backgroundColor: "#141414" }}>
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <p className="font-display text-xs uppercase tracking-[0.3em] text-copper">O Nosso Processo</p>
          <h2 className="mt-3 font-display text-3xl font-bold uppercase tracking-wide text-foreground sm:text-4xl">De Seleção a Entrega</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => (
              <div key={step.number} className="relative rounded border border-border p-6" style={{ backgroundColor: "#1c1c1c" }}>
                <span className="font-display text-5xl font-bold text-copper/20">{step.number}</span>
                <h3 className="mt-2 font-display text-lg font-bold uppercase tracking-wide text-foreground">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded border border-border p-12 text-center sm:p-16" style={{ backgroundColor: "#141414" }}>
          <p className="font-display text-xs uppercase tracking-[0.3em] text-copper">Pronto para começar?</p>
          <h2 className="mt-4 font-display text-3xl font-bold uppercase tracking-wide text-foreground sm:text-4xl">Ver a Nossa Seleção</h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted">Cada viatura é uma história. Descobre a próxima.</p>
          <Link href="/catalogo" className="mt-8 inline-block bg-copper px-8 py-4 font-display text-sm font-semibold uppercase tracking-widest text-white transition-colors hover:bg-copper-light">
            Ver Catálogo
          </Link>
        </div>
      </section>
    </div>
  );
}
