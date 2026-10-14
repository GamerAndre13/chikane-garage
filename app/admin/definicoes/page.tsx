"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { uploadSiteImage } from "@/app/actions/upload";
import type { SiteSettings } from "@/lib/site-settings";

type SettingsRow = SiteSettings & { id: string };

type FieldDef = { key: string; label: string; hint: string; full?: boolean; photo?: boolean };

const GROUPS: { title: string; description: string; fields: FieldDef[] }[] = [
  {
    title: "Contactos",
    description: "Aparecem no rodapé e no cartão «Contactos diretos» da página de contacto.",
    fields: [
      { key: "phone", label: "Telefone", hint: "Ex.: +351 912 345 678" },
      { key: "email", label: "Email", hint: "Ex.: garage@chikanegarage.blog" },
      { key: "location", label: "Localização", hint: "Ex.: Porto · Portugal" },
      { key: "address", label: "Morada", hint: "Opcional — alternativa à localização" },
      { key: "location_url", label: "Link da localização (Google Maps)", hint: "Opcional. Ex.: https://maps.app.goo.gl/… — se vazio, abre a pesquisa pela morada/localização.", full: true },
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
  {
    title: "Fotos do site",
    description:
      "Home e Sobre Nós. Envia o ficheiro (JPG, PNG ou WEBP, máx. 10MB) ou cola um link — a foto só muda no site depois de guardares. Vazio = imagem por omissão.",
    fields: [
      { key: "photo_home_hero", label: "Home · Hero (fundo)", hint: "Topo da home. Recomendado 1920×1080.", photo: true },
      { key: "photo_home_history", label: "Home · A História", hint: "Secção «A História» da home. Recomendado 1000×800.", photo: true },
      { key: "photo_about_hero", label: "Sobre · Hero", hint: "Topo de «Sobre Nós». Recomendado 1920×1080.", photo: true },
      { key: "photo_about_garage", label: "Sobre · A garagem", hint: "Secção «A garagem». Recomendado 1000×800.", photo: true },
    ],
  },
  {
    title: "Avatares de perfil",
    description:
      "Lista de imagens de carros para avatares aleatórios. Uma por linha ou envia ficheiros — os avatares serão atribuídos aleatoriamente a todos os utilizadores.",
    fields: [
      { key: "avatar_pool", label: "Avatares (lista)", hint: "Um URL por linha. Os uploads são adicionados à lista.", full: true },
    ],
  },
  {
    title: "Test drives",
    description:
      "Define a duração de cada test-drive, os horários e os dias da semana disponíveis. No formulário do site, os horários coincidentes com test-drives confirmados ficam automaticamente indisponíveis.",
    fields: [
      { key: "td_duration_minutes", label: "Duração de cada test-drive (minutos)", hint: "60 (1 hora) ou 120 (2 horas)." },
      { key: "td_slots", label: "Horários disponíveis", hint: "Separa com vírgulas. Ex.: 10:00,10:30,11:00,11:30,14:00,14:30,15:00,15:30,16:00", full: true },
      { key: "td_days", label: "Dias da semana disponíveis", hint: "Nomes em português separados por vírgulas (ex.: segunda,terça,quarta,quinta,sexta). Vazio = todos os dias.", full: true },
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
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

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
          location_url: row.location_url ?? "",
          social_instagram: row.social_instagram ?? "",
          social_facebook: row.social_facebook ?? "",
          social_whatsapp: row.social_whatsapp ?? "",
          social_youtube: row.social_youtube ?? "",
          social_tiktok: row.social_tiktok ?? "",
          footer_tagline: row.footer_tagline ?? "",
          photo_home_hero: row.photo_home_hero ?? "",
          photo_home_history: row.photo_home_history ?? "",
          photo_about_hero: row.photo_about_hero ?? "",
          photo_about_garage: row.photo_about_garage ?? "",
          avatar_pool: row.avatar_pool ?? "",
          td_duration_minutes: String(row.td_duration_minutes ?? 60),
          td_slots: row.td_slots ?? "",
          td_days: row.td_days ?? "",
        });
      }
      setLoading(false);
    })();
  }, []);

  const handlePhotoUpload = async (key: string, file: File) => {
    setUploadingKey(key);
    setError(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", key);
    const res = await uploadSiteImage(fd);

    setUploadingKey(null);
    if (res.error) {
      setError(res.error);
      return;
    }
    const url = res.url;
    if (url) setForm((prev) => ({ ...prev, [key]: url }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);

    const payloadRaw: Record<string, unknown> = { ...form, updated_at: new Date().toISOString() };
    // td_duration_minutes é INT na BD — converte a string do formulário.
    const rawDuration = payloadRaw.td_duration_minutes;
    const payload = {
      ...payloadRaw,
      td_duration_minutes:
        typeof rawDuration === "string" && rawDuration.trim() === "" ? 60 : Number(rawDuration ?? 60),
    };
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
          ? "Não foi possível guardar. Corre o ficheiro supabase/setup.sql no SQL Editor do Supabase e volta a tentar."
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
    border: "1px solid var(--border)",
    backgroundColor: "var(--background-alt)",
    color: "var(--foreground)",
    fontSize: "0.875rem",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "0.25rem",
    fontSize: "0.75rem",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "var(--muted)",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: "var(--muted)" }}>A carregar...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl uppercase tracking-wide"
            style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
          >
            Definições do Site
          </h1>
          <p className="mt-2" style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
            Contactos, redes sociais, rodapé e fotografias. As alterações ficam visíveis no site a seguir.
          </p>
        </div>
        <Link
          href="/"
          target="_blank"
          className="shrink-0 rounded px-3 py-1.5 text-xs transition-colors"
          style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
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
            backgroundColor: "var(--surface-mid)",
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            padding: "1rem",
            marginBottom: "1rem",
          }}
        >
          <div style={{ marginBottom: "0.75rem" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--copper-deep)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {group.title}
            </div>
            <div style={{ marginTop: "0.25rem", fontSize: "0.75rem", color: "var(--muted)" }}>
              {group.description}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            {group.fields.map((field) => (
              <div key={field.key} style={field.full || field.photo ? { gridColumn: "1 / -1" } : undefined}>
                <label style={labelStyle}>{field.label}</label>

                {field.photo ? (
                  <div>
                    <div className="flex items-center gap-3">
                      <div
                        style={{
                          width: "11rem",
                          height: "6.5rem",
                          flexShrink: 0,
                          borderRadius: "0.375rem",
                          border: "1px solid var(--border)",
                          backgroundColor: "var(--background-alt)",
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {form[field.key] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={form[field.key]}
                            alt={field.label}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <span style={{ padding: "0 0.5rem", fontSize: "0.7rem", color: "var(--muted-deep)", textAlign: "center" }}>
                            Imagem por omissão
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <label
                          className="cursor-pointer rounded px-3 py-1.5 text-center text-xs font-medium"
                          style={{ backgroundColor: "var(--copper-deep)", color: "var(--background-alt)", opacity: uploadingKey === field.key ? 0.6 : 1 }}
                        >
                          {uploadingKey === field.key ? "A enviar..." : form[field.key] ? "Trocar foto" : "Enviar foto"}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            disabled={uploadingKey === field.key}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void handlePhotoUpload(field.key, file);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        {form[field.key] && (
                          <button
                            onClick={() => setForm((prev) => ({ ...prev, [field.key]: "" }))}
                            className="rounded px-3 py-1.5 text-xs"
                            style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      style={{ ...inputStyle, marginTop: "0.5rem" }}
                      placeholder="https://... ou envia um ficheiro"
                      value={form[field.key] ?? ""}
                      onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    />
                  </div>
                ) : field.full ? (
                  <textarea
                    rows={6}
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

                <div style={{ marginTop: "0.25rem", fontSize: "0.7rem", color: "var(--muted-deep)" }}>{field.hint}</div>

                {field.key === "avatar_pool" && (
                  <div className="mt-2">
                    <label
                      className="cursor-pointer inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium"
                      style={{ backgroundColor: "var(--copper-deep)", color: "var(--background-alt)" }}
                    >
                      {uploadingKey === "avatar_pool" ? "A enviar..." : "Enviar foto para adicionar à lista"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        disabled={uploadingKey === "avatar_pool"}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUploadingKey("avatar_pool");
                            setError(null);
                            const fd = new FormData();
                            fd.append("file", file);
                            fd.append("name", "avatar_pool");
                            uploadSiteImage(fd).then((res) => {
                              setUploadingKey(null);
                              if (res.error) setError(res.error);
                              if (res.url) {
                                const current = form[field.key] ?? "";
                                const newVal = current ? current + "\n" + res.url : res.url;
                                setForm((prev) => ({ ...prev, [field.key]: newVal }));
                              }
                            });
                          }
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                )}
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
          style={{ backgroundColor: "var(--copper-deep)", color: "var(--background-alt)", opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "A guardar..." : "Guardar definições"}
        </button>
        {saved && <span style={{ color: "#4ade80", fontSize: "0.75rem" }}>Guardado ✓</span>}
      </div>
    </div>
  );
}
