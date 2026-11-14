"use client";

import { useState } from "react";
import { validarEmail } from "@/lib/validacao";
import { FieldError, campoClasse } from "@/components/ui/field-error";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  // Erro do campo validado ao sair dele (item 13/14).
  const [erroEmail, setErroEmail] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");

    const fd = new FormData(e.currentTarget);
    const honey = (fd.get("website") || "") as string;
    const val = ((fd.get("email") as string) || "").trim();

    // Honeypot: bots preenchem o campo escondido → tratamos como sucesso e ignoramos
    if (honey) {
      setStatus("done");
      setMessage("Obrigado! Fica atento às novidades.");
      return;
    }

    // Validação do email: a mensagem fica por baixo do campo.
    const erro = validarEmail(val);
    setErroEmail(erro);
    if (erro) {
      setStatus("idle");
      return;
    }

    // Call API to subscribe and send confirmation email
    const response = await fetch("/api/newsletter/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: val }),
    });

    const data = await response.json();

    if (response.ok) {
      setStatus("done");
      // A mensagem vem sempre do servidor (uma única fonte de verdade),
      // incluindo o caso "já inscrito" — igual em todo o site.
      setMessage(data.message || (data.already ? "Este email já está inscrito na newsletter." : "Obrigado! Verifica o teu email para confirmar a subscrição."));
      setEmail("");
    } else {
      setStatus("error");
      setMessage(data.error || "Erro ao subscrever. Tenta novamente.");
    }
  }

  if (status === "done") {
    return <p role="status" className="mt-4 text-sm font-medium text-copper">{message}</p>;
  }

  return (
    <div>
      <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-3 sm:flex-row">
        {/* Campo honeypot escondido para apanhar bots */}
        <div className="hidden" aria-hidden="true">
          <input name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <label htmlFor="newsletter-email" className="sr-only">Email</label>
        <div className="flex-1">
          <input
            id="newsletter-email"
            type="email"
            name="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              // Depois de haver erro, revalida enquanto escreve.
              if (erroEmail) setErroEmail(validarEmail(e.target.value));
            }}
            onBlur={(e) => setErroEmail(validarEmail(e.target.value))}
            placeholder="O teu email"
            required
            autoComplete="email"
            aria-invalid={Boolean(erroEmail)}
            className={campoClasse(
              "w-full border border-border px-4 py-3 text-sm text-foreground outline-none focus:border-copper focus-visible:ring-2 focus-visible:ring-copper/60",
              erroEmail
            )}
            style={{ backgroundColor: "var(--background-alt)" }}
          />
          <FieldError message={erroEmail} />
        </div>
        <button
          type="submit"
          disabled={status === "loading"}
          className="shrink-0 bg-copper px-8 py-3 font-display text-xs font-semibold uppercase tracking-widest text-white transition-colors hover:bg-copper-light disabled:opacity-50"
        >
          {status === "loading" ? "A subscrever…" : "Subscrever"}
        </button>
      </form>
      {status === "error" && <p role="alert" className="mt-3 text-sm text-red-400">{message}</p>}
    </div>
  );
}