"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

// ── Resposta do cliente à nova data do test drive ─────────────────────────
// O email de remarcação abre a home com ?testdrive=<token>. Em vez de uma
// página própria, aqui abre-se um popup: aceitar a data (fica confirmado e
// mostramos o aviso de sucesso) ou pedir outro horário (segue para o
// formulário de contacto já com a viatura escolhida).
// A resposta é enviada por POST (/api/test-drive/respond → respond_test_drive),
// por isso abrir o link por si só não altera nada.

type DriveInfo = {
  id: string;
  name: string;
  status: string;
  proposed_date: string | null;
  confirmed_date: string | null;
  responded_at: string | null;
  vehicle: string | null;
  vehicle_slug: string | null;
};

type Estado =
  | { tipo: "a-carregar" }
  | { tipo: "invalido" }
  | { tipo: "sem-proposta"; drive: DriveInfo }
  | { tipo: "proposta"; drive: DriveInfo; aEnviar: boolean; erro: string | null }
  | { tipo: "aceite"; drive: DriveInfo; data: string }
  | { tipo: "recusado"; drive: DriveInfo };

const formatarData = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  }).format(date);
};

export function TestDriveResponseModal() {
  const searchParams = useSearchParams();
  const token = searchParams.get("testdrive");
  const [estado, setEstado] = useState<Estado | null>(null);
  const [fechado, setFechado] = useState(false);
  const cartaoRef = useRef<HTMLDivElement | null>(null);
  const fecharRef = useRef<HTMLButtonElement | null>(null);
  const aceitarRef = useRef<HTMLButtonElement | null>(null);

  // Esconde o token da barra de endereço (o popup continua aberto) — evita
  // reabrir o pedido a cada refresh e mantém a home limpa.
  const limparUrl = useCallback(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("testdrive")) return;
    url.searchParams.delete("testdrive");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const fechar = useCallback(() => {
    setFechado(true);
    limparUrl();
  }, [limparUrl]);

  useEffect(() => {
    if (!token || fechado) return;
    let cancelled = false;

    (async () => {
      setEstado({ tipo: "a-carregar" });
      try {
        const { data, error } = await supabase.rpc("get_test_drive_by_token", { p_token: token });
        if (cancelled) return;
        const drive = (data ?? null) as DriveInfo | null;
        if (error || !drive) {
          setEstado({ tipo: "invalido" });
          return;
        }
        if (drive.proposed_date) {
          setEstado({ tipo: "proposta", drive, aEnviar: false, erro: null });
        } else {
          setEstado({ tipo: "sem-proposta", drive });
        }
      } catch {
        if (!cancelled) setEstado({ tipo: "invalido" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, fechado]);

  // Escape fecha; foco preso no cartão enquanto o popup está aberto.
  useEffect(() => {
    if (!estado || fechado) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        fechar();
        return;
      }
      if (event.key !== "Tab") return;
      const cartao = cartaoRef.current;
      if (!cartao) return;
      const focaveis = cartao.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (event.shiftKey && document.activeElement === primeiro) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [estado, fechado, fechar]);

  // Leva o foco para a ação principal (ou para o botão de fechar).
  useEffect(() => {
    if (!estado || fechado) return;
    const alvo = estado.tipo === "proposta" ? aceitarRef.current : fecharRef.current;
    alvo?.focus();
  }, [estado, fechado]);

  const responder = async (action: "accept" | "reject") => {
    if (!token || estado?.tipo !== "proposta") return;
    const drive = estado.drive;
    setEstado({ tipo: "proposta", drive, aEnviar: true, erro: null });
    try {
      const response = await fetch("/api/test-drive/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action }),
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setEstado({
          tipo: "proposta",
          drive,
          aEnviar: false,
          erro: result?.error || "Não foi possível registar a resposta. Tenta novamente.",
        });
        return;
      }
      if (action === "accept") {
        setEstado({ tipo: "aceite", drive, data: drive.proposed_date ?? "" });
        limparUrl();
      } else {
        setEstado({ tipo: "recusado", drive });
        limparUrl();
      }
    } catch {
      setEstado({
        tipo: "proposta",
        drive,
        aEnviar: false,
        erro: "Não foi possível registar a resposta. Verifica a ligação e tenta novamente.",
      });
    }
  };

  if (!token || !estado || fechado) return null;

  const drive = estado.tipo === "invalido" || estado.tipo === "a-carregar" ? null : estado.drive;
  const aEnviar = estado.tipo === "proposta" && estado.aEnviar;
  const titulo =
    estado.tipo === "aceite"
      ? "Test drive confirmado com sucesso"
      : estado.tipo === "recusado"
        ? "Sem problema"
        : estado.tipo === "invalido"
          ? "Link já não é válido"
          : estado.tipo === "sem-proposta"
            ? drive?.status === "confirmed"
              ? "Test drive confirmado"
              : "Sem alterações pendentes"
            : "Nova data proposta";

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !aEnviar) fechar();
      }}
    >
      <div
        ref={cartaoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="testdrive-modal-titulo"
        className="pop-in w-full max-w-lg rounded border border-border bg-surface p-6 shadow-2xl"
      >
        <p className="font-display text-[10px] uppercase tracking-[0.28em] text-copper">Test drive</p>
        <h2
          id="testdrive-modal-titulo"
          className="mt-2 font-display text-2xl font-bold uppercase tracking-tight text-foreground"
        >
          {titulo}
        </h2>

        {estado.tipo === "a-carregar" && (
          <p className="mt-4 text-sm leading-6 text-muted">A confirmar a nova data…</p>
        )}

        {estado.tipo === "invalido" && (
          <>
            <p className="mt-4 text-sm leading-6 text-muted">
              Este link já não é válido. Se precisares de mexer no teu test drive, fala connosco.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/contacto"
                className="inline-flex flex-1 items-center justify-center bg-copper px-6 py-3 font-display text-xs font-semibold uppercase tracking-[0.2em] text-black transition-colors hover:bg-copper-light"
              >
                Falar connosco
              </Link>
              <button
                ref={fecharRef}
                type="button"
                onClick={fechar}
                className="inline-flex flex-1 items-center justify-center border border-white/20 px-6 py-3 font-display text-xs font-semibold uppercase tracking-[0.2em] text-foreground transition-colors hover:border-copper hover:text-copper"
              >
                Fechar
              </button>
            </div>
          </>
        )}

        {estado.tipo === "sem-proposta" && estado.drive && (
          <>
            <p className="mt-4 text-sm leading-6 text-muted">
              {estado.drive.status === "confirmed"
                ? `O teu test drive está confirmado para ${formatarData(estado.drive.confirmed_date)}.`
                : "Não há nenhuma data à espera de resposta. Se precisares de mudar, fala connosco."}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/contacto"
                className="inline-flex flex-1 items-center justify-center border border-white/20 px-6 py-3 font-display text-xs font-semibold uppercase tracking-[0.2em] text-foreground transition-colors hover:border-copper hover:text-copper"
              >
                Contactar
              </Link>
              <button
                ref={fecharRef}
                type="button"
                onClick={fechar}
                className="inline-flex flex-1 items-center justify-center bg-copper px-6 py-3 font-display text-xs font-semibold uppercase tracking-[0.2em] text-black transition-colors hover:bg-copper-light"
              >
                Fechar
              </button>
            </div>
          </>
        )}

        {estado.tipo === "proposta" && (
          <>
            <p className="mt-4 text-sm leading-7 text-muted">
              Olá <strong className="text-foreground">{estado.drive.name}</strong>, a Chikane Garage propôs uma nova
              data
              {estado.drive.vehicle ? (
                <>
                  {" "}
                  para o test drive do <strong className="text-foreground">{estado.drive.vehicle}</strong>
                </>
              ) : null}
              .
            </p>
            <div className="mt-5 rounded border border-copper/30 bg-copper/5 px-5 py-4">
              <p className="font-display text-[10px] uppercase tracking-[0.22em] text-copper">Data proposta</p>
              <p className="mt-1 text-lg font-semibold leading-7 text-foreground">
                {formatarData(estado.drive.proposed_date)}
              </p>
            </div>
            <p className="mt-4 text-xs leading-6 text-muted">
              Confirma se te dá jeito. Se não puderes nesse dia, escolhe outro horário — a marcação fica em aberto.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                ref={aceitarRef}
                type="button"
                onClick={() => responder("accept")}
                disabled={aEnviar}
                className="flex-1 bg-copper px-6 py-3 font-display text-xs font-semibold uppercase tracking-[0.2em] text-black transition-colors hover:bg-copper-light disabled:opacity-50"
              >
                {aEnviar ? "A enviar…" : "Aceitar nova data"}
              </button>
              <button
                type="button"
                onClick={() => responder("reject")}
                disabled={aEnviar}
                className="flex-1 border border-white/20 px-6 py-3 font-display text-xs font-semibold uppercase tracking-[0.2em] text-foreground transition-colors hover:border-copper hover:text-copper disabled:opacity-50"
              >
                Quero outro horário
              </button>
            </div>
            {estado.erro && (
              <p role="alert" className="mt-3 border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {estado.erro}
              </p>
            )}
            <button
              type="button"
              onClick={fechar}
              disabled={aEnviar}
              className="mt-3 w-full text-[11px] uppercase tracking-widest text-muted transition-colors hover:text-copper disabled:opacity-50"
            >
              Fechar
            </button>
          </>
        )}

        {estado.tipo === "aceite" && (
          <>
            <div className="mt-5 flex items-start gap-3 rounded border border-emerald-500/30 bg-emerald-500/10 px-4 py-4">
              <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Está tudo marcado.</p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  O teu test drive
                  {estado.drive.vehicle ? ` do ${estado.drive.vehicle}` : ""} ficou confirmado para{" "}
                  <strong className="text-foreground">{formatarData(estado.data)}</strong>. Se precisares de alterar
                  alguma coisa, fala connosco.
                </p>
              </div>
            </div>
            <button
              ref={fecharRef}
              type="button"
              onClick={fechar}
              className="mt-5 w-full bg-copper px-6 py-3 font-display text-xs font-semibold uppercase tracking-[0.2em] text-black transition-colors hover:bg-copper-light"
            >
              Voltar ao site
            </button>
          </>
        )}

        {estado.tipo === "recusado" && (
          <>
            <p className="mt-4 text-sm leading-6 text-muted">
              A marcação fica em aberto. Escolhe outro dia e hora que te dê mais jeito e voltamos a confirmar.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={
                  estado.drive.vehicle_slug
                    ? `/contacto?testdrive=${encodeURIComponent(estado.drive.vehicle_slug)}`
                    : "/contacto"
                }
                className="inline-flex flex-1 items-center justify-center bg-copper px-6 py-3 font-display text-xs font-semibold uppercase tracking-[0.2em] text-black transition-colors hover:bg-copper-light"
              >
                Escolher novo horário
              </Link>
              <button
                ref={fecharRef}
                type="button"
                onClick={fechar}
                className="inline-flex flex-1 items-center justify-center border border-white/20 px-6 py-3 font-display text-xs font-semibold uppercase tracking-[0.2em] text-foreground transition-colors hover:border-copper hover:text-copper"
              >
                Fechar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
