"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

// ── Toasts ────────────────────────────────────────────────────────────────
// Notificações curtas, fora do fluxo do conteúdo. Regras seguidas:
//  · desktop: canto inferior direito; telemóvel: topo (nunca no centro);
//  · info/sucesso desaparecem aos 4s, avisos aos 7s, erros ficam até fechar;
//  · no máximo 3 em ecrã (o mais antigo sai);
//  · fecho sempre possível (X, Escape e deslizar no telemóvel), pausa ao
//    passar o rato por cima;
//  · ícone + borda colorida à esquerda (cor nunca é a única informação).

export type ToastVariant = "info" | "success" | "warning" | "error";

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Sobrepõe a duração por omissão (ms). `null` = fica até ser fechado. */
  duration?: number | null;
};

type ToastItem = Required<Pick<ToastInput, "title">> & {
  id: number;
  description?: string;
  variant: ToastVariant;
  duration: number | null;
};

type ToastContextValue = {
  toast: (input: ToastInput) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION: Record<ToastVariant, number | null> = {
  info: 4000,
  success: 4000,
  warning: 7000,
  error: null,
};

const MAX_TOASTS = 3;

const VARIANT_STYLE: Record<ToastVariant, { color: string; label: string }> = {
  info: { color: "var(--silver)", label: "Informação" },
  success: { color: "var(--success)", label: "Sucesso" },
  warning: { color: "var(--warning)", label: "Aviso" },
  error: { color: "var(--red-light)", label: "Erro" },
};

function VariantIcon({ variant }: { variant: ToastVariant }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (variant === "success") {
    return (
      <svg {...common}>
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }
  if (variant === "warning") {
    return (
      <svg {...common}>
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
    );
  }
  if (variant === "error") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M15 9l-6 6M9 9l6 6" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

// Uma notificação: temporizador com pausa e deslize para fechar no telemóvel.
function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const [dragX, setDragX] = useState(0);
  // `dragging` é estado (e não ref) porque o estilo depende dele no render.
  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef<{ pointerId: number; startX: number } | null>(null);
  const remaining = useRef(item.duration ?? 0);
  const startedAt = useRef<number | null>(null);
  const style = VARIANT_STYLE[item.variant];

  useEffect(() => {
    if (item.duration === null || paused) return;
    startedAt.current = Date.now();
    const timer = window.setTimeout(() => onDismiss(item.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      if (startedAt.current !== null) {
        remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current));
        startedAt.current = null;
      }
    };
  }, [item.duration, item.id, onDismiss, paused]);

  // Deslizar para o lado fecha (rato e dedo passam pelos mesmos eventos).
  const endDrag = (event: React.PointerEvent<HTMLLIElement>) => {
    if (!dragOrigin.current) return;
    const moved = Math.abs(dragX);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragOrigin.current = null;
    setDragging(false);
    setDragX(0);
    if (moved > 64) onDismiss(item.id);
  };

  return (
    <li
      role={item.variant === "error" || item.variant === "warning" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse") return;
        dragOrigin.current = { pointerId: event.pointerId, startX: event.clientX };
        setDragging(true);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const origin = dragOrigin.current;
        if (!origin || origin.pointerId !== event.pointerId) return;
        setDragX(event.clientX - origin.startX);
      }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className="toast-enter pointer-events-auto flex w-full items-start gap-3 rounded-md border bg-surface-mid p-3 sm:w-80"
      style={{
        borderColor: "var(--border)",
        borderLeft: `3px solid ${style.color}`,
        touchAction: "pan-y",
        transform: dragX ? `translateX(${dragX}px)` : undefined,
        transition: dragging ? "none" : "transform 120ms ease-out",
      }}
    >
      <span className="mt-0.5 shrink-0" style={{ color: style.color }}>
        <VariantIcon variant={item.variant} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug" style={{ color: "var(--foreground)" }}>
          <span className="sr-only">{style.label}: </span>
          {item.title}
        </p>
        {item.description && (
          <p className="mt-1 text-xs leading-snug" style={{ color: "var(--muted)" }}>
            {item.description}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Fechar notificação"
        className="-mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded transition-colors hover:text-foreground"
        style={{ color: "var(--muted)" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </li>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((input: ToastInput) => {
    const variant = input.variant ?? "info";
    nextId.current += 1;
    const item: ToastItem = {
      id: nextId.current,
      title: input.title,
      description: input.description,
      variant,
      duration: input.duration === undefined ? DEFAULT_DURATION[variant] : input.duration,
    };
    // Mantém no máximo 3: o mais antigo sai primeiro.
    setItems((current) => [...current, item].slice(-MAX_TOASTS));
  }, []);

  // Escape fecha a notificação mais recente (o teclado é sempre uma saída).
  useEffect(() => {
    if (items.length === 0) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setItems((current) => current.slice(0, -1));
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [items.length]);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div
        aria-label="Notificações"
        className="pointer-events-none fixed inset-x-4 top-4 z-[90] flex flex-col items-end gap-2 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:top-auto"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <ul className="flex w-full flex-col gap-2 sm:w-auto">
          {items.map((item) => (
            <ToastCard key={item.id} item={item} onDismiss={dismiss} />
          ))}
        </ul>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast tem de ser usado dentro de <ToastProvider>.");
  }
  return context;
}
