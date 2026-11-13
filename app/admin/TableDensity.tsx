"use client";

import { useEffect, useState } from "react";

// Densidade das tabelas do backoffice: compacta (40px), padrão (48px) e
// confortável (56px). A escolha fica guardada e aplica-se a todas as tabelas
// através do atributo `data-table-density` no <html> (ver globals.css).

type Density = "compact" | "normal" | "comfortable";

const STORAGE_KEY = "chikane-admin-table-density";

const OPTIONS: { value: Density; label: string; short: string }[] = [
  { value: "compact", label: "Densidade compacta", short: "S" },
  { value: "normal", label: "Densidade padrão", short: "M" },
  { value: "comfortable", label: "Densidade confortável", short: "L" },
];

function apply(value: Density) {
  document.documentElement.dataset.tableDensity = value;
}

export default function TableDensity() {
  const [density, setDensity] = useState<Density>("normal");

  // Lê a preferência guardada depois de montar (evita diferenças no HTML).
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const value: Density =
      stored === "compact" || stored === "comfortable" ? stored : "normal";
    apply(value);
    window.setTimeout(() => setDensity(value), 0);
  }, []);

  const choose = (value: Density) => {
    setDensity(value);
    apply(value);
    window.localStorage.setItem(STORAGE_KEY, value);
  };

  return (
    <div>
      <p className="mb-1 text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--muted)" }}>
        Densidade das tabelas
      </p>
      <div
        role="group"
        aria-label="Densidade das tabelas"
        className="inline-flex overflow-hidden rounded border"
        style={{ borderColor: "var(--border)" }}
      >
        {OPTIONS.map((option, index) => {
          const active = density === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => choose(option.value)}
              aria-label={option.label}
              aria-pressed={active}
              title={option.label}
              className={`inline-flex h-9 min-w-11 items-center justify-center px-2 text-[11px] transition-colors ${
                index > 0 ? "border-l" : ""
              }`}
              style={{
                borderColor: "var(--border)",
                backgroundColor: active ? "var(--surface-raised)" : "transparent",
                color: active ? "var(--foreground)" : "var(--muted)",
                fontWeight: active ? 600 : 400,
              }}
            >
              {option.short}
            </button>
          );
        })}
      </div>
    </div>
  );
}
