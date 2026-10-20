import Link from "next/link";

export const metadata = { title: "Livro de Reclamações", description: "Livro de Reclamações da Chikane Garage: como apresentar uma reclamação, prazos de resposta e entidades de apoio." };

export default function LivroReclamacoesPage() {
  return <main className="mx-auto max-w-4xl px-5 pb-20 pt-14 sm:px-8 sm:pt-20">
    <p className="font-display text-[10px] uppercase tracking-[0.28em] text-copper">Proteção do consumidor</p><h1 className="mt-3 font-display text-4xl font-bold uppercase text-foreground sm:text-6xl">Livro de Reclamações</h1>
    <div className="mt-10 space-y-10 text-sm leading-7 text-muted">
      <section><h2 className="font-display text-xl uppercase text-foreground">Como apresentar uma reclamação</h2><p className="mt-3">Se algo correu mal numa compra, numa viatura ou no atendimento, podes apresentar uma reclamação. Fazemo-la entrar no Livro de Reclamações e respondemos por escrito dentro do prazo legal.</p><p className="mt-3">Podes usar o Livro de Reclamações Eletrónico, do consumidor para todas as empresas portuguesas:</p><a href="https://www.livroreclamacoes.queixa.pt" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex bg-copper px-5 py-3 font-display text-xs uppercase tracking-widest text-black">Abrir o Livro de Reclamações Eletrónico</a></section>

      <section><h2 className="font-display text-xl uppercase text-foreground">Livro físico</h2><p className="mt-3">O Livro de Reclamações (em suporte físico) está disponível no estabelecimento, mediante pedido. A reclamação é escrita por ti, com a tua identificação, e recebe um número de registo. Cópia fica connosco; o talão com o número fica contigo.</p></section>

      <section><h2 className="font-display text-xl uppercase text-foreground">Prazos de resposta</h2><p className="mt-3">A resposta tem de ser dada no prazo de <strong className="text-foreground">10 dias úteis</strong>, por escrito, identificando quem responde e o que se propõe. Reclamações infundadas são igualmente registadas e respondidas.</p></section>

      <section><h2 className="font-display text-xl uppercase text-foreground">Reclamação direta connosco</h2><p className="mt-3">Se preferires resolver antes de formalizar, fala connosco: a maioria dos problemas resolve-se por aqui. Usa o formulário de <Link href="/contacto" className="text-copper underline">contacto</Link>, indicando o número da encomenda ou o nome da viatura, e uma descrição objetiva do que aconteceu.</p></section>

      <section><h2 className="font-display text-xl uppercase text-foreground">Outras entidades</h2><p className="mt-3">Para informação e apoio ao consumidor: <a href="https://www.consumidor.gov.pt" target="_blank" rel="noopener noreferrer" className="text-copper underline">Portal do Consumidor</a> (consumidor.gov.pt), linha de apoio 300 883 883 e <a href="https://www.deco.proteste.pt" target="_blank" rel="noopener noreferrer" className="text-copper underline">DECO Proteste</a>. Para compras a empresas de outro país da União Europeia: <a href="https://www.europe-consumers.eu" target="_blank" rel="noopener noreferrer" className="text-copper underline">Centro Europeu do Consumidor</a>.</p></section>

      <section className="border border-border bg-surface p-5 sm:p-7"><h2 className="font-display text-xl uppercase text-foreground">Antes de reclamar</h2><p className="mt-3">Tenta sempre connosco primeiro. Se não ficar resolvido, o Livro de Reclamações garante que a tua queixa fica registada e é respondida.</p><Link href="/contacto" className="mt-5 inline-flex bg-copper px-5 py-3 font-display text-xs uppercase tracking-widest text-black">Falar com a garagem</Link></section>
    </div>
  </main>;
}
