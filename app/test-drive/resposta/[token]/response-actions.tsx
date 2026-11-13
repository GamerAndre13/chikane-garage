"use client";

import { useState } from "react";
import Link from "next/link";

// Botões de aceitar/recusar a nova data proposta no email do test drive.
// Fica num componente cliente porque a resposta é enviada por POST (os links
// do email só abrem esta página — nada é alterado só por abrir).
export function TestDriveResponse({ token, vehicleSlug }: { token: string; vehicleSlug?: string | null }) {
  const [state, setState] = useState<"idle" | "sending" | "accepted" | "rejected">("idle");
  const [error, setError] = useState<string | null>(null);

  const respond = async (action: "accept" | "reject") => {
    setState("sending");
    setError(null);
    try {
      const response = await fetch("/api/test-drive/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action }),
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(result?.error || "Não foi possível registar a resposta.");
        setState("idle");
        return;
      }
      setState(action === "accept" ? "accepted" : "rejected");
    } catch {
      setError("Não foi possível registar a resposta. Tenta novamente.");
      setState("idle");
    }
  };

  if (state === "accepted") {
    return (
      <div className="mt-6 border border-white/10 bg-surface px-5 py-6">
        <p className="font-display text-xs uppercase tracking-[0.22em] text-copper">Confirmado</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          Ficou tudo marcado. Recebes um email com a data e hora combinadas. Até breve!
        </p>
      </div>
    );
  }

  if (state === "rejected") {
    return (
      <div className="mt-6 border border-white/10 bg-surface px-5 py-6">
        <p className="font-display text-xs uppercase tracking-[0.22em] text-copper">Sem problema</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          A marcação fica em aberto. Escolhe outro dia e hora que te dê mais jeito e voltamos a confirmar.
        </p>
        <Link
          href={vehicleSlug ? `/contacto?testdrive=${vehicleSlug}` : "/contacto?testdrive"}
          className="mt-4 inline-flex items-center justify-center bg-copper px-6 py-3 font-display text-xs font-semibold uppercase tracking-[0.2em] text-black transition-colors hover:bg-copper-light"
        >
          Escolher novo horário
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => respond("accept")}
          disabled={state === "sending"}
          className="flex-1 bg-copper px-6 py-3 font-display text-xs font-semibold uppercase tracking-[0.2em] text-black transition-colors hover:bg-copper-light disabled:opacity-50"
        >
          {state === "sending" ? "A enviar…" : "Aceitar a nova data"}
        </button>
        <button
          type="button"
          onClick={() => respond("reject")}
          disabled={state === "sending"}
          className="flex-1 border border-white/20 px-6 py-3 font-display text-xs font-semibold uppercase tracking-[0.2em] text-foreground transition-colors hover:border-copper hover:text-copper disabled:opacity-50"
        >
          Quero outro horário
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
