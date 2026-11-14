"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { validarEmail, validarMensagem, validarNome, validarTelemovel } from "@/lib/validacao";
import { FieldError, campoEstilo } from "@/components/ui/field-error";
import type { SiteSettings } from "@/lib/site-settings";
import { instagramUrl, facebookUrl, whatsappUrl, youtubeUrl, tiktokUrl } from "@/lib/social-links";
import { mapsUrl } from "@/lib/maps";

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
  // Nunca mostrar erros técnicos da base de dados (ex.: RLS) ao visitante.
  if (
    low.includes("row-level security") ||
    low.includes("violates") ||
    low.includes("permission denied") ||
    low.includes("pgrst")
  ) {
    return "Não foi possível enviar o pedido. Tenta novamente em instantes.";
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

// Minutos desde a meia-noite, na hora de Lisboa. Serve para esconder as horas
// já passadas quando a data escolhida é hoje (o site é para Portugal).
function nowMinutesLisbon(): number {
  const parts = new Intl.DateTimeFormat("pt-PT", {
    timeZone: "Europe/Lisbon",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  return get("hour") * 60 + get("minute");
}

// Data (YYYY-MM-DD) no fuso de Lisboa, com deslocamento em dias. Serve para
// os limites do test drive acompanharem o calendário português mesmo quando
// o servidor ou o browser estão noutro fuso.
function lisbonDateString(offsetDays = 0): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const date = new Date(Date.UTC(get("year"), get("month") - 1, get("day") + offsetDays, 12));
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

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
  // Erros por campo: aparecem por baixo do input e o campo fica com o rebordo
  // vermelho enquanto o valor não for válido.
  const [erros, setErros] = useState<Record<string, string | null>>({});

  // Validação de cada campo (item 13). É chamada ao sair do campo e repete-se
  // enquanto o valor tiver erro, para o vermelho desaparecer assim que ficar
  // válido (item 14).
  const calcularErro = (campo: string, valor: string): string | null => {
    switch (campo) {
      case "name":
        return validarNome(valor);
      case "email":
        return validarEmail(valor);
      case "phone":
        return validarTelemovel(valor);
      case "preferred_date": {
        if (!valor) return "Escolhe uma data para o test drive.";
        if (valor < today || valor > maxDate) return "Escolhe uma data entre hoje e os próximos 30 dias.";
        const weekday = new Date(`${valor}T12:00:00`).getDay();
        if (tdConfig && tdConfig.days.length && !tdConfig.days.includes(weekday)) {
          return `Os test drives só estão disponíveis às ${dayNamesText}.`;
        }
        return null;
      }
      case "preferred_time":
        return valor ? null : "Escolhe uma hora para o test drive.";
      case "notes":
        return validarMensagem(valor, 0, 2000, "A nota");
      case "message":
        return isReserva
          ? validarMensagem(valor, 5, 2000, "A explicação do motivo")
          : validarMensagem(valor, 5, 5000);
      default:
        return null;
    }
  };

  const validarCampo = (campo: string, valor: string) => {
    const msg = calcularErro(campo, valor);
    setErros((prev) => ({ ...prev, [campo]: msg }));
    return msg;
  };

  const revalidar = (campo: string, valor: string) => {
    if (!erros[campo]) return;
    const msg = calcularErro(campo, valor);
    setErros((prev) => ({ ...prev, [campo]: msg }));
  };
  const [vehicle, setVehicle] = useState<VehicleRef | null>(null);
  const [vehicleLoading, setVehicleLoading] = useState(!!testdriveSlug || !!vehicleSlug || !!reservaSlug);
  const nameRef = useRef<HTMLInputElement>(null);

  // Pré-preenchimento dos contactos quando há sessão iniciada (nome/email/
  // telefone do perfil). O utilizador pode sempre alterar antes de enviar.
  const [prefill, setPrefill] = useState({ name: "", email: "", phone: "" });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      let next = {
        name: (user.user_metadata?.full_name as string) || "",
        email: user.email || "",
        phone: "",
      };
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, phone")
        .eq("id", user.id)
        .maybeSingle();
      if (profile) {
        next = {
          name: profile.full_name || next.name,
          email: profile.email || next.email,
          phone: profile.phone || "",
        };
      }
      if (!cancelled) setPrefill(next);
    })();
    return () => { cancelled = true; };
  }, []);

  // Configuração dos test-drives (duração/horários/dias) vinda do back office.
  // Se a migração 016 ainda não tiver sido corrida, usa os valores por omissão.
  const [tdConfig, setTdConfig] = useState<{ duration: number; slots: string[]; days: number[] } | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [occupied, setOccupied] = useState<string[]>([]);
  const [occupiedDate, setOccupiedDate] = useState("");

  // Minutos atuais (hora de Lisboa), atualizados a cada minuto. Só no cliente
  // (evita divergência de hidratação) e usado para esconder as horas de hoje
  // que já passaram.
  const [nowMins, setNowMins] = useState<number | null>(null);
  useEffect(() => {
    if (!isTestDrive) return;
    const update = () => setNowMins(nowMinutesLisbon());
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, [isTestDrive]);

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

  // Limites no fuso de Lisboa: hoje → próximos 30 dias.
  const today = lisbonDateString(0);
  const maxDate = lisbonDateString(30);

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
    const preferredDate = String(fd.get("preferred_date") || "").trim();
    const preferredTime = String(fd.get("preferred_time") || "").trim();
    const notes = String(fd.get("notes") || "").trim();

    // Validação de todos os campos visíveis: os erros ficam por baixo de cada
    // input (e a vermelho no próprio campo), como nos restantes formulários.
    const campos: Record<string, string | null> = {
      name: calcularErro("name", name),
      email: calcularErro("email", email),
      phone: calcularErro("phone", phone),
    };
    if (isTestDrive) {
      campos.preferred_date = calcularErro("preferred_date", preferredDate);
      campos.preferred_time = calcularErro("preferred_time", preferredTime);
      campos.notes = calcularErro("notes", notes);
    }
    if (isReserva) campos.message = calcularErro("message", message);
    if (!isTestDrive && !isReserva) campos.message = calcularErro("message", message);

    setErros((prev) => ({ ...prev, ...campos }));
    if (Object.values(campos).some(Boolean)) {
      setError("Confirma os campos assinalados a vermelho.");
      setLoading(false);
      return;
    }
    setError(null);

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
      // A data e a hora já foram validadas acima (formato/regras). Aqui só se
      // confirmam as horas marcadas e as que já passaram — o erro fica no
      // campo da hora, a vermelho.
      const baseSlots = tdConfig && tdConfig.slots.length ? tdConfig.slots : ALLOWED_TIMES;
      if (!baseSlots.includes(preferredTime)) {
        setErros((prev) => ({ ...prev, preferred_time: "Escolhe uma hora disponível para o test drive." }));
        setError("Confirma os campos assinalados a vermelho.");
        setLoading(false);
        return;
      }
      // A hora já passou (só relevante se for hoje).
      if (preferredDate === today && toMinutes(preferredTime) <= nowMinutesLisbon()) {
        setErros((prev) => ({ ...prev, preferred_time: "Essa hora já passou. Escolhe outra disponível." }));
        setError("Confirma os campos assinalados a vermelho.");
        setLoading(false);
        return;
      }
      // Slot já marcado (ou a decorrer) para essa data, dado o espaço de 1h/2h.
      const busy = selectedDate === preferredDate && bookedSlots.some((b) => {
        const start = toMinutes(preferredTime);
        return start >= toMinutes(b) && start < toMinutes(b) + (tdConfig?.duration || 60);
      });
      if (busy) {
        setErros((prev) => ({ ...prev, preferred_time: "Essa hora já está marcada. Escolhe outra disponível." }));
        setError("Confirma os campos assinalados a vermelho.");
        setLoading(false);
        return;
      }
      if (!vehicle?.id) {
        setError("Não foi possível identificar a viatura. Volta ao catálogo e tenta novamente.");
        setLoading(false);
        return;
      }
      try {
        // RPC SECURITY DEFINER (migração 019): funciona para visitantes anónimos
        // e nunca expõe erros de RLS. Se ainda não existir na BD, recai no
        // insert direto para o formulário não parar.
        const { data: rpcData, error: rpcError } = await supabase.rpc("submit_test_drive", {
          p_name: name,
          p_email: email,
          p_phone: phone || null,
          p_vehicle_id: vehicle.id,
          p_preferred_date: preferredDate,
          p_preferred_time: preferredTime || null,
          p_notes: notes,
          p_user_id: uid,
        });
        const result = rpcData as { ok?: boolean; reason?: string } | null;

        if (!rpcError && result?.ok) {
          setSuccess(true);
          setError(null);
          (e.target as HTMLFormElement).reset();
          setErros({});
        } else if (!rpcError) {
          setError(
            result?.reason === "invalid_date"
              ? "Escolhe uma data válida para o test drive."
              : "Não foi possível enviar o pedido. Confirma os dados e tenta novamente."
          );
        } else {
          const err = await insertResilient("test_drives", {
            ...common,
            vehicle_id: vehicle.id,
            preferred_date: preferredDate,
            preferred_time: preferredTime,
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
          setErros({});
          }
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
        // RPC SECURITY DEFINER (migração 019) — envia sem login e sem erros de
        // RLS. Sem a RPC, recai no insert direto.
        const { data: rpcData, error: rpcError } = await supabase.rpc("submit_reservation", {
          p_name: name,
          p_email: email,
          p_phone: phone || null,
          p_message: message,
          p_vehicle_id: vehicle.id,
          p_extension: extension,
          p_user_id: uid,
        });
        const result = rpcData as { ok?: boolean } | null;

        if (!rpcError && result?.ok) {
          setSuccess(true);
          setError(null);
          (e.target as HTMLFormElement).reset();
          setErros({});
        } else if (!rpcError) {
          setError("Não foi possível enviar o pedido de reserva. Confirma os dados e tenta novamente.");
        } else {
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
          setErros({});
          }
        }
      } catch (err) {
        console.error("Erro ao criar reserva:", err);
        setError(friendlyError(err instanceof Error ? err.message : undefined));
      }
    } else {
      // Limite anti-spam: no máximo 2 pedidos de informação por email a cada
      // 30 minutos (RPC SECURITY DEFINER da migração 018). Se a função ainda
      // não existir na BD, recai no insert direto para o formulário não parar.
      try {
        const { data, error: rpcError } = await supabase.rpc("submit_contact_request", {
          p_name: name,
          p_email: email,
          p_phone: phone || null,
          p_message: message,
          p_vehicle_id: vehicle?.id || null,
          p_user_id: uid,
        });
        const result = data as { ok?: boolean; reason?: string } | null;
        if (rpcError) {
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
          setErros({});
          }
        } else if (result?.ok) {
          setSuccess(true);
          setError(null);
          (e.target as HTMLFormElement).reset();
          setErros({});
        } else if (result?.reason === "rate_limited") {
          setError("Já recebemos 2 pedidos de informação com este email nos últimos 30 minutos. Tenta novamente mais tarde.");
        } else {
          setError("Não foi possível enviar a mensagem. Confirma os dados e tenta novamente.");
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
  // No dia de hoje, esconder as horas que já passaram (ex.: às 12:00 não faz
  // sentido mostrar as 10:00). `nowMins` só existe no cliente.
  const pastToday = selectedDate === today && nowMins != null ? nowMins : null;
  const isPast = (slot: string) => pastToday != null && toMinutes(slot) <= pastToday;
  const busyCount = baseSlots.filter((t) => isBusy(t)).length;
  const pastCount = pastToday != null ? baseSlots.filter((t) => isPast(t)).length : 0;
  const visibleSlots = baseSlots.filter((t) => !isBusy(t) && !isPast(t));
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
              {(s?.location || s?.address) && (
                <li>
                  {(() => {
                    const href = mapsUrl(s?.location_url, s?.address, s?.location);
                    const label = s?.location || s?.address;
                    return href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-colors hover:text-foreground"
                      >
                        {label} ↗
                      </a>
                    ) : (
                      <span>{label}</span>
                    );
                  })()}
                </li>
              )}
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

        {reservaIndisponivel && (
          <div className="mt-8 rounded border border-white/10 bg-surface px-5 py-6">
            <p className="font-display text-xs uppercase tracking-[0.22em] text-copper">Reserva indisponível</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              {vehicle?.status === "reserved"
                ? "Esta viatura está reservada no momento. Volta dentro de alguns dias para verificar se ficou disponível."
                : "Esta viatura não está disponível para reserva neste momento."}
            </p>
          </div>
        )}

        {/* Com a viatura reservada o formulário continua visível, mas escurecido
            e sem poder ser preenchido nem enviado. */}
        <div
          className={reservaIndisponivel ? "pointer-events-none select-none opacity-40" : undefined}
          inert={reservaIndisponivel || undefined}
        >
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
          <div className="hidden" aria-hidden="true"><label htmlFor="contact-website">Website</label><input id="contact-website" name="website" tabIndex={-1} autoComplete="off" /></div>
          <div>
            <label htmlFor="contact-name" className={labelCls}>Nome *</label>
            <input
              id="contact-name"
              name="name"
              autoComplete="name"
              minLength={2}
              maxLength={120}
              required
              ref={nameRef}
              value={prefill.name}
              aria-invalid={Boolean(erros.name)}
              onBlur={(e) => validarCampo("name", e.target.value)}
              onChange={(e) => {
                const valor = e.target.value;
                setPrefill((p) => ({ ...p, name: valor }));
                revalidar("name", valor);
              }}
              style={campoEstilo(inputStyle, erros.name)}
            />
            <FieldError message={erros.name} />
          </div>
          <div>
            <label htmlFor="contact-email" className={labelCls}>Email *</label>
            <input
              id="contact-email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              value={prefill.email}
              aria-invalid={Boolean(erros.email)}
              onBlur={(e) => validarCampo("email", e.target.value)}
              onChange={(e) => {
                const valor = e.target.value;
                setPrefill((p) => ({ ...p, email: valor }));
                revalidar("email", valor);
              }}
              style={campoEstilo(inputStyle, erros.email)}
            />
            <FieldError message={erros.email} />
          </div>
          <div>
            <label htmlFor="contact-phone" className={labelCls}>Telefone *</label>
            <input
              id="contact-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              maxLength={30}
              required
              value={prefill.phone}
              aria-invalid={Boolean(erros.phone)}
              onBlur={(e) => validarCampo("phone", e.target.value)}
              onChange={(e) => {
                const valor = e.target.value;
                setPrefill((p) => ({ ...p, phone: valor }));
                revalidar("phone", valor);
              }}
              style={campoEstilo(inputStyle, erros.phone)}
            />
            <FieldError message={erros.phone} />
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
                  aria-invalid={Boolean(erros.preferred_date)}
                  onBlur={(e) => validarCampo("preferred_date", e.target.value)}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    revalidar("preferred_date", e.target.value);
                  }}
                  style={campoEstilo(inputStyle, erros.preferred_date)}
                />
                <FieldError message={erros.preferred_date} />
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
                  aria-invalid={Boolean(erros.preferred_time)}
                  onBlur={(e) => validarCampo("preferred_time", e.target.value)}
                  onChange={(e) => revalidar("preferred_time", e.target.value)}
                  style={{ ...campoEstilo(inputStyle, erros.preferred_time), cursor: dayNotAllowed ? "not-allowed" : "pointer" }}
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
                <FieldError message={erros.preferred_time} />
                {busyCount > 0 && (
                  <p className="mt-1 text-xs text-muted">
                    {busyCount} hora(s) já marcada(s) — cada test drive ocupa {tdDuration} min.
                  </p>
                )}
                {pastCount > 0 && (
                  <p className="mt-1 text-xs text-muted">As horas de hoje que já passaram não aparecem.</p>
                )}
              </div>
              <div>
                <label htmlFor="contact-notes" className={labelCls}>Notas / dúvidas (opcional)</label>
                <textarea
                  id="contact-notes"
                  name="notes"
                  rows={3}
                  maxLength={2000}
                  aria-invalid={Boolean(erros.notes)}
                  onBlur={(e) => validarCampo("notes", e.target.value)}
                  onChange={(e) => revalidar("notes", e.target.value)}
                  style={{ ...campoEstilo(inputStyle, erros.notes), resize: "vertical" as const }}
                />
                <FieldError message={erros.notes} />
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
                <textarea
                  id="contact-reserva-motivo"
                  name="message"
                  rows={4}
                  minLength={5}
                  maxLength={2000}
                  required
                  aria-invalid={Boolean(erros.message)}
                  onBlur={(e) => validarCampo("message", e.target.value)}
                  onChange={(e) => revalidar("message", e.target.value)}
                  style={{ ...campoEstilo(inputStyle, erros.message), resize: "vertical" as const }}
                />
                <FieldError message={erros.message} />
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
              <textarea
                id="contact-message"
                name="message"
                minLength={5}
                maxLength={5000}
                required
                rows={5}
                aria-invalid={Boolean(erros.message)}
                onBlur={(e) => validarCampo("message", e.target.value)}
                onChange={(e) => revalidar("message", e.target.value)}
                style={{ ...campoEstilo(inputStyle, erros.message), resize: "vertical" as const }}
              />
              <FieldError message={erros.message} />
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
        </div>
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
