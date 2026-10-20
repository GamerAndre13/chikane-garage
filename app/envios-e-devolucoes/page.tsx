import Link from "next/link";

export const metadata = { title: "Envios e devoluções", description: "Informação sobre entregas, portes e pedidos de devolução da loja Chikane Garage." };

export default function EnviosDevolucoesPage() {
  return <main className="mx-auto max-w-4xl px-5 pb-20 pt-14 sm:px-8 sm:pt-20">
    <p className="font-display text-[10px] uppercase tracking-[0.28em] text-copper">Apoio à compra</p><h1 className="mt-3 font-display text-4xl font-bold uppercase text-foreground sm:text-6xl">Envios e devoluções</h1>
    <div className="mt-10 space-y-10 text-sm leading-7 text-muted">
      <section><h2 className="font-display text-xl uppercase text-foreground">Entregas</h2><p className="mt-3">Os destinos disponíveis, portes e prazos estimados são apresentados no checkout depois de indicares o endereço de entrega. O custo final é confirmado antes do pagamento. Se o destino ou o peso não estiverem cobertos, contacta-nos para obter uma cotação antes de concluir a encomenda.</p></section>
      <section><h2 className="font-display text-xl uppercase text-foreground">Acompanhamento</h2><p className="mt-3">Depois da expedição, o número e a ligação de seguimento ficam associados à encomenda. Usa o link seguro do comprovativo ou inicia sessão para consultar o estado.</p></section>
      <section><h2 className="font-display text-xl uppercase text-foreground">Devoluções</h2><p className="mt-3">Se pretenderes devolver um artigo, contacta-nos através do formulário de <Link href="/contacto" className="text-copper underline">contacto</Link>, indicando o número da encomenda e o artigo. A equipa confirma as instruções, a morada de devolução e os próximos passos antes do envio.</p><p className="mt-3">Os artigos devem ser devolvidos em condições adequadas, com os acessórios e embalagem que os acompanharam. Artigos personalizados, instalados ou usados podem estar sujeitos a condições específicas. Os direitos legais aplicáveis mantêm-se; consulta os <Link href="/termos-e-condicoes" className="text-copper underline">termos e condições</Link> e contacta-nos se precisares de ajuda.</p></section>
      <section className="border border-border bg-surface p-5 sm:p-7"><h2 className="font-display text-xl uppercase text-foreground">Precisas de ajuda?</h2><p className="mt-3">Fala connosco antes de concluir uma compra se tiveres dúvidas sobre compatibilidade, entrega ou devolução.</p><Link href="/contacto" className="mt-5 inline-flex bg-copper px-5 py-3 font-display text-xs uppercase tracking-widest text-black">Contactar a garagem</Link></section>
    </div>
  </main>;
}
