import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos e Condições",
  description: "Condições de utilização do site Chikane Garage e informação sobre pedidos de viaturas.",
};

const sections = [
  { title: "Identificação", text: "O site é apresentado sob a marca Chikane Garage. A firma, NIF/NIPC, morada postal, email e telefone do vendedor devem ser confirmados e publicados pelo responsável antes de aceitar encomendas ou concluir vendas." },
  { title: "Utilização do site", text: "O catálogo apresenta informação sobre viaturas e permite enviar pedidos de contacto ou test drive. Enviar um pedido não constitui, por si só, uma reserva, proposta aceite ou contrato de compra e venda. A disponibilidade, o preço, o equipamento, os quilómetros e os restantes dados de cada viatura devem ser confirmados com o vendedor antes da decisão de compra." },
  { title: "Informação das viaturas", text: "As especificações e fotografias são apresentadas para identificar a viatura. Podem existir erros ou alterações; prevalecem as condições e características acordadas por escrito para a viatura concreta. Garantia, financiamento, retoma, impostos, despesas, matrícula, entrega e forma de pagamento devem ser descritos individualmente antes de qualquer contrato." },
  { title: "Pedidos e comunicações", text: "Ao enviares um formulário, confirmas que os dados de contacto são teus e que podem ser usados para responder ao pedido. A subscrição da newsletter é opcional e pode ser cancelada a qualquer momento. Consulta a Política de Privacidade para saber como são tratados os dados." },
  { title: "Compra à distância e reclamações", text: "Quando a compra for celebrada à distância ou fora do estabelecimento, aplicam-se os direitos legais de informação e, quando aplicável, de livre resolução. As condições concretas, exceções legais e procedimento devem ser comunicados antes da celebração do contrato. A entidade vendedora deve disponibilizar o acesso ao Livro de Reclamações Eletrónico quando legalmente obrigada." },
  { title: "Lei aplicável", text: "A utilização do site está sujeita à legislação portuguesa e europeia aplicável, sem prejuízo das normas imperativas de proteção do consumidor. Em caso de litígio, podem aplicar-se mecanismos de resolução alternativa de litígios de consumo competentes." },
];

export default function TermsPage() {
  return <article className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-24"><p className="font-display text-xs uppercase tracking-[0.25em] text-copper">Informação legal</p><h1 className="mt-4 font-display text-4xl font-bold uppercase tracking-tight text-white sm:text-6xl">Termos &amp; Condições</h1><p className="mt-5 text-sm leading-7 text-white/65">Estes termos cobrem a utilização do site. Não substituem as condições específicas da venda nem a informação pré-contratual que deve ser fornecida ao consumidor.</p><div className="mt-10 space-y-8">{sections.map((section) => <section key={section.title} className="border-t border-white/10 pt-6"><h2 className="font-display text-xl font-semibold uppercase tracking-wide text-white">{section.title}</h2><p className="mt-3 text-sm leading-7 text-white/65">{section.text}</p></section>)}</div></article>;
}
