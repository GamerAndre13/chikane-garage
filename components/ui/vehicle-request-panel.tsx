"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { validarTelemovelPT } from "@/lib/validacao";

// Painel de pedido inline na ficha da viatura (mesmo fluxo do site Lovable):
// os botões "Marcar test-drive" / "Pedir informações" abrem um formulário no
// local — sem sair da página — e enviam pelas RPCs do back office
// (submit_test_drive / submit_contact_request) com fallback para insert direto,
// exatamente como a página /contacto faz.

type Tab = "testdrive" | "info";

const btnBase =
  "flex items-center justify-center border border-copper/60 px-6 py-4 text-center font-display text-xs font-semibold uppercase tracking-[0.24em] text-copper transition-colors hover:bg-copper hover:text-black";
const btnAtivo =
  "flex items-center justify-center bg-copper px-6 py-4 text-center font-display text-xs font-semibold uppercase tracking-[0.24em] text-black transition-colors";
const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted";
const fieldCls =
  "block w-full border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-copper focus:outline-none";

// Nunca mostrar erros técnicos da base de dados (ex.: RLS) ao visitante.
function friendlyError(msg?: string): string {
  const low = (msg || "").toLowerCase();
  if (low.includes("row-level security") || low.includes("violates") || low.includes("permission denied") || low.includes("pgrst") || low.includes("fetch") || low.includes("network")) {
    return "Não foi possível enviar o pedido. Tenta novamente em instantes.";
  }
  return msg && msg.length > 0 ? msg : "Ocorreu um erro ao enviar. Tenta novamente.";
}

function reasonMessage(reason?: string): string {
  if (reason === "rate_limited") return "Já enviaste pedidos há pouco tempo. Aguarda uns minutos e tenta novamente.";
  if (reason === "invalid_date") return "Escolhe uma data válida para o test drive.";
  return "Confirma o nome e introduz um email válido.";
}

// "YYYY-MM-DD" local (não UTC) para comparar com o valor do input type=date.
function hoje(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function maisDias(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function VehicleRequestPanel({ vehicleId, infoLabel }: { vehicleId: string; infoLabel: string }) {
  const [tab, setTab] = useState<Tab | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<Tab | null>(null);
  const [error, setError] = useState<string | null>(null);
  // limites do input de data (hoje → +30 dias) só depois do mount, para não
  // divergir na hidratação; tdDays = dias da semana permitidos pelo back office.
  const [limites, setLimites] = useState<{ min: string; max: string } | null>(null);
  const [tdDays, setTdDays] = useState<number[] | null>(null);
  // Contactos do perfil quando há sessão — passam aos campos como defaultValue
  // (o formulário só renderiza quando a aba abre).
  const [prefill, setPrefill] = useState({ name: "", email: "", phone: "" });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) setLimites({ min: hoje(), max: maisDias(30) });
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      let next = {
        name: (user.user_metadata?.full_name as string) || "",
        email: user.email || "",
        phone: "",
      };
      const { data: profile } = await supabase.from("profiles").select("full_name, email, phone").eq("id", user.id).maybeSingle();
      if (cancelled) return;
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

  // Dias da semana com test drives (config do back office) — só ao abrir a aba.
  useEffect(() => {
    if (tab !== "testdrive" || tdDays !== null) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("site_settings").select("td_days").limit(1).maybeSingle();
      if (cancelled) return;
      const names = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
      const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[- ]/g, "");
      const days: number[] = [];
      for (const token of String(data?.td_days || "").split(",").map((t) => norm(t.trim())).filter(Boolean)) {
        const idx = names.findIndex((n) => n === token || n.startsWith(token) || token.startsWith(n.slice(0, 3)));
        if (idx !== -1 && !days.includes(idx)) days.push(idx);
      }
      if (!cancelled) setTdDays(days);
    })();
    return () => { cancelled = true; };
  }, [tab, tdDays]);

  const abrir = (nova: Tab) => {
    setError(null);
    setSuccess(null);
    setTab((atual) => (atual === nova ? null : nova));
  };

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
        return { message: retry.error?.message ?? "" };
      }
      return { message: res.error.message };
    }
    return { message: "" };
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!tab) return;
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);

    // Honeypot: filtrar submissões automatizadas com resposta neutra.
    if (String(fd.get("website") || "").trim()) {
      setLoading(false);
      return;
    }

    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim().toLowerCase();
    const phone = String(fd.get("phone") || "").trim();
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

    const { data: { user } } = await supabase.auth.getUser();
    const uid = user?.id ?? null;
    const common = { user_id: uid, name, email, phone: phone || null };

    if (tab === "testdrive") {
      const preferred_date = String(fd.get("preferred_date") || "");
      const notes = String(fd.get("notes") || "").trim();
      if (!preferred_date) {
        setError("Escolhe a data preferida para o test drive.");
        setLoading(false);
        return;
      }
      if (preferred_date < hoje() || preferred_date > maisDias(30)) {
        setError("A data do test drive deve ser entre hoje e os próximos 30 dias.");
        setLoading(false);
        return;
      }
      const weekday = new Date(`${preferred_date}T12:00:00`).getDay();
      if (tdDays && tdDays.length && !tdDays.includes(weekday)) {
        setError("Escolhe um dia da semana disponível para test drives.");
        setLoading(false);
        return;
      }
      if (notes.length > 2000) {
        setError("As notas/dúvidas não podem ultrapassar os 2000 caracteres.");
        setLoading(false);
        return;
      }
      try {
        // RPC SECURITY DEFINER: funciona para visitantes anónimos e não expõe
        // erros de RLS. Se ainda não existir na BD, recai no insert direto.
        const { data: rpcData, error: rpcError } = await supabase.rpc("submit_test_drive", {
          p_name: name,
          p_email: email,
          p_phone: phone || null,
          p_vehicle_id: vehicleId,
          p_preferred_date: preferred_date,
          p_preferred_time: null,
          p_notes: notes,
          p_user_id: uid,
        });
        const result = rpcData as { ok?: boolean; reason?: string } | null;
        if (!rpcError && result?.ok) {
          setSuccess("testdrive");
          setError(null);
          setTab(null);
          formRef.current?.reset();
          setLoading(false);
          return;
        }
        if (!rpcError) {
          setError(reasonMessage(result?.reason));
          setLoading(false);
          return;
        }
        const err = await insertResilient("test_drives", {
          ...common,
          vehicle_id: vehicleId,
          preferred_date,
          preferred_time: null,
          notes,
        });
        if (err) {
          setError(friendlyError(err.message));
          setLoading(false);
          return;
        }
        setSuccess("testdrive");
        setError(null);
        setTab(null);
        formRef.current?.reset();
      } catch (err) {
        setError(friendlyError(err instanceof Error ? err.message : undefined));
      }
      setLoading(false);
      return;
    }

    // Aba INFORMAÇÕES — pedido de informação sobre a viatura.
    const message = String(fd.get("message") || "").trim();
    if (message.length < 5 || message.length > 5000) {
      setError("A mensagem deve ter entre 5 e 5000 caracteres.");
      setLoading(false);
      return;
    }
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc("submit_contact_request", {
        p_name: name,
        p_email: email,
        p_phone: phone || null,
        p_message: message,
        p_vehicle_id: vehicleId,
        p_user_id: uid,
      });
      const result = rpcData as { ok?: boolean; reason?: string } | null;
      if (!rpcError && result?.ok) {
        setSuccess("info");
        setError(null);
        setTab(null);
        formRef.current?.reset();
        setLoading(false);
        return;
      }
      if (!rpcError) {
        setError(reasonMessage(result?.reason));
        setLoading(false);
        return;
      }
      const err = await insertResilient("contact_requests", {
        ...common,
        message,
        vehicle_id: vehicleId,
        status: "new",
      });
      if (err) {
        setError(friendlyError(err.message));
        setLoading(false);
        return;
      }
      setSuccess("info");
      setError(null);
      setTab(null);
      formRef.current?.reset();
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : undefined));
    }
    setLoading(false);
  }

  // display:contents — os dois botões participam no grid de botões da ficha e
  // o formulário ocupa as duas colunas por baixo, sem wrappers extra.
  return (
    <div className="contents">
      <button type="button" onClick={() => abrir("testdrive")} aria-expanded={tab === "testdrive"} className={tab === "testdrive" ? btnAtivo : btnBase}>
        Marcar test-drive
      </button>
      <button type="button" onClick={() => abrir("info")} aria-expanded={tab === "info"} className={tab === "info" ? btnAtivo : btnBase}>
        {infoLabel}
      </button>

      {success && (
        <div className="sm:col-span-2 border border-copper/50 bg-surface px-5 py-4">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-copper">
            {success === "testdrive" ? "Pedido de test drive enviado" : "Pedido enviado"}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            {success === "testdrive"
              ? "Recebemos o teu pedido — a equipa confirma a data contigo em breve (por email ou telefone)."
              : "Recebemos o teu pedido — a equipa responde-te em breve (por email ou telefone)."}
          </p>
        </div>
      )}

      {tab && (
        <div className="sm:col-span-2 border border-border bg-surface px-5 py-6 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-display text-[10px] uppercase tracking-[0.24em] text-copper">Enviar pedido</p>
              <h3 className="mt-1 font-display text-xl font-semibold uppercase tracking-wide text-foreground">
                {tab === "testdrive" ? "Marcar test drive" : infoLabel}
              </h3>
            </div>
            <button type="button" onClick={() => setTab(null)} aria-label="Fechar formulário" className="border border-border px-3 py-1.5 font-display text-[10px] uppercase tracking-widest text-muted transition-colors hover:border-copper hover:text-copper">
              Fechar
            </button>
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
            {/* Honeypot invisível: bots preenchem, humanos não. */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
            <label className={labelCls}>Nome<input name="name" type="text" required maxLength={120} autoComplete="name" defaultValue={prefill.name} className={fieldCls}/></label>
            <label className={labelCls}>Email<input name="email" type="email" required maxLength={254} autoComplete="email" defaultValue={prefill.email} className={fieldCls}/></label>
            <label className={labelCls}>Telemóvel<input name="phone" type="tel" required maxLength={20} autoComplete="tel" placeholder="912 345 678" defaultValue={prefill.phone} className={fieldCls}/></label>
            {tab === "testdrive" ? (
              <label className={labelCls}>Data preferida
                <input name="preferred_date" type="date" required min={limites?.min ?? ""} max={limites?.max ?? ""} className={fieldCls}/>
              </label>
            ) : null}
            {tab === "testdrive" ? (
              <label className={`${labelCls} sm:col-span-2`}>Notas
                <textarea name="notes" rows={4} maxLength={2000} placeholder="Dia e hora preferidos, dúvidas, quem vai conduzir…" className={fieldCls}/>
              </label>
            ) : (
              <label className={`${labelCls} sm:col-span-2`}>Mensagem
                <textarea name="message" rows={4} required minLength={5} maxLength={5000} placeholder="Escreve aqui as tuas dúvidas sobre esta viatura…" className={fieldCls}/>
              </label>
            )}
            {error && <p role="alert" className="text-xs leading-5 text-red sm:col-span-2">{error}</p>}
            <div className="flex items-center gap-4 sm:col-span-2">
              <button type="submit" disabled={loading} className="bg-copper px-7 py-4 font-display text-xs font-semibold uppercase tracking-[0.24em] text-black transition-colors hover:bg-copper-light disabled:opacity-60">
                {loading ? "A enviar…" : "Enviar pedido"}
              </button>
              <p className="text-[11px] leading-4 text-muted">Respondemos normalmente no próprio dia útil.</p>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
