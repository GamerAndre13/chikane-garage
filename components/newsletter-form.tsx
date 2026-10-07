"use client";

import { useState } from "react";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

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

    // Validação simples de email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setStatus("error");
      setMessage("Introduz um email válido.");
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
      setMessage("Obrigado! Verifica o teu email para confirmar a subscrição.");
      setEmail("");
    } else if (response.status === 400 && data.error?.includes("já")) {
      setStatus("done");
      setMessage("Já te encontras na newsletter.");
      setEmail("");
    } else {
      setStatus("error");
      setMessage(data.error || "Erro ao subscrever. Tenta novamente.");
    }
  }

  if (status === "done") {
    return <p className="mt-4 text-sm font-medium text-copper">{message}</p>;
  }

  return (
    <div>
      <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-3 sm:flex-row">
        {/* Campo honeypot escondido para apanhar bots */}
        <div className="hidden" aria-hidden="true">
          <input name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="O teu email"
          required
          className="flex-1 border border-border px-4 py-3 text-sm text-foreground outline-none focus:border-copper"
          style={{ backgroundColor: "#0a0a0a" }}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="shrink-0 bg-copper px-8 py-3 font-display text-xs font-semibold uppercase tracking-widest text-white transition-colors hover:bg-copper-light disabled:opacity-50"
        >
          {status === "loading" ? "A subscrever..." : "Subscrever"}
        </button>
      </form>
      {status === "error" && <p className="mt-3 text-sm text-red-400">{message}</p>}
    </div>
  );
}