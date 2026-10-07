"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import type { SiteSettings } from "@/lib/site-settings";

type SettingsRow = SiteSettings & { id: string };

type FieldDef = { key: string; label: string; hint: string; full?: boolean };

const GROUPS: { title: string; description: string; fields: FieldDef[] }[] = [
  {
    title: "Contactos",
    description: "Aparecem no rodapé e no cartão «Contactos diretos» da página de contacto.",
    fields: [
      { key: "phone", label: "Telefone", hint: "Ex.: +351 912 345 678" },
      { key: "email", label: "Email", hint: "Ex.: garage@chikanegarage.blog" },
      { key: "location", label: "Localização", hint: "Ex.: Porto · Portugal" },
      { key: "address", label: "Morada", hint: "Opcional — alternativa à localização" },
    ],
  },
  {
    title: "Redes sociais",
    description: "Só aparecem no site os campos preenchidos. Aceitam link completo ou só o @utilizador.",
    fields: [
      { key: "social_instagram", label: "Instagram", hint: "Ex.: @chikanegarage" },
      { key: "social_facebook", label: "Facebook", hint: "Ex.: chikanegarage ou link completo" },
      { key: "social_whatsapp", label: "WhatsApp", hint: "Ex.: https://wa.me/351912345678" },
      { key: "social_youtube", label: "YouTube", hint: "Ex.: @chikanegarage ou link do canal" },
      { key: "social_tiktok", label: "TikTok", hint: "Ex.: @chikanegarage" },
    ],
  },
  {
    title: "Rodapé",
    description: "Frase institucional ao lado do logótipo.",
    fields: [
      { key: "footer_tagline", label: "Frase do rodapé", hint: "Vazio = mantém o texto por omissão.", full: true },
    ],
  },
];

export default function DefinicoesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowId, setRowId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings").select("*").limit(1).maybeSingle();
      if (data) {
        const row = data as SettingsRow;
        setRowId(row.id);
        setForm({
          phone: row.phone ?? "",
          email: row.email ?? "",
          address: row.address ?? "",
          location: row.location ?? "",
          social_instagram: row.social_instagram ?? "",
          social_facebook: row.social_facebook ?? "",
          social_whatsapp: row.social_whatsapp ?? "",
          social_youtube: row.social_youtube ?? "",
          social_tiktok: row.social_tiktok ?? "",
          footer_tagline: row.footer_tagline ?? "",
        });
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);

    const payload = { ...form, updated_at: new Date().toISOString() };
    let saveError: PostgrestError | null = null;

    if (rowId) {
      const res = await supabase.from("site_settings").update(payload).eq("id", rowId);
      saveError = res.error;
    } else {
      const res = await supabase.from("site_settings").insert(payload).select("id").single();
      saveError = res.error;
      if (!saveError && res.data) setRowId(res.data.id);
    }

    setSaving(false);

    if (saveError) {
      const faltaMigration = /does not exist|row-level security/i.test(saveError.message);
      setError(
        faltaMigration
          ? "Não foi possível guardar. Corre o ficheiro supabase/004_site_settings_backoffice.sql no SQL Editor do Supabase e volta a tentar."
          : `Erro ao guardar: ${saveError.message}`
      );
      return;
    }

    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  };

  const inputStyle = {
    width: "100%",
    padding: "0.5rem 0.75rem",
    borderRadius: "0.375rem",
    border: "1px solid #2a2a2a",
    backgroundColor: "#0a0a0a",
    color: "#f5f5f0",
    fontSize: "0.875rem",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "0.25rem",
    fontSize: "0.75rem",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "#9a9a94",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: "#9a9a94" }}>A carregar...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl uppercase tracking-wide"
            style={{ fontFamily: "var(--font-display)", color: "#f5f5f0" }}
          >
            Definições do Site
          </h1>
          <p className="mt-2" style={{ color: "#9a9a94", fontSize: "0.875rem" }}>
            Contactos, redes sociais e rodapé. As alterações ficam visíveis no site a seguir.
          </p>
        </div>
        <Link
          href="/"
          target="_blank"
          className="shrink-0 rounded px-3 py-1.5 text-xs transition-colors"
          style={{ border: "1px solid #2a2a2a", color: "#9a9a94" }}
        >
          Ver no site ↗
        </Link>
      </div>

      {error && (
        <div
          className="mb-4 border-l-4 p-4 text-sm"
          style={{ borderColor: "#ef4444", backgroundColor: "rgba(239,68,68,0.1)", color: "#f87171" }}
        >
          {error}
        </div>
      )}

      {GROUPS.map((group) => (
        <div
          key={group.title}
          style={{
            backgroundColor: "#141414",
            border: "1px solid #2a2a2a",
            borderRadius: "0.5rem",
            padding: "1rem",
            marginBottom: "1rem",
          }}
        >
          <div style={{ marginBottom: "0.75rem" }}>
            <div style={{ fontSize: "0.75rem", color: "#b87333", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {group.title}
            </div>
            <div style={{ marginTop: "0.25rem", fontSize: "0.75rem", color: "#9a9a94" }}>
              {group.description}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            {group.fields.map((field) => (
              <div key={field.key} style={field.full ? { gridColumn: "1 / -1" } : undefined}>
                <label style={labelStyle}>{field.label}</label>
                {field.full ? (
                  <textarea
                    rows={2}
                    style={{ ...inputStyle, resize: "vertical" as const }}
                    value={form[field.key] ?? ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  />
                ) : (
                  <input
                    style={inputStyle}
                    placeholder={field.hint}
                    value={form[field.key] ?? ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  />
                )}
                <div style={{ marginTop: "0.25rem", fontSize: "0.7rem", color: "#6f6f68" }}>{field.hint}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded px-4 py-2 text-xs font-medium transition-opacity"
          style={{ backgroundColor: "#b87333", color: "#0a0a0a", opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "A guardar..." : "Guardar definições"}
        </button>
        {saved && <span style={{ color: "#4ade80", fontSize: "0.75rem" }}>Guardado ✓</span>}
      </div>
    </div>
  );
}
