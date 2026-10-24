// Aviso de erro no topo das páginas do backoffice. As Server Actions da loja
// voltam à sua página com `?erro=<mensagem>` em vez de lançar (em produção o
// Next esconde a mensagem dos erros lançados: aparecia só «Minified React error
// #441»). Ver a nota em app/actions/shop-admin.ts.
export function AvisoErro({ erro }: { erro?: string | string[] }) {
  const mensagem = Array.isArray(erro) ? erro[0] : erro;
  if (!mensagem) return null;
  return <p role="alert" className="mt-5 border border-red/40 bg-red/10 p-3 text-sm leading-relaxed text-red-light">{mensagem}</p>;
}

// Confirmação simples (guardar, apagar, reordenar) — usada nas mesmas páginas.
export function AvisoOk({ ok }: { ok?: string | string[] }) {
  const mensagem = Array.isArray(ok) ? ok[0] : ok;
  if (!mensagem) return null;
  return <p role="status" className="mt-5 border border-success/40 bg-success/10 p-3 text-sm leading-relaxed text-success">{mensagem}</p>;
}
