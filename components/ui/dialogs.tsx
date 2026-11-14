"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

// ── Popups do backoffice ──────────────────────────────────────────────────
// Substituem o alert/confirm/prompt do browser (que mostram o endereço do
// site no título e não seguem o tema). Um único diálogo de cada vez, com
// Escape para fechar, foco preso no cartão e as mesmas cores do site.

type Erro = {
  tipo: "erro";
  titulo: string;
  mensagem: string;
  detalhe?: string;
  resolver: () => void;
};

type Confirmacao = {
  tipo: "confirmar";
  titulo: string;
  mensagem?: string;
  confirmar: string;
  cancelar: string;
  perigo: boolean;
  resolver: (valor: boolean) => void;
};

type Pergunta = {
  tipo: "pergunta";
  titulo: string;
  mensagem?: string;
  label: string;
  valorInicial: string;
  placeholder?: string;
  multilinha: boolean;
  maxLength?: number;
  resolver: (valor: string | null) => void;
};

type Dialogo = Erro | Confirmacao | Pergunta;

type DialogsContextValue = {
  mostrarErro: (input: { titulo?: string; mensagem: string; detalhe?: string }) => void;
  confirmar: (input: {
    titulo: string;
    mensagem?: string;
    confirmar?: string;
    cancelar?: string;
    perigo?: boolean;
  }) => Promise<boolean>;
  perguntar: (input: {
    titulo: string;
    mensagem?: string;
    label?: string;
    valorInicial?: string;
    placeholder?: string;
    multilinha?: boolean;
    maxLength?: number;
  }) => Promise<string | null>;
};

const DialogsContext = createContext<DialogsContextValue | null>(null);

const botaoBase =
  "inline-flex min-h-11 items-center justify-center rounded border px-4 text-xs font-semibold uppercase tracking-widest transition-colors";

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const [texto, setTexto] = useState("");
  const cartaoRef = useRef<HTMLDivElement | null>(null);

  const mostrarErro = useCallback<DialogsContextValue["mostrarErro"]>((input) => {
    setDialogo({
      tipo: "erro",
      titulo: input.titulo ?? "Não foi possível concluir",
      mensagem: input.mensagem,
      detalhe: input.detalhe,
      resolver: () => setDialogo(null),
    });
  }, []);

  const confirmar = useCallback<DialogsContextValue["confirmar"]>(
    (input) =>
      new Promise<boolean>((resolve) => {
        setDialogo({
          tipo: "confirmar",
          titulo: input.titulo,
          mensagem: input.mensagem,
          confirmar: input.confirmar ?? "Confirmar",
          cancelar: input.cancelar ?? "Cancelar",
          perigo: input.perigo ?? false,
          resolver: (valor) => {
            setDialogo(null);
            resolve(valor);
          },
        });
      }),
    []
  );

  const perguntar = useCallback<DialogsContextValue["perguntar"]>(
    (input) =>
      new Promise<string | null>((resolve) => {
        const inicial = input.valorInicial ?? "";
        setTexto(inicial);
        setDialogo({
          tipo: "pergunta",
          titulo: input.titulo,
          mensagem: input.mensagem,
          label: input.label ?? "",
          valorInicial: inicial,
          placeholder: input.placeholder,
          multilinha: input.multilinha ?? false,
          maxLength: input.maxLength,
          resolver: (valor) => {
            setDialogo(null);
            resolve(valor);
          },
        });
      }),
    []
  );

  const fechar = useCallback(() => {
    setDialogo((atual) => {
      if (!atual) return null;
      if (atual.tipo === "erro") atual.resolver();
      else if (atual.tipo === "confirmar") atual.resolver(false);
      else atual.resolver(null);
      return null;
    });
  }, []);

  // Escape fecha; o scroll da página fica travado enquanto o popup está aberto
  // e o foco vai para o primeiro controlo (ou para o cartão).
  useEffect(() => {
    if (!dialogo) return;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        fechar();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const alvo = cartaoRef.current?.querySelector<HTMLElement>("input, textarea, button");
    window.setTimeout(() => {
      if (alvo) alvo.focus();
      else cartaoRef.current?.focus();
    }, 0);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflowAnterior;
    };
  }, [dialogo, fechar]);

  const confirmarPergunta = () => {
    if (!dialogo || dialogo.tipo !== "pergunta") return;
    dialogo.resolver(texto.trim() ? texto : null);
  };

  return (
    <DialogsContext.Provider value={{ mostrarErro, confirmar, perguntar }}>
      {children}
      {dialogo && (
        <div className="fixed inset-0 z-[95] flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            aria-label="Fechar"
            onClick={fechar}
            className="absolute inset-0 h-full w-full cursor-default bg-black/70 backdrop-blur-sm"
          />
          <div
            ref={cartaoRef}
            role={dialogo.tipo === "erro" ? "alertdialog" : "dialog"}
            aria-modal="true"
            aria-labelledby="dialogo-titulo"
            aria-describedby={dialogo.tipo !== "erro" && dialogo.mensagem ? "dialogo-mensagem" : undefined}
            tabIndex={-1}
            className="dialog-enter relative w-full max-w-md rounded-md border bg-surface-mid p-5 shadow-2xl outline-none"
            style={{
              borderColor: "var(--border)",
              borderTop: `3px solid ${dialogo.tipo === "erro" ? "var(--red-light)" : dialogo.tipo === "confirmar" && dialogo.perigo ? "var(--red-light)" : "var(--copper-deep)"}`,
            }}
          >
            <h2
              id="dialogo-titulo"
              className="text-sm uppercase tracking-widest"
              style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
            >
              {dialogo.titulo}
            </h2>

            {dialogo.tipo !== "erro" && dialogo.mensagem && (
              <p id="dialogo-mensagem" className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                {dialogo.mensagem}
              </p>
            )}

            {dialogo.tipo === "erro" && (
              <>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
                  {dialogo.mensagem}
                </p>
                {dialogo.detalhe && (
                  <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)", wordBreak: "break-word" }}>
                    {dialogo.detalhe}
                  </p>
                )}
              </>
            )}

            {dialogo.tipo === "pergunta" && (
              <div className="mt-3">
                {dialogo.label && (
                  <label htmlFor="dialogo-campo" className="mb-1 block text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                    {dialogo.label}
                  </label>
                )}
                {dialogo.multilinha ? (
                  <textarea
                    id="dialogo-campo"
                    rows={4}
                    value={texto}
                    maxLength={dialogo.maxLength}
                    placeholder={dialogo.placeholder}
                    onChange={(event) => setTexto(event.target.value)}
                    className="w-full resize-y rounded border bg-background px-3 py-2 text-sm"
                    style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                  />
                ) : (
                  <input
                    id="dialogo-campo"
                    value={texto}
                    maxLength={dialogo.maxLength}
                    placeholder={dialogo.placeholder}
                    onChange={(event) => setTexto(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        confirmarPergunta();
                      }
                    }}
                    className="w-full rounded border bg-background px-3 py-2 text-sm"
                    style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                  />
                )}
              </div>
            )}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {dialogo.tipo === "erro" ? (
                <button
                  type="button"
                  onClick={fechar}
                  className={botaoBase}
                  style={{ borderColor: "var(--copper-deep)", backgroundColor: "var(--copper-deep)", color: "var(--background-alt)" }}
                >
                  Fechar
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={fechar}
                    className={botaoBase}
                    style={{ borderColor: "var(--border)", color: "var(--silver)" }}
                  >
                    {dialogo.tipo === "confirmar" ? dialogo.cancelar : "Cancelar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (dialogo.tipo === "confirmar") dialogo.resolver(true);
                      else if (dialogo.tipo === "pergunta") confirmarPergunta();
                    }}
                    className={botaoBase}
                    style={
                      dialogo.tipo === "confirmar" && dialogo.perigo
                        ? { borderColor: "var(--red-light)", backgroundColor: "var(--red-light)", color: "#fff" }
                        : { borderColor: "var(--copper-deep)", backgroundColor: "var(--copper-deep)", color: "var(--background-alt)" }
                    }
                  >
                    {dialogo.tipo === "confirmar" ? dialogo.confirmar : "Guardar"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </DialogsContext.Provider>
  );
}

export function useDialogs() {
  const context = useContext(DialogsContext);
  if (!context) {
    throw new Error("useDialogs tem de ser usado dentro de <DialogProvider>.");
  }
  return context;
}
