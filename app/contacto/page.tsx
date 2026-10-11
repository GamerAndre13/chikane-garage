"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { validarTelemovelPT } from "@/lib/validacao";
import type { SiteSettings } from "@/lib/site-settings";
import { instagramUrl, facebookUrl, whatsappUrl, youtubeUrl, tiktokUrl } from "@/lib/social-links";

type VehicleRef = { id: string; brand: string; model: string; slug: string; status?: string | null };

// Converte erros técnicos (Supabase/email/rede) em mensagens amigáveis,
// sem expor detalhes internos ao utilizador.
function friendlyError(msg?: string): string {
  const low = (msg || "").toLowerCase();
  if (
    low.includes("chikane-garage.blog") ||
    low.includes("chikanegarage") ||
    low.includes("smtp") ||
    low.includes("fetch") ||
    low.includes("network")
  ) {
    return "Não foi possível completar o pedido. Tenta novamente em instantes.";
  }
  return msg && msg.length > 0 ? msg : "Ocorreu um erro ao enviar. Tenta novamente.";
}

// Slots de hora permitidos por omissão: 10h–12h e 14h–17h, sempre :00 ou :30
// (podem ser substituídos pela configuração em /admin/definicoes → Test drives)
const ALLOWED_TIMES = [
  "10:00", "10:30", "11:00", "11:30", "12:00",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00",
];

// Rótulos por dia da semana (getDay(): 0 = Domingo … 6 = Sábado)
const DAY_NAMES = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

// Converte "segunda,terça,..." (sem acentos também) numa lista de dias 0–6
function parseDays(raw: string): number[] {
  const names = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[- ]/g, "");
  const days: number[] = [];
  for (const token of raw.split(",").map((t) => norm(t.trim())).filter(Boolean)) {
    const idx = names.findIndex((name) => {
      const n = norm(name);
      return n === token || n.startsWith(token) || token.startsWith(n.slice(0, 3));
    });
    if (idx !== -1 && !days.includes(idx)) days.push(idx);
  }
  return days;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

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
} as const;

const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted";

function ContactoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const testdriveSlug = searchParams.get("testdrive");
  const vehicleSlug = searchParams.get("vehicle");
  const reservaSlug = searchParams.get("reserva");

  // O modo é definido pelo parâmetro na URL: ?testdrive=…, ?reserva=… ou
  // sem parâmetro (pedir info, também aceita ?vehicle=…).
  const isReserva = Boolean(reservaSlug);
  const isTestDrive = Boolean(testdriveSlug);

  // Alterna entre "pedir info", "marcar test-drive" e "reservar" a mesma viatura
  const switchMode = (mode: "info" | "testdrive" | "reserva") => {
    const slug = testdriveSlug || vehicleSlug || reservaSlug;
    if (!slug) return;
    const params = new URLSearchParams();
    const key = mode === "testdrive" ? "testdrive" : mode === "reserva" ? "reserva" : "vehicle";
    params.set(key, slug);
    router.replace(`/contacto?${params.toString()}`);
  };

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<VehicleRef | null>(null);
  const [vehicleLoading, setVehicleLoading] = useState(!!testdriveSlug || !!vehicleSlug || !!reservaSlug);
  const nameRef = useRef<HTMLInputElement>(null);

  // Configuração dos test-drives (duração/horários/dias) vinda do back office.
  // Se a migração 016 ainda não tiver sido corrida, usa os valores por omissão.
  const [tdConfig, setTdConfig] = useState<{ duration: number; slots: string[]; days: number[] } | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [occupied, setOccupied] = useState<string[]>([]);
  const [occupiedDate, setOccupiedDate] = useState("");

  useEffect(() => {
    if (!isTestDrive) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("site_settings").select("td_duration_minutes, td_slots, td_days").limit(1).maybeSingle();
      if (cancelled) return;
      if (data) {
        setTdConfig({
          duration: Number(data.td_duration_minutes) || 60,
          slots: String(data.td_slots || "").split(",").map((s) => s.trim()).filter(Boolean),
          days: parseDays(String(data.td_days || "")),
        });
      } else {
        setTdConfig({ duration: 60, slots: [], days: [] });
      }
    })();
    return () => { cancelled = true; };
  }, [isTestDrive]);

  // Horários já confirmados para a data escolhida (RPC da migração 016).
  useEffect(() => {
    if (!isTestDrive || !selectedDate) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("get_occupied_test_drive_slots", { p_date: selectedDate });
      if (!cancelled) {
        setOccupied((data as string[]) || []);
        setOccupiedDate(selectedDate);
      }
    })();
    return () => { cancelled = true; };
  }, [isTestDrive, selectedDate]);

  // Ao chegar via ?vehicle=… / ?testdrive=… / ?reserva=…, leva o utilizador ao
  // formulário e foca o primeiro campo (o formulário está abaixo do cartão).
  useEffect(() => {
    if (!testdriveSlug && !vehicleSlug && !reservaSlug) return;
    const timer = window.setTimeout(() => {
      nameRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      nameRef.current?.focus();
    }, 150);
    return () => window.clearTimeout(timer);
  }, [testdriveSlug, vehicleSlug, reservaSlug]);

  // Carregar a viatura a partir do slug (resolve id, usado nas tabelas)
  useEffect(() => {
    const slug = testdriveSlug || vehicleSlug || reservaSlug;
    if (!slug) return;
    (async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("id, brand, model, slug, status")
        .eq("slug", slug)
        .maybeSingle();
      if (data) setVehicle(data as VehicleRef);
      setVehicleLoading(false);
    })();
  }, [testdriveSlug, vehicleSlug, reservaSlug]);

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

  // Insere o pedido e confirma que a BD gravou (select de "id"). Caso a coluna
  // user_id ainda não exista na BD, repete o insert sem ela. Só é "sucesso"
  // quando a BD devolve a linha gravada — nunca mostra sucesso sem gravar.
  async function insertResilient(
    table: "contact_requests" | "test_drives",
    payload: Record<string, unknown>
  ): Promise<{ message: string } | null> {
    const res = await supabase.from(table).insert(payload).select("id");
    if (res.data && res.data.length > 0) return null;
    if (res.error) {
      const msg = `${res.error.message} ${res.error.details ?? ""}`.toLowerCase();
      const missingUserId =
        payload.user_id !== undefined && (msg.includes("user_id") || res.error.code === "PGRST204");
      if (missingUserId) {
        const rest: Record<string, unknown> = { ...payload };
        delete rest.user_id;
        const retry = await supabase.from(table).insert(rest).select("id");
        if (retry.data && retry.data.length > 0) return null;
        return { message: retry.error?.message || "Não foi possível gravar o pedido. Tenta novamente." };
      }
      return { message: res.error.message };
    }
    return { message: "Não foi possível gravar o pedido. Tenta novamente." };
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);

    // Honeypot para filtrar submissões automatizadas. Não grava na BD e
    // também não mostra sucesso — resposta neutra para não enganar o user.
    if (String(fd.get("website") || "").trim()) {
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
    // Telemóvel português obrigatório: 9 dígitos a começar por 9 (+351 opcional)
    if (!validarTelemovelPT(phone)) {
      setError("Indica um telemóvel português válido (9 dígitos, começa por 9).");
      setLoading(false);
      return;
    }
    if (!isTestDrive && !isReserva && (message.length < 5 || message.length > 5000)) {
      setError("A mensagem deve ter entre 5 e 5000 caracteres.");
      setLoading(false);
      return;
    }
    if (isReserva && (message.length < 5 || message.length > 2000)) {
      setError("Explica o motivo da reserva (entre 5 e 2000 caracteres).");
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
      // Data e hora são obrigatórias e dentro das regras (hoje → +30 dias,
      // dias/horários disponíveis + horários já confirmados).
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
      const weekday = new Date(`${preferred_date}T12:00:00`).getDay();
      if (tdConfig && tdConfig.days.length && !tdConfig.days.includes(weekday)) {
        setError("Escolhe um dia da semana disponível para test drives.");
        setLoading(false);
        return;
      }
      const baseSlots = tdConfig && tdConfig.slots.length ? tdConfig.slots : ALLOWED_TIMES;
      if (!baseSlots.includes(preferred_time)) {
        setError("Escolhe uma hora disponível para o test drive.");
        setLoading(false);
        return;
      }
      // Slot já marcado (ou a decorrer) para essa data, dado o espaço de 1h/2h.
      const busy = selectedDate === preferred_date && bookedSlots.some((b) => {
        const start = toMinutes(preferred_time);
        return start >= toMinutes(b) && start < toMinutes(b) + (tdConfig?.duration || 60);
      });
      if (busy) {
        setError("Essa hora já está marcada. Escolhe outra disponível.");
        setLoading(false);
        return;
      }
      if (notes.length > 2000) {
        setError("As notas/dúvidas não podem ultrapassar os 2000 caracteres.");
        setLoading(false);
        return;
      }
      if (!vehicle?.id) {
        setError("Não foi possível identificar a viatura. Volta ao catálogo e tenta novamente.");
        setLoading(false);
        return;
      }
      try {
        const err = await insertResilient("test_drives", {
          ...common,
          vehicle_id: vehicle.id,
          preferred_date,
          preferred_time,
          notes,
          status: "pending",
        });
        if (err) {
          console.error("Erro test_drives:", err);
          setError(friendlyError(err.message));
        } else {
          setSuccess(true);
          setError(null);
          (e.target as HTMLFormElement).reset();
        }
      } catch (err) {
        console.error(err);
        setError(friendlyError(err instanceof Error ? err.message : undefined));
      }
    } else if (isReserva) {
      if (!vehicle?.id) {
        setError("Não foi possível identificar a viatura. Volta ao catálogo e tenta novamente.");
        setLoading(false);
        return;
      }
      const extension = fd.get("extension") === "on";
      try {
        // Só mostra sucesso se a BD devolver a linha gravada (nunca falso sucesso).
        const res = await supabase.from("reservations").insert({
          vehicle_id: vehicle.id,
          user_id: uid,
          name,
          email,
          phone: phone || null,
          message,
          extension_requested: extension,
          status: "pending",
        }).select("id");
        if (!res.data || res.data.length === 0) {
          setError("Não foi possível enviar o pedido de reserva. Tenta novamente em instantes.");
        } else {
          setSuccess(true);
          setError(null);
          (e.target as HTMLFormElement).reset();
        }
      } catch (err) {
        console.error("Erro ao criar reserva:", err);
        setError(friendlyError(err instanceof Error ? err.message : undefined));
      }
    } else {
      try {
        const err = await insertResilient("contact_requests", {
          ...common,
          vehicle_id: vehicle?.id || null,
          message,
        });
        if (err) {
          console.error("Erro contact_requests:", err);
          setError(friendlyError(err.message));
        } else {
          setSuccess(true);
          setError(null);
          (e.target as HTMLFormElement).reset();
        }
      } catch (err) {
        console.error(err);
        setError(friendlyError(err instanceof Error ? err.message : undefined));
      }
    }
    setLoading(false);
  }

  const heading = isReserva ? "Reservar Viatura" : isTestDrive ? "Marcar Test Drive" : "Fala Connosco";
  const sub = isReserva
    ? "Garante esta viatura. Se o pedido de reserva for aceite, fica reservada por 7 dias."
    : isTestDrive
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

  // Horários/dias efetivamente disponíveis (config do back office + ocupação)
  const baseSlots = tdConfig && tdConfig.slots.length ? tdConfig.slots : ALLOWED_TIMES;
  const tdDuration = tdConfig?.duration || 60;
  const selectedWeekday = selectedDate ? new Date(`${selectedDate}T12:00:00`).getDay() : -1;
  const dayNotAllowed = !!tdConfig && tdConfig.days.length > 0 && selectedWeekday !== -1 && !tdConfig.days.includes(selectedWeekday);
  // Horários ocupados apenas valem para a data selecionada (evita setState síncrono)
  const bookedSlots: string[] = !isTestDrive || !selectedDate || occupiedDate !== selectedDate ? [] : occupied;
  const isBusy = (slot: string) =>
    bookedSlots.some((b) => {
      const start = toMinutes(slot);
      return start >= toMinutes(b) && start < toMinutes(b) + tdDuration;
    });
  const visibleSlots = baseSlots.filter((t) => !isBusy(t));
  const morningSlots = visibleSlots.filter((t) => toMinutes(t) < 12 * 60);
  const afternoonSlots = visibleSlots.filter((t) => toMinutes(t) >= 12 * 60);
  const dayNamesText = tdConfig && tdConfig.days.length ? tdConfig.days.map((d) => DAY_NAMES[d]).join(", ") : "";
  const someBusyToday = bookedSlots.length > 0;

  // Em modo reserva, viaturas que já não estão disponíveis mostram um aviso
  // em vez do formulário (a reserva só faz sentido em "available").
  const reservaIndisponivel = isReserva && !!vehicle && vehicle.status !== "available";

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 bg-background-alt">
      <div className="mx-auto max-w-2xl">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-copper">
          {isReserva ? "Garante a tua escolha" : isTestDrive ? "Reserva a tua experiência" : "Fala Connosco"}
        </p>
        <h1 className="mt-3 font-display text-5xl font-bold uppercase tracking-wide text-foreground">{heading}</h1>
        <p className="mt-4 text-base leading-relaxed text-muted">{sub}</p>

        {(testdriveSlug || vehicleSlug || reservaSlug) && (
          <div className="mt-6 grid grid-cols-3 gap-2 rounded border border-border bg-surface-mid p-2">
            <button
              type="button"
              onClick={() => switchMode("info")}
              className={`cursor-pointer rounded px-4 py-3 font-display text-xs font-semibold uppercase tracking-[0.2em] transition-colors ${!isTestDrive && !isReserva ? "bg-copper text-black" : "border border-border text-muted hover:text-foreground"}`}
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
            <button
              type="button"
              onClick={() => switchMode("reserva")}
              className={`cursor-pointer rounded px-4 py-3 font-display text-xs font-semibold uppercase tracking-[0.2em] transition-colors ${isReserva ? "bg-copper text-black" : "border border-border text-muted hover:text-foreground"}`}
            >
              Reservar
            </button>
          </div>
        )}

        {vehicleLoading ? (
          <p className="mt-8 text-sm text-muted">A carregar viatura…</p>
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
                {isReserva ? "Reserva" : isTestDrive ? "Test Drive" : "Contacto"}
              </span>
            </div>
          )
        )}

        {success && (
          <div role="status" className="mt-8 border-l-4 border-green-500 bg-green-500/10 p-4 text-sm text-green-400">
            {isReserva
              ? "Pedido de reserva enviado! Vamos analisá-lo e responder-te por email. Se for aceite, a viatura fica reservada por 7 dias."
              : isTestDrive
                ? "Pedido de test drive enviado! Entramos em contacto para confirmar a data."
                : "Mensagem enviada com sucesso!"}
          </div>
        )}
        {error && <div role="alert" className="mt-8 border-l-4 border-red-500 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>}

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

        {reservaIndisponivel ? (
          <div className="mt-8 rounded border border-white/10 bg-surface px-5 py-6">
            <p className="font-display text-xs uppercase tracking-[0.22em] text-copper">Reserva</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              {vehicle?.status === "reserved"
                ? "Esta viatura está reservada no momento. Volta dentro de alguns dias para verificar se ficou disponível."
                : "Esta viatura não está disponível para reserva neste momento."}
            </p>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
          <div className="hidden" aria-hidden="true"><label htmlFor="contact-website">Website</label><input id="contact-website" name="website" tabIndex={-1} autoComplete="off" /></div>
          <div>
            <label htmlFor="contact-name" className={labelCls}>Nome *</label>
            <input id="contact-name" name="name" autoComplete="name" minLength={2} maxLength={120} required ref={nameRef} style={inputStyle} />
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
                <input
                  id="contact-date"
                  name="preferred_date"
                  type="date"
                  min={today}
                  max={maxDate}
                  required
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={inputStyle}
                />
                <p className="mt-1 text-xs text-muted">Entre hoje e {maxDate} (máx. 30 dias).</p>
                {selectedDate && dayNotAllowed && (
                  <p role="alert" className="mt-1 text-xs text-amber-400">
                    Os test drives só estão disponíveis às {dayNamesText}. Escolhe outro dia.
                  </p>
                )}
                {selectedDate && !dayNotAllowed && someBusyToday && (
                  <p className="mt-1 text-xs text-muted">As horas já marcadas para este dia ficam indisponíveis.</p>
                )}
              </div>
              <div>
                <label htmlFor="contact-time" className={labelCls}>Hora preferida *</label>
                <select
                  id="contact-time"
                  name="preferred_time"
                  required
                  defaultValue=""
                  disabled={dayNotAllowed}
                  style={{ ...inputStyle, cursor: dayNotAllowed ? "not-allowed" : "pointer" }}
                >
                  <option value="" disabled>Escolhe uma hora…</option>
                  {morningSlots.length > 0 && (
                    <optgroup label="Manhã">
                      {morningSlots.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </optgroup>
                  )}
                  {afternoonSlots.length > 0 && (
                    <optgroup label="Tarde">
                      {afternoonSlots.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </optgroup>
                  )}
                  {visibleSlots.length === 0 && (
                    <option value="" disabled>Sem horas disponíveis para esta data</option>
                  )}
                </select>
                {visibleSlots.length < baseSlots.length && (
                  <p className="mt-1 text-xs text-muted">
                    {baseSlots.length - visibleSlots.length} hora(s) já marcada(s) — cada test drive ocupa {tdDuration} min.
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="contact-notes" className={labelCls}>Notas / dúvidas (opcional)</label>
                <textarea id="contact-notes" name="notes" rows={3} maxLength={2000} style={{ ...inputStyle, resize: "vertical" as const }} />
              </div>
            </>
          )}

          {isReserva && (
            <>
              <p className="border-l-2 border-copper bg-background-alt px-4 py-3 text-xs leading-5 text-muted">
                Se o teu pedido de reserva for aceite, a viatura fica <strong className="text-copper">reservada por 7 dias</strong>.
                Pedidos de extensão ficam sujeitos a uma pequena entrada.
              </p>
              <div>
                <label htmlFor="contact-reserva-motivo" className={labelCls}>Motivo da reserva *</label>
                <textarea id="contact-reserva-motivo" name="message" rows={4} minLength={5} maxLength={2000} required style={{ ...inputStyle, resize: "vertical" as const }} />
              </div>
              <label className="flex cursor-pointer items-start gap-3 text-sm text-muted">
                <input name="extension" type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--copper)]" />
                <span>Quero reservar por mais de 7 dias (extensão). <span className="text-muted/60">— sujeito a uma pequena entrada</span></span>
              </label>
            </>
          )}

          {!isTestDrive && !isReserva && (
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
            {loading ? "A enviar…" : isReserva ? "Enviar pedido de reserva" : isTestDrive ? "Reservar Test Drive" : "Enviar Mensagem"}
          </button>
        </form>
        )}
      </div>
    </div>
  );
}

export default function ContactoPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><p className="text-muted">A carregar…</p></div>}>
      <ContactoContent />
    </Suspense>
  );
}
