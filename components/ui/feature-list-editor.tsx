"use client";

import { useId, useState } from "react";
import { capitalizeWords } from "@/lib/vehicle-options";

type Props = {
  /** Texto do campo (ex.: "Extras e equipamento"). */
  label: string;
  /** Lista atual, com um extra por linha (formato guardado no formulário). */
  value: string;
  /** Sugestões do datalist: valores por omissão + extras de outras viaturas. */
  options: string[];
  /** Recebe a lista atualizada, novamente com um extra por linha. */
  onChange: (value: string) => void;
  labelStyle: React.CSSProperties;
  inputStyle: React.CSSProperties;
  placeholder?: string;
};

/**
 * Editor de equipamento/extras: escreve-se o extra, clica-se em "Adicionar"
 * e ele entra na lista. Cada linha da lista pode ser editada ou removida.
 */
export function FeatureListEditor({ label, value, options, onChange, labelStyle, inputStyle, placeholder }: Props) {
  const inputId = useId();
  const listId = useId();
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const items = value === "" ? [] : value.split("\n");

  const addItem = () => {
    const next = capitalizeWords(draft.trim());
    if (!next) return;

    const alreadyExists = items.some((item) => item.trim().toLocaleLowerCase("pt-PT") === next.toLocaleLowerCase("pt-PT"));
    if (alreadyExists) {
      setNotice("Esse extra já está na lista.");
      return;
    }

    onChange([...items, next].join("\n"));
    setDraft("");
    setNotice(null);
  };

  const updateItem = (index: number, next: string) => {
    onChange(items.map((item, position) => (position === index ? next : item)).join("\n"));
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, position) => position !== index).join("\n"));
    setNotice(null);
  };

  return (
    <div style={{ marginTop: "0.75rem" }}>
      <label htmlFor={inputId} style={labelStyle}>
        {label}
      </label>

      <div style={{ display: "flex", gap: "0.5rem", alignItems: "stretch" }}>
        <input
          id={inputId}
          list={listId}
          value={draft}
          placeholder={placeholder}
          onChange={(event) => {
            setDraft(event.target.value);
            setNotice(null);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            // Enter adiciona à lista em vez de submeter o formulário da viatura.
            event.preventDefault();
            addItem();
          }}
          style={inputStyle}
        />
        <button
          type="button"
          onClick={addItem}
          disabled={!draft.trim()}
          className="shrink-0 rounded px-4 text-xs font-medium transition-opacity"
          style={{
            backgroundColor: "var(--copper-deep)",
            color: "var(--background-alt)",
            opacity: draft.trim() ? 1 : 0.5,
          }}
        >
          + Adicionar
        </button>
      </div>
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>

      <p style={{ marginTop: "0.25rem", fontSize: "0.6875rem", color: "var(--muted-deep)" }}>
        Escreve ou escolhe um extra e clica em <strong>Adicionar</strong>. Podes editar ou remover cada linha depois.
      </p>

      {notice && (
        <p role="alert" style={{ marginTop: "0.25rem", fontSize: "0.6875rem", color: "#f87171" }}>
          {notice}
        </p>
      )}

      {items.length === 0 ? (
        <p style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--muted)" }}>
          Ainda não adicionaste equipamento a esta viatura.
        </p>
      ) : (
        <ul style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.375rem", listStyle: "none", padding: 0 }}>
          {items.map((item, index) => (
            <li key={index} style={{ display: "flex", gap: "0.5rem", alignItems: "stretch" }}>
              <input
                value={item}
                aria-label={`${label} — linha ${index + 1}`}
                onChange={(event) => updateItem(index, event.target.value)}
                onBlur={(event) => updateItem(index, capitalizeWords(event.target.value))}
                onKeyDown={(event) => {
                  // Enter confirma a linha em vez de submeter o formulário.
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  event.currentTarget.blur();
                }}
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="shrink-0 rounded px-3 text-xs transition-colors"
                style={{ border: "1px solid var(--border)", color: "#f87171" }}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
