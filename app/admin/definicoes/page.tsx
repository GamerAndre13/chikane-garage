"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { uploadSiteImage } from "@/app/actions/upload";
import { useToast } from "@/components/ui/toast";
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
    title: "Sobre Nós — números",
    description:
      "Faixa de números da página Sobre Nós. Deixa 0 para esconder um número; os valores aparecem como «+ de X».",
    fields: [
      { key: "about_inspection_points", label: "Pontos de inspeção", hint: "Ex.: 140" },
      { key: "about_vehicles_sold", label: "Viaturas vendidas", hint: "Ex.: 120 → «+ de 120 viaturas vendidas»" },
      { key: "about_years_experience", label: "Anos de experiência", hint: "Ex.: 8 → «+ de 8 anos de experiência»" },
      { key: "about_clients", label: "Clientes satisfeitos", hint: "Ex.: 300 → «+ de 300 clientes satisfeitos»" },
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
  {
    title: "Propostas (viaturas novas)",
    description:
      "Configuração do configurador de viaturas novas. As propostas enviadas pelos clientes ficam sempre guardadas em /admin/propostas.",
    fields: [
      { key: "proposal_notify_emails", label: "Emails a notificar", hint: "Um ou vários emails separados por vírgula. Cada proposta nova é enviada para esta lista.", full: true },
    ],
  },
];

export default function DefinicoesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rowId, setRowId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  // Secções colapsáveis: começam todas fechadas para a página ficar curta.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

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
          proposal_notify_emails: row.proposal_notify_emails ?? "",
          about_inspection_points: String(row.about_inspection_points ?? 140),
          about_vehicles_sold: String(row.about_vehicles_sold ?? 0),
          about_years_experience: String(row.about_years_experience ?? 0),
          about_clients: String(row.about_clients ?? 0),
        });
      }
      setLoading(false);
    })();
  }, []);

  const handlePhotoUpload = async (key: string, file: File) => {
    setUploadingKey(key);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", key);
    const res = await uploadSiteImage(fd);

    setUploadingKey(null);
    if (res.error) {
      toast({ variant: "error", title: "Falha ao carregar a fotografia", description: res.error });
      return;
    }
    const url = res.url;
    if (url) setForm((prev) => ({ ...prev, [key]: url }));
  };

  const handleSave = async () => {
    setSaving(true);

    const payloadRaw: Record<string, unknown> = { ...form, updated_at: new Date().toISOString() };
    // Campos INT na BD — convertem a string do formulário (vazio = 0).
    const asInt = (value: unknown, fallback = 0) => {
      const n = Number(value);
      return Number.isFinite(n) && String(value).trim() !== "" ? Math.trunc(n) : fallback;
    };
    // td_duration_minutes é INT na BD — converte a string do formulário.
    const rawDuration = payloadRaw.td_duration_minutes;
    const payload = {
      ...payloadRaw,
      td_duration_minutes:
        typeof rawDuration === "string" && rawDuration.trim() === "" ? 60 : Number(rawDuration ?? 60),
      about_inspection_points: asInt(payloadRaw.about_inspection_points, 140),
      about_vehicles_sold: asInt(payloadRaw.about_vehicles_sold, 0),
      about_years_experience: asInt(payloadRaw.about_years_experience, 0),
      about_clients: asInt(payloadRaw.about_clients, 0),
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
      toast({
        variant: "error",
        title: "Não foi possível guardar",
        description: faltaMigration
          ? "Corre o ficheiro supabase/setup.sql no SQL Editor do Supabase e volta a tentar."
          : saveError.message,
      });
      return;
    }

    toast({ variant: "success", title: "Definições guardadas", description: "As alterações já estão visíveis no site." });
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

      {/* Barra de gravação fixa no topo: o botão fica sempre à vista, mesmo a
          rolar as secções abertas. */}
      <div
        className="relative z-20 -mx-4 mb-6 border-b px-4 py-3 sm:-mx-6 sm:px-6 md:sticky md:top-0 lg:-mx-8 lg:px-8"
        style={{ backgroundColor: "var(--background-alt)", borderColor: "var(--border)" }}
      >
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex min-h-12 items-center gap-2 rounded px-8 py-3 text-sm font-semibold uppercase tracking-wide transition-opacity"
            style={{ backgroundColor: "var(--copper-deep)", color: "var(--background-alt)", opacity: saving ? 0.6 : 1 }}
          >
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
              <path d="M17 21v-8H7v8M7 3v5h8" />
            </svg>
            {saving ? "A guardar..." : "Guardar definições"}
          </button>
          <span style={{ color: "var(--muted)", fontSize: "0.8125rem" }}>
            As alterações só ficam visíveis no site depois de guardares.
          </span>
        </div>
      </div>

      <p className="mb-4" style={{ color: "var(--muted)", fontSize: "0.8125rem" }}>
        Abre apenas a secção que queres alterar. As alterações só ficam visíveis no site depois de clicares em{" "}
        <strong style={{ color: "var(--silver)" }}>Guardar definições</strong>.
      </p>

      {GROUPS.map((group) => {
        const open = Boolean(openGroups[group.title]);
        const panelId = `definicoes-${group.title
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")}`;
        return (
          <div
            key={group.title}
            style={{
              backgroundColor: "var(--surface-mid)",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              marginBottom: "0.75rem",
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              onClick={() => toggleGroup(group.title)}
              aria-expanded={open}
              aria-controls={panelId}
              className="w-full"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                padding: "1rem",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <span style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    fontFamily: "var(--font-display)",
                    fontSize: "0.95rem",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "var(--foreground)",
                  }}
                >
                  {group.title}
                </span>
                <span style={{ display: "block", marginTop: "0.35rem", fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.5 }}>
                  {group.description}
                </span>
              </span>
              <span
                className="shrink-0 rounded px-3 py-1.5 text-xs"
                style={{
                  border: `1px solid ${open ? "var(--copper)" : "var(--border)"}`,
                  color: open ? "var(--copper)" : "var(--muted)",
                  whiteSpace: "nowrap",
                }}
              >
                {open ? "Ocultar opções −" : "Mostrar opções +"}
              </span>
            </button>

            {open && (
              <div
                id={panelId}
                style={{
                  padding: "1rem",
                  borderTop: "1px solid var(--border)",
                  backgroundColor: "var(--background-alt)",
                }}
              >
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
                                  const fd = new FormData();
                                  fd.append("file", file);
                                  fd.append("name", "avatar_pool");
                                  uploadSiteImage(fd).then((res) => {
                                    setUploadingKey(null);
                                    if (res.error) {
                                      toast({ variant: "error", title: "Falha ao carregar a fotografia", description: res.error });
                                    }
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
            )}
          </div>
        );
      })}

      <div className="flex items-center gap-3">
        <p style={{ color: "var(--muted-deep)", fontSize: "0.75rem" }}>
          O botão <strong style={{ color: "var(--silver)" }}>Guardar definições</strong> fica fixo no topo da página.
        </p>
      </div>
    </div>
  );
}
