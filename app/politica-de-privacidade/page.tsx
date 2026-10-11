import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade | Chikane Garage",
  description: "Como a Chikane Garage recolhe, utiliza e protege os dados pessoais dos utilizadores do site, em conformidade com o RGPD.",
};

const sections = [
  { num: "1", title: "Responsável pelo tratamento", text: "O responsável pelo tratamento dos dados pessoais recolhidos através do site é a Chikane Garage — [firma/NIPC e morada da sede a preencher pelo titular]. Para qualquer pedido relativo à proteção de dados, contacta-nos através da página de Contacto ou pelos canais indicados no rodapé do site." },
  { num: "2", title: "Dados que recolhemos", text: "Recolhemos apenas os dados estritamente necessários às funcionalidades que utilizas, em especial: (i) dados de contacto — nome, email e telefone — quando envias um pedido de informação ou de test drive, juntamente com a viatura e a data pretendida; (ii) dados da conta — email e palavra-passe — quando crias uma conta, bem como os dados que optes por adicionar ao perfil (nome, telefone e fotografia); (iii) o email que submetes à newsletter; e (iv) dados técnicos de utilização, como endereço IP, tipo de dispositivo e páginas visitadas, quando autorizas a medição de audiência. Não usamos os formulários para recolher dados sensíveis e pedimos que não os envies." },
  { num: "3", title: "Finalidades e fundamento jurídico", text: "Os dados são tratados para as seguintes finalidades e com os seguintes fundamentos: (i) responder a pedidos de informação e gerir marcações de test drive — execução de diligências pré-contratuais a teu pedido; (ii) gerir a conta, favoritos e histórico de pedidos — execução do contrato de prestação de serviços; (iii) envio da newsletter — consentimento, que podes retirar a qualquer momento; e (iv) medição de audiência — consentimento. Em nenhum caso os dados são utilizados para finalidades incompatíveis com as aqui descritas." },
  { num: "4", title: "Consentimento e a sua retirada", text: "Sempre que o tratamento dependa do teu consentimento (por exemplo, newsletter ou medição de audiência), este é pedido de forma livre e informada. Podes retirar o consentimento a qualquer momento: cancelando a subscrição da newsletter, alterando a escolha nas Preferências de cookies (rodapé) ou contactando-nos. A retirada do consentimento não afeta a licitude do tratamento realizado anteriormente com base no mesmo." },
  { num: "5", title: "Conservação dos dados", text: "Os dados são conservados apenas pelo período necessário às finalidades que motivaram a sua recolha: (i) os dados de pedidos de contacto e test drive durante o tempo necessário ao seu tratamento e ao cumprimento de obrigações legais aplicáveis; (ii) os dados da conta até à sua eliminação a teu pedido; (iii) o email da newsletter até ao cancelamento da subscrição; e (iv) os dados de medição de audiência pelo período definido pela ferramenta utilizada. Findo o prazo, os dados são eliminados ou anonimizados." },
  { num: "6", title: "Partilha com prestadores de serviços", text: "O funcionamento do site depende de prestadores de serviços que tratam dados em nosso nome e sob a nossa instrução: alojamento e rede de distribuição (Cloudflare), base de dados e autenticação (Supabase), armazenamento de imagens, envio de emails transacionais e newsletter, e, se autorizares, medição de audiência (Google Analytics). Apenas partilhamos os dados necessários à prestação de cada serviço, exigindo a todos os prestadores compromissos contratuais de confidencialidade e segurança. Não vendemos nem cedemos os teus dados a terceiros para fins de marketing." },
  { num: "7", title: "Transferências internacionais", text: "Alguns prestadores podem processar dados em países fora do Espaço Económico Europeu. Sempre que tal aconteça, garantimos que o tratamento respeita o RGPD, através de decisões de adequação da Comissão Europeia ou de cláusulas contratuais-tipo, e adotamos as medidas adicionais necessárias à proteção dos dados." },
  { num: "8", title: "Os teus direitos", text: "Ao abrigo do Regulamento Geral sobre a Proteção de Dados (RGPD), tens o direito de aceder aos teus dados, solicitar a sua retificação ou apagamento, a limitação do tratamento, a portabilidade e a oposição ao tratamento, bem como de retirar consentimentos previamente dados. Podes exercer estes direitos gratuitamente, contactando-nos através da página de Contacto. Pedidos manifestamente infundados ou excessivos podem ser recusados ou sujeitos a uma taxa razoável. Respondemos no prazo legal de 30 dias." },
  { num: "9", title: "Segurança", text: "Aplicamos medidas técnicas e organizativas adequadas ao risco, incluindo encriptação em trânsito (HTTPS), controlo de acessos, monitorização e políticas internas de tratamento, para proteger os dados contra acesso não autorizado, perda, alteração ou divulgação. Ainda assim, nenhum sistema é absolutamente seguro: a proteção da tua palavra-passe e do teu dispositivo também dependem de ti." },
  { num: "10", title: "Cookies e medição de audiência", text: "O site utiliza armazenamento estritamente necessário ao funcionamento da sessão e à guarda das tuas preferências (incluindo o consentimento). A medição de audiência (Google Analytics, com anonimização de IP) permanece desligada até que, através do banner de cookies, aceites a sua utilização. Em qualquer momento podes alterar a escolha nas Preferências de cookies, no rodapé, onde a escolha fica sempre disponível." },
  { num: "11", title: "Alterações a esta política", text: "Podemos atualizar esta Política de Privacidade sempre que necessário, publicando a versão em vigor nesta página com a respetiva data. Se forem introduzidas alterações relevantes, serás informado através de um aviso no site ou, quando aplicável, por contacto direto." },
  { num: "12", title: "Contactos e autoridade de controlo", text: "Para dúvidas ou pedidos relacionados com a privacidade, contacta-nos através da página de Contacto. Tens ainda o direito de apresentar reclamação à Comissão Nacional de Proteção de Dados (CNPD) — Av. D. Carlos I, 134, 1.º, 1200-651 Lisboa — ou à autoridade de controlo do teu país de residência." },
];

export default function PrivacyPage() {
  return <article className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-24">
    <p className="font-display text-xs uppercase tracking-[0.25em] text-copper">Informação legal</p>
    <h1 className="mt-4 font-display text-4xl font-bold uppercase tracking-tight text-white sm:text-6xl">Política de Privacidade</h1>
    <p className="mt-5 text-sm leading-7 text-white/65">A tua privacidade é levada a sério. Esta política explica, de forma clara e transparente, que dados tratamos, para que finalidades, com que fundamento e que direitos tens ao abrigo do Regulamento Geral sobre a Proteção de Dados (RGPD).</p>
    <p className="mt-3 text-xs uppercase tracking-[0.15em] text-white/40">Última atualização: 11 de outubro de 2026</p>
    <div className="mt-10 space-y-8">
      {sections.map((section) => (
        <section key={section.num} id={`artigo-${section.num}`} className="border-t border-white/10 pt-6">
          <h2 className="font-display text-xl font-semibold uppercase tracking-wide text-white"><span className="mr-3 inline-flex h-8 w-8 items-center justify-center border border-copper text-sm text-copper">{section.num}</span>{section.title}</h2>
          <p className="mt-3 text-sm leading-7 text-white/65">{section.text}</p>
        </section>
      ))}
    </div>
    <section className="mt-12 border-t border-white/10 pt-6">
      <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-white">Contactos</h2>
      <p className="mt-3 text-sm leading-7 text-white/65">Podes exercer os teus direitos e esclarecer qualquer questão através da <Link href="/contacto" className="text-copper underline underline-offset-4 hover:text-copper-light">página de Contacto</Link>.</p>
    </section>
  </article>;
}