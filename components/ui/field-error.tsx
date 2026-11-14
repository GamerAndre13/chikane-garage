import type { CSSProperties } from "react";

// Ajudas visuais comuns a todos os formulários (itens 13/14):
// - o erro aparece sempre por baixo do campo, a vermelho;
// - o campo fica com o rebordo vermelho enquanto o valor não for válido.

export function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1.5 text-[11px] leading-5 text-red-400">
      {message}
    </p>
  );
}

// Nos formulários com classes Tailwind, o "!" garante que o vermelho ganha ao
// border-border/focus:border-copper do tema.
export const CAMPO_COM_ERRO = "!border-red-500 focus:!border-red-500 focus-visible:!ring-red-500/60";

/** Junta a classe de erro à classe base do campo. */
export function campoClasse(base: string, erro?: string | null): string {
  return erro ? `${base} ${CAMPO_COM_ERRO}` : base;
}

/** O mesmo para os formulários que usam estilos inline. */
export function campoEstilo(base: CSSProperties, erro?: string | null): CSSProperties {
  return erro ? { ...base, borderColor: "#ef4444" } : base;
}
