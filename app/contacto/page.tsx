"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type VehicleRef = { id: string; brand: string; model: string; slug: string };

const inputStyle = {
  width: "100%",
  padding: "0.75rem 1rem",
  border: "1px solid #2a2a2a",
  backgroundColor: "#0a0a0a",
  color: "#f5f5f0",
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

  const today = new Date().toISOString().slice(0, 10);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);

    // Ligar o pedido ao utilizador logado (ou null se anónimo)
    const { data: { user } } = await supabase.auth.getUser();
    const uid = user?.id ?? null;

    const common = {
      user_id: uid,
      name: fd.get("name") as string,
      email: fd.get("email") as string,
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
      const { error } = await supabase.from("test_drives").insert({
        ...common,
        vehicle_id: vehicle.id,
        preferred_date,
        preferred_time: (fd.get("preferred_time") as string) || null,
        notes: (fd.get("notes") as string) || null,
        status: "pending",
      });
      if (error) setError("Erro ao enviar. Tenta novamente.");
      else { setSuccess(true); (e.target as HTMLFormElement).reset(); }
    } else {
      const { error } = await supabase.from("contact_requests").insert({
        ...common,
        vehicle_id: vehicle?.id || null,
        message: (fd.get("message") as string) || "",
      });
      if (error) setError("Erro ao enviar. Tenta novamente.");
      else { setSuccess(true); (e.target as HTMLFormElement).reset(); }
    }
    setLoading(false);
  }

  const heading = isTestDrive ? "Marcar Test Drive" : "Fala Connosco";
  const sub = isTestDrive
    ? "Escolhe a data e vem experimentar a viatura."
    : "Tem alguma questão? Envia-nos uma mensagem.";

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" style={{ backgroundColor: "#0a0a0a" }}>
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

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
          <div>
            <label className={labelCls}>Nome *</label>
            <input name="name" required style={inputStyle} />
          </div>
          <div>
            <label className={labelCls}>Email *</label>
            <input name="email" type="email" required style={inputStyle} />
          </div>
          <div>
            <label className={labelCls}>Telefone</label>
            <input name="phone" style={inputStyle} />
          </div>

          {isTestDrive && (
            <>
              <div>
                <label className={labelCls}>Data preferida *</label>
                <input name="preferred_date" type="date" min={today} required style={inputStyle} />
                <p className="mt-1 text-xs text-muted">Mínimo: hoje.</p>
              </div>
              <div>
                <label className={labelCls}>Hora preferida</label>
                <input name="preferred_time" type="time" style={inputStyle} />
              </div>
              <div>
                <label className={labelCls}>Notas / dúvidas</label>
                <textarea name="notes" rows={3} style={{ ...inputStyle, resize: "vertical" as const }} />
              </div>
            </>
          )}

          {!isTestDrive && (
            <div>
              <label className={labelCls}>Mensagem *</label>
              <textarea name="message" required rows={5} style={{ ...inputStyle, resize: "vertical" as const }} />
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