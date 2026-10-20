import Link from "next/link";

export const metadata = { title: "Perguntas frequentes", description: "Respostas sobre viaturas, encomendas, pagamentos, portes e apoio na Chikane Garage." };

const groups = [
  {
    title: "Viaturas",
    questions: [
      ["Como vejo as viaturas disponíveis?", "O catálogo (/catalogo) mostra todas as unidades com filtros de marca, modelo, combustível, cor, estilo, potência, preço, ano e quilómetros. Se procuras novas, vai a /novos; se procuras usadas, a /usados."],
      ["O que significa 'viatura reservada'?", "Significa que outro cliente tem o processo em curso. A ficha mantém-se visível com o estado assinalizado. Se te interessar na mesma, fala connosco: entramos na lista de espera e avisamos-te se voltar a ficar disponível."],
      ["As viaturas vendidas continuam no catálogo?", "Durante alguns dias, para que se veja o histórico do que passou pela garagem. Depois desaparecem do catálogo."],
      ["Posso marcar um test-drive?", "Sim. Na ficha de cada viatura ou na página de contacto escolhes a data e o horário. A marcação é confirmada pela equipa."],
      ["As viaturas têm garantia?", "Sim. As condições de garantia são indicadas na ficha de cada unidade e confirmadas por escrito antes da entrega."],
      ["Aceitam a minha viatura como retoma?", "Aceitamos. Envia os dados da tua viatura (marca, modelo, ano, quilómetros e estado geral) pelo formulário de contacto e respondemos com uma proposta."],
      ["Posso comprar uma viatura por encomenda?", "Sim. As unidades novas entram por encomenda: configuração, prazo de entrega e condições são confirmados caso a caso. Fala connosco antes de avançar."],
      ["Como confirmo a disponibilidade de uma unidade?", "Pela ficha da viatura (o estado é atualizado no backoffice) ou diretamente connosco. Para unidades em movimento, a resposta costuma ser rápida."],
    ],
  },
  {
    title: "Loja e encomendas",
    questions: [
      ["Que artigos vendem na loja?", "Extras, peças e manutenção, detailing e limpeza, jantes e pneus, eletrónica e som, e merchandising — nas categorias /loja."],
      ["Como sei se um artigo é compatível com a minha viatura?", "Consulta a descrição do artigo e confirma marca, modelo e ano antes de comprar. Se tiveres dúvidas, envia-nos os dados da viatura e a ligação do produto."],
      ["Que métodos de pagamento posso usar?", "Cartão e MB Way. O pagamento só fica confirmado depois da validação do fornecedor de pagamento."],
      ["Quanto custam os portes e quanto demora a entrega?", "Os portes são calculados no checkout, em função do peso e do destino (Portugal continental, Madeira, Açores, Espanha e Europa), e o prazo estimado aparece antes de pagares."],
      ["Preciso de conta para comprar?", "Não. Podes comprar como convidado. Com conta, acompanhas as encomendas, guardas favoritos e acedes às tuas moradas."],
      ["Como acompanho a minha encomenda?", "Usa o link seguro apresentado depois da compra ou consulta a área de encomendas depois de iniciares sessão. Quando a encomenda for expedida, o seguimento fica disponível nessa página."],
      ["Posso levantar na garagem?", "Se preferires levantar o artigo, fala connosco antes de concluir a encomenda para confirmarmos a disponibilidade e prepararmos a recolha."],
      ["Como posso pedir uma devolução?", "Contacta-nos com o número da encomenda e o artigo em causa. Consulta a página de envios e devoluções para conhecer o processo e os prazos."],
      ["Recebi um artigo danificado ou errado?", "Fala connosco de imediato com o número da encomenda e fotografias do estado do artigo. Tratamos do encaminhamento, sem custos para ti quando o erro é nosso."],
      ["Não encontro o artigo de que preciso. O que faço?", "Envia-nos uma mensagem com a referência ou descrição da peça e os dados da viatura. A equipa confirma disponibilidade e compatibilidade."],
    ],
  },
  {
    title: "Conta e apoio",
    questions: [
      ["Como subscrevo a newsletter?", "No rodapé ou na homepage: regista o teu email e recebes as novidades em primeira mão."],
      ["Como vos contacto?", "Pela página de contacto, com três modos: pedir informação, marcar test-drive ou reservar uma viatura. Os contactos diretos estão no rodapé."],
      ["Tenho uma reclamação. Como a formalizo?", "Tenta primeiro connosco. Se não ficar resolvido, apresenta-a pelo Livro de Reclamações (físico ou eletrónico) — explicações em /livro-reclamacoes."],
      ["Os meus dados estão seguros?", "Só usamos os dados para tratar encomendas, marcações e newsletter, nunca os cedemos a terceiros para publicidade. Detalhes na política de privacidade."],
    ],
  },
];

export default function FAQPage() {
  return <main className="mx-auto max-w-4xl px-5 pb-20 pt-14 sm:px-8 sm:pt-20">
    <p className="font-display text-[10px] uppercase tracking-[0.28em] text-copper">Apoio</p>
    <h1 className="mt-3 font-display text-4xl font-bold uppercase text-foreground sm:text-6xl">Perguntas frequentes</h1>
    <div className="mt-10 space-y-12">
      {groups.map((group) => (
        <section key={group.title}>
          <h2 className="font-display text-xl font-semibold uppercase tracking-wide text-copper">{group.title}</h2>
          <div className="mt-4 divide-y divide-border border-y border-border">
            {group.questions.map(([question, answer]) => (
              <details key={question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-display text-lg uppercase text-foreground">
                  {question}
                  <span className="text-copper transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">{answer}</p>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
    <p className="mt-10 text-sm text-muted">Ainda tens dúvidas? <Link href="/contacto" className="text-copper underline">Fala connosco</Link>.</p>
  </main>;
}
