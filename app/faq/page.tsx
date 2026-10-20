import Link from "next/link";

export const metadata = { title: "Perguntas frequentes", description: "Respostas sobre encomendas, pagamentos, compatibilidade e apoio Chikane Garage." };

const questions = [
  ["Como sei se um artigo é compatível com a minha viatura?", "Consulta a descrição do artigo e confirma marca, modelo e ano antes de comprar. Se tiveres dúvidas, envia-nos os dados da viatura e a ligação do produto."],
  ["Que métodos de pagamento posso usar?", "O checkout apresenta os métodos disponíveis para a encomenda. O pagamento só é confirmado depois da validação do fornecedor de pagamento."],
  ["Como acompanho a minha encomenda?", "Usa o link seguro apresentado depois da compra ou consulta a área de encomendas depois de iniciares sessão. Quando a encomenda for expedida, o seguimento fica disponível nessa página."],
  ["Como posso pedir uma devolução?", "Contacta-nos com o número da encomenda e o artigo em causa. Consulta a página de envios e devoluções para conhecer o processo."],
  ["Não encontro o artigo de que preciso. O que faço?", "Envia-nos uma mensagem com a referência ou descrição da peça e os dados da viatura. A equipa confirma disponibilidade e compatibilidade."],
];

export default function FAQPage() {
  return <main className="mx-auto max-w-4xl px-5 pb-20 pt-14 sm:px-8 sm:pt-20"><p className="font-display text-[10px] uppercase tracking-[0.28em] text-copper">Apoio</p><h1 className="mt-3 font-display text-4xl font-bold uppercase text-foreground sm:text-6xl">Perguntas frequentes</h1><div className="mt-10 divide-y divide-border border-y border-border">{questions.map(([question, answer]) => <details key={question} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-display text-lg uppercase text-foreground">{question}<span className="text-copper transition-transform group-open:rotate-45">+</span></summary><p className="mt-4 max-w-3xl text-sm leading-7 text-muted">{answer}</p></details>)}</div><p className="mt-8 text-sm text-muted">Ainda tens dúvidas? <Link href="/contacto" className="text-copper underline">Fala connosco</Link>.</p></main>;
}
