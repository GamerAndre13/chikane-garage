"use client";

import { useEffect } from "react";
import Link from "next/link";

// Fronteira de erro da aplicação: em produção o Next esconde a mensagem dos
// erros do servidor, por isso mostra-se um aviso sóbrio com a referência
// (`digest`) que permite encontrar o erro no registo do Worker.
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-start justify-center px-6">
      <p className="font-display text-[10px] uppercase tracking-[0.3em] text-copper">Chikane Garage</p>
      <h1 className="mt-4 font-display text-3xl font-bold uppercase">Algo falhou</h1>
      <p className="mt-4 text-sm leading-6 text-muted">
        Não foi possível mostrar esta página. Podes tentar outra vez — se continuar a acontecer, envia-nos a referência abaixo
        para conseguirmos ver o erro nos registos.
      </p>
      {error.digest && <p className="mt-4 border border-border px-3 py-2 font-mono text-xs text-muted">Referência: {error.digest}</p>}
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <button onClick={() => retry()} className="bg-copper px-5 py-3 font-display text-xs uppercase tracking-widest text-black">Tentar novamente</button>
        <Link href="/" className="border border-border px-5 py-3 font-display text-xs uppercase tracking-widest text-muted hover:border-copper hover:text-copper">Voltar ao início</Link>
      </div>
    </section>
  );
}
