"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { SiteSettings } from "@/lib/site-settings";
import { instagramUrl, facebookUrl, whatsappUrl, youtubeUrl, tiktokUrl } from "@/lib/social-links";

type VehicleRef = { id: string; brand: string; model: string; slug: string };

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
  const testdriveSlug = searchParams.get("testdrive");
  const vehicleSlug = searchParams.get("vehicle");

  // test-drive mode é ativado quando vem ?testdrive=<slug>
  const isTestDrive = Boolean(testdriveSlug);

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

  const today = new Date().toISOString().slice(0, 10);

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
    const message = String(fd.get("message") || "").trim();
    if (name.length < 2 || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Confirma o nome e introduz um email válido.");
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
      phone: (fd.get("phone") as string) || null,
    };

    if (isTestDrive) {
      // Guerra no fluxo de test drive: data é obrigatória
      const preferred_date = fd.get("preferred_date") as string;
      if (!preferred_date) {
        setError("Escolhe uma data preferida para o test drive.");
        setLoading(false);
        return;
      }
      if (!vehicle?.id) {
        setError("Não foi possível identificar a viatura. Volta ao catálogo e tenta novamente.");
        setLoading(false);
        return;
      }
      try {
        const { error } = await supabase.from("test_drives").insert({
          ...common,
          vehicle_id: vehicle.id,
          preferred_date,
          preferred_time: (fd.get("preferred_time") as string) || null,
          notes: (fd.get("notes") as string) || null,
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
        const { error } = await supabase.from("contact_requests").insert({
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
            <label htmlFor="contact-phone" className={labelCls}>Telefone</label>
            <input id="contact-phone" name="phone" type="tel" autoComplete="tel" maxLength={30} style={inputStyle} />
          </div>

          {isTestDrive && (
            <>
              <div>
                <label htmlFor="contact-date" className={labelCls}>Data preferida *</label>
                <input id="contact-date" name="preferred_date" type="date" min={today} required style={inputStyle} />
                <p className="mt-1 text-xs text-muted">Mínimo: hoje.</p>
              </div>
              <div>
                <label htmlFor="contact-time" className={labelCls}>Hora preferida</label>
                <input id="contact-time" name="preferred_time" type="time" style={inputStyle} />
              </div>
              <div>
                <label htmlFor="contact-notes" className={labelCls}>Notas / dúvidas</label>
                <textarea id="contact-notes" name="notes" rows={3} maxLength={2000} style={{ ...inputStyle, resize: "vertical" as const }} />
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
