import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Como a Chikane Garage trata os dados pessoais enviados através do site.",
};

const sections = [
  { title: "Responsável pelo tratamento", text: "O responsável pelo tratamento é a entidade que explora a Chikane Garage. A identificação legal completa (firma, NIF/NIPC e morada da sede) deve ser confirmada e publicada pelo titular antes da utilização comercial deste site. Para pedidos de privacidade, contacta-nos através da página Contacto." },
  { title: "Dados e finalidades", text: "O site pode tratar os dados que envias em pedidos de contacto ou test drive (nome, email, telefone, mensagem, viatura e data pretendida), o endereço de email submetido à newsletter e os dados técnicos necessários ao funcionamento da conta. Usamos esses dados para responder ao pedido, gerir a conta ou enviar novidades quando subscreves a lista. Não uses o formulário para enviar dados sensíveis." },
  { title: "Fundamento e escolha", text: "Os dados de um pedido são usados para responder ao que solicitaste; os dados da newsletter são usados para esse envio até cancelares a subscrição. Cookies opcionais de medição só são utilizados após consentimento. O consentimento pode ser retirado nas Preferências de cookies, sem afetar o tratamento anterior à retirada." },
  { title: "Prestadores e transferências", text: "O funcionamento do site depende de prestadores de alojamento, base de dados e armazenamento de imagens configurados pela Chikane Garage. Se analytics for ativado, o prestador indicado na ferramenta também recebe dados técnicos de utilização. A lista de prestadores, localização do tratamento e garantias de transferência deve ser confirmada pelo responsável antes da publicação." },
  { title: "Conservação e direitos", text: "Os dados devem ser conservados apenas pelo período necessário para responder ao pedido, cumprir obrigações legais ou gerir a subscrição. Podes solicitar acesso, retificação, apagamento, limitação ou oposição ao tratamento, e retirar consentimentos, usando a página Contacto. Podes ainda apresentar reclamação à Comissão Nacional de Proteção de Dados (CNPD). A entidade responsável deve completar um canal de contacto direto para estes pedidos." },
  { title: "Cookies", text: "O site usa armazenamento estritamente necessário à sessão e às preferências escolhidas. Medição opcional de visitas permanece desligada até aceitares, e só será carregada se o identificador de analytics estiver configurado. Consulta a página de Termos e Condições e gere a escolha em Preferências de cookies no rodapé." },
];

export default function PrivacyPage() {
  return <article className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-24"><p className="font-display text-xs uppercase tracking-[0.25em] text-copper">Informação legal</p><h1 className="mt-4 font-display text-4xl font-bold uppercase tracking-tight text-white sm:text-6xl">Política de Privacidade</h1><p className="mt-5 text-sm leading-7 text-white/65">Esta página descreve os tratamentos atualmente visíveis no código do site. A entidade responsável deve confirmar os prazos, os prestadores e os dados de identificação antes de a política ser considerada final.</p><div className="mt-10 space-y-8">{sections.map((section) => <section key={section.title} className="border-t border-white/10 pt-6"><h2 className="font-display text-xl font-semibold uppercase tracking-wide text-white">{section.title}</h2><p className="mt-3 text-sm leading-7 text-white/65">{section.text}</p></section>)}</div></article>;
}
