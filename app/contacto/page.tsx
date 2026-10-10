"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { SiteSettings } from "@/lib/site-settings";
import { instagramUrl, facebookUrl, whatsappUrl, youtubeUrl, tiktokUrl } from "@/lib/social-links";

type VehicleRef = { id: string; brand: string; model: string; slug: string };

// Slots de hora permitidos: 10h–12h e 14h–17h, sempre :00 ou :30
const ALLOWED_TIMES = [
  "10:00", "10:30", "11:00", "11:30", "12:00",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00",
];

// Prazo máximo para marcar: 30 dias a partir de hoje
const FORMAT_DATE = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const inputStyle = {
  width: "100%",
  padding: "0.75rem 1rem",
  border: "1px solid var(--border)",
  backgroundColor: "var(--background-alt)",
  color: "var(--foreground)",
  fontSize: "0.875rem",
  outline: "none",
} as const;

const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted";

function ContactoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const testdriveSlug = searchParams.get("testdrive");
  const vehicleSlug = searchParams.get("vehicle");

  // test-drive mode é ativado quando vem ?testdrive=<slug>
  const isTestDrive = Boolean(testdriveSlug);

  // Alterna entre "pedir info" e "marcar test-drive" na mesma viatura
  const switchMode = (mode: "info" | "testdrive") => {
    const slug = testdriveSlug || vehicleSlug;
    if (!slug) return;
    const params = new URLSearchParams();
    params.set(mode === "testdrive" ? "testdrive" : "vehicle", slug);
    router.replace(`/contacto?${params.toString()}`);
  };

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<VehicleRef | null>(null);
  const [vehicleLoading, setVehicleLoading] = useState(!!testdriveSlug || !!vehicleSlug);

  // Carregar a viatura a partir do slug (resolve id, usado nas tabelas)
  useEffect(() => {
    const slug = testdriveSlug || vehicleSlug;
    if (!slug) return;
    (async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("id, brand, model, slug")
        .eq("slug", slug)
        .maybeSingle();
      if (data) setVehicle(data as VehicleRef);
      setVehicleLoading(false);
    })();
  }, [testdriveSlug, vehicleSlug]);

  // Contactos diretos (site_settings) — cartão acima do formulário
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings").select("*").limit(1).maybeSingle();
      if (data) setSiteSettings(data as SiteSettings);
    })();
  }, []);

  const today = FORMAT_DATE(new Date());
  const maxDateD = new Date();
  maxDateD.setDate(maxDateD.getDate() + 30);
  const maxDate = FORMAT_DATE(maxDateD);

  // Insere o pedido e, caso a coluna user_id ainda não exista na BD,
  // repete o insert sem ela para o formulário não falhar em produção.
  async function insertResilient(
    table: "contact_requests" | "test_drives",
    payload: Record<string, unknown>
  ) {
    const { error } = await supabase.from(table).insert(payload);
    if (!error) return null;
    const msg = `${error.message} ${error.details ?? ""}`.toLowerCase();
    const missingUserId =
      payload.user_id !== undefined && (msg.includes("user_id") || error.code === "PGRST204");
    if (missingUserId) {
      const rest: Record<string, unknown> = { ...payload };
      delete rest.user_id;
      const retry = await supabase.from(table).insert(rest);
      return retry.error;
    }
    return error;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);

    // Honeypot para filtrar submissões automatizadas sem recolher mais dados.
    if (String(fd.get("website") || "").trim()) {
      setSuccess(true);
      setLoading(false);
      return;
    }

    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim().toLowerCase();
    const phone = String(fd.get("phone") || "").trim();
    const message = String(fd.get("message") || "").trim();
    if (name.length < 2 || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Confirma o nome e introduz um email válido.");
      setLoading(false);
      return;
    }
    // Todos os campos do formulário são obrigatórios
    if (phone.length < 3 || phone.length > 30) {
      setError("Indica um número de telefone (mínimo 3 caracteres).");
      setLoading(false);
      return;
    }
    if (!isTestDrive && (message.length < 5 || message.length > 5000)) {
      setError("A mensagem deve ter entre 5 e 5000 caracteres.");
      setLoading(false);
      return;
    }

    // Ligar o pedido ao utilizador logado (ou null se anónimo)
    const { data: { user } } = await supabase.auth.getUser();
    const uid = user?.id ?? null;

    const common = {
      user_id: uid,
      name,
      email,
      phone: phone || null,
    };

    if (isTestDrive) {
      // Data e hora são obrigatórias e dentro das regras (hoje → +30 dias, slots 10-12 / 14-17)
      const preferred_date = fd.get("preferred_date") as string;
      const preferred_time = fd.get("preferred_time") as string;
      const notes = String(fd.get("notes") || "").trim();
      if (!preferred_date) {
        setError("Escolhe uma data preferida para o test drive (calendário).");
        setLoading(false);
        return;
      }
      if (preferred_date < today || preferred_date > maxDate) {
        setError("A data do test drive deve ser entre hoje e os próximos 30 dias.");
        setLoading(false);
        return;
      }
      if (!ALLOWED_TIMES.includes(preferred_time)) {
        setError("Escolhe uma hora disponível (10h–12h ou 14h–17h, de :00 ou :30).");
        setLoading(false);
        return;
      }
      if (notes.length < 2 || notes.length > 2000) {
        setError("Preenche o campo de notas/dúvidas (mínimo 2 caracteres).");
        setLoading(false);
        return;
      }
      if (!vehicle?.id) {
        setError("Não foi possível identificar a viatura. Volta ao catálogo e tenta novamente.");
        setLoading(false);
        return;
      }
      try {
        const error = await insertResilient("test_drives", {
          ...common,
          vehicle_id: vehicle.id,
          preferred_date,
          preferred_time,
          notes,
          status: "pending",
        });
        if (error) {
          console.error("Erro test_drives:", error);
          setError(error.message || "Erro ao enviar. Tenta novamente.");
        } else {
          setSuccess(true);
          setError(null);
          (e.target as HTMLFormElement).reset();
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Erro ao enviar. Tenta novamente.");
      }
    } else {
      try {
        const error = await insertResilient("contact_requests", {
          ...common,
          vehicle_id: vehicle?.id || null,
          message,
        });
        if (error) {
          console.error("Erro contact_requests:", error);
          setError(error.message || "Erro ao enviar. Tenta novamente.");
        } else {
          setSuccess(true);
          setError(null);
          (e.target as HTMLFormElement).reset();
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Erro ao enviar. Tenta novamente.");
      }
    }
    setLoading(false);
  }

  const heading = isTestDrive ? "Marcar Test Drive" : "Fala Connosco";
  const sub = isTestDrive
    ? "Escolhe a data e vem experimentar a viatura."
    : "Tem alguma questão? Envia-nos uma mensagem.";

  const s = siteSettings;
  const temContactos = Boolean(s && (s.phone || s.email || s.location || s.address));
  const redes = s
    ? [
        s.social_instagram ? { label: "Instagram", href: instagramUrl(s.social_instagram) } : null,
        s.social_facebook ? { label: "Facebook", href: facebookUrl(s.social_facebook) } : null,
        s.social_whatsapp ? { label: "WhatsApp", href: whatsappUrl(s.social_whatsapp) } : null,
        s.social_youtube ? { label: "YouTube", href: youtubeUrl(s.social_youtube) } : null,
        s.social_tiktok ? { label: "TikTok", href: tiktokUrl(s.social_tiktok) } : null,
      ].filter((l): l is { label: string; href: string } => Boolean(l && l.href))
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 bg-background-alt">
      <div className="mx-auto max-w-2xl">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-copper">
          {isTestDrive ? "Reserva a tua experiência" : "Fala Connosco"}
        </p>
        <h1 className="mt-3 font-display text-5xl font-bold uppercase tracking-wide text-foreground">{heading}</h1>
        <p className="mt-4 text-base leading-relaxed text-muted">{sub}</p>

        {(testdriveSlug || vehicleSlug) && (
          <div className="mt-6 grid grid-cols-2 gap-2 rounded border border-border bg-surface-mid p-2">
            <button
              type="button"
              onClick={() => switchMode("info")}
              className={`cursor-pointer rounded px-4 py-3 font-display text-xs font-semibold uppercase tracking-[0.2em] transition-colors ${!isTestDrive ? "bg-copper text-black" : "border border-border text-muted hover:text-foreground"}`}
            >
              Pedir info
            </button>
            <button
              type="button"
              onClick={() => switchMode("testdrive")}
              className={`cursor-pointer rounded px-4 py-3 font-display text-xs font-semibold uppercase tracking-[0.2em] transition-colors ${isTestDrive ? "bg-copper text-black" : "border border-border text-muted hover:text-foreground"}`}
            >
              Test-drive
            </button>
          </div>
        )}

        {vehicleLoading ? (
          <p className="mt-8 text-sm text-muted">A carregar viatura...</p>
        ) : (
          vehicle && (
            <div className="mt-6 flex items-center justify-between rounded border border-copper/30 bg-copper/5 px-4 py-3">
              <div>
                <p className="text-xs text-muted">Viatura selecionada</p>
                <p className="font-display text-lg uppercase tracking-wide text-foreground">
                  {vehicle.brand} {vehicle.model}
                </p>
              </div>
              <span className="rounded-full bg-copper px-3 py-1 font-display text-[11px] font-semibold uppercase tracking-widest text-white">
                {isTestDrive ? "Test Drive" : "Contacto"}
              </span>
            </div>
          )
        )}

        {success && (
          <div className="mt-8 border-l-4 border-green-500 bg-green-500/10 p-4 text-sm text-green-400">
            {isTestDrive
              ? "Pedido de test drive enviado! Entramos em contacto para confirmar a data."
              : "Mensagem enviada com sucesso!"}
          </div>
        )}
        {error && <div className="mt-8 border-l-4 border-red-500 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>}

        {temContactos && (
          <div className="mt-6 rounded border border-border bg-surface-mid p-5">
            <p className="font-display text-xs uppercase tracking-[0.25em] text-copper">Contactos diretos</p>
            <ul className="mt-3 space-y-1.5 text-sm text-muted">
              {s?.phone && (
                <li>
                  <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="transition-colors hover:text-foreground">
                    {s.phone}
                  </a>
                </li>
              )}
              {s?.email && (
                <li>
                  <a href={`mailto:${s.email}`} className="transition-colors hover:text-foreground">
                    {s.email}
                  </a>
                </li>
              )}
              {(s?.location || s?.address) && <li>{s?.location || s?.address}</li>}
            </ul>
            {redes.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {redes.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-copper transition-colors hover:text-copper-light"
                  >
                    {l.label} ↗
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
          <div className="hidden" aria-hidden="true"><label htmlFor="contact-website">Website</label><input id="contact-website" name="website" tabIndex={-1} autoComplete="off" /></div>
          <div>
            <label htmlFor="contact-name" className={labelCls}>Nome *</label>
            <input id="contact-name" name="name" autoComplete="name" minLength={2} maxLength={120} required style={inputStyle} />
          </div>
          <div>
            <label htmlFor="contact-email" className={labelCls}>Email *</label>
            <input id="contact-email" name="email" type="email" autoComplete="email" maxLength={254} required style={inputStyle} />
          </div>
          <div>
            <label htmlFor="contact-phone" className={labelCls}>Telefone *</label>
            <input id="contact-phone" name="phone" type="tel" autoComplete="tel" maxLength={30} required style={inputStyle} />
          </div>

          {isTestDrive && (
            <>
              <div>
                <label htmlFor="contact-date" className={labelCls}>Data preferida (calendário) *</label>
                <input id="contact-date" name="preferred_date" type="date" min={today} max={maxDate} required style={inputStyle} />
                <p className="mt-1 text-xs text-muted">Entre hoje e {maxDate} (máx. 30 dias).</p>
              </div>
              <div>
                <label htmlFor="contact-time" className={labelCls}>Hora preferida *</label>
                <select id="contact-time" name="preferred_time" required defaultValue="" style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="" disabled>Escolhe uma hora…</option>
                  <optgroup label="Manhã (10h–12h)">
                    {ALLOWED_TIMES.slice(0, 5).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Tarde (14h–17h)">
                    {ALLOWED_TIMES.slice(5).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div>
                <label htmlFor="contact-notes" className={labelCls}>Notas / dúvidas *</label>
                <textarea id="contact-notes" name="notes" rows={3} minLength={2} maxLength={2000} required style={{ ...inputStyle, resize: "vertical" as const }} />
              </div>
            </>
          )}

          {!isTestDrive && (
            <div>
              <label htmlFor="contact-message" className={labelCls}>Mensagem *</label>
              <textarea id="contact-message" name="message" minLength={5} maxLength={5000} required rows={5} style={{ ...inputStyle, resize: "vertical" as const }} />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-copper px-6 py-3 font-display text-sm font-semibold uppercase tracking-widest text-white transition-colors hover:bg-copper-light disabled:opacity-50"
          >
            {loading ? "A enviar..." : isTestDrive ? "Reservar Test Drive" : "Enviar Mensagem"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ContactoPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><p className="text-muted">A carregar...</p></div>}>
      <ContactoContent />
    </Suspense>
  );
}
