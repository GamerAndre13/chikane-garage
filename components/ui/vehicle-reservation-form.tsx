"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { validarTelemovelPT } from "@/lib/validacao";

type Props = {
  vehicleId: string;
  vehicle: string;
  available: boolean;
  reserved: boolean;
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

export function VehicleReservationForm({ vehicleId, vehicle, available, reserved }: Props) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!available) {
    return (
      <div className="rounded border border-white/10 bg-surface px-5 py-6">
        <p className="font-display text-xs uppercase tracking-[0.22em] text-copper">Reserva</p>
        <p className="mt-2 text-sm leading-6 text-white/70">
          {reserved
            ? "Esta viatura está reservada no momento. Volta dentro de alguns dias para verificar se ficou disponível."
            : "Esta viatura não está disponível para reserva neste momento."}
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim().toLowerCase();
    const phone = String(fd.get("phone") || "").trim();
    const message = String(fd.get("message") || "").trim();
    const extension = fd.get("extension") === "on";

    if (name.length < 2 || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Confirma o nome e introduz um email válido.");
      setLoading(false);
      return;
    }
    if (!validarTelemovelPT(phone)) {
      setError("Indica um telemóvel português válido (9 dígitos, começa por 9).");
      setLoading(false);
      return;
    }
    if (message.length < 5 || message.length > 2000) {
      setError("Explica o motivo da reserva (entre 5 e 2000 caracteres).");
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const res = await supabase
        .from("reservations")
        .insert({
          vehicle_id: vehicleId,
          user_id: user?.id ?? null,
          name,
          email,
          phone,
          message,
          extension_requested: extension,
          status: "pending",
        })
        .select("id");

      if (!res.data || res.data.length === 0) {
        setError("Não foi possível enviar o pedido de reserva. Tenta novamente em instantes.");
      } else {
        setSent(true);
        (e.target as HTMLFormElement).reset();
      }
    } catch (err) {
      console.error("Erro ao criar reserva:", err);
      setError("Ocorreu um erro ao enviar o pedido de reserva. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded border border-copper/40 bg-copper/5 px-5 py-6">
        <p className="font-display text-xs uppercase tracking-[0.22em] text-copper">Pedido enviado</p>
        <p className="mt-2 text-sm leading-6 text-white/80">
          Recebemos o teu pedido de reserva da <strong className="text-white">{vehicle}</strong>. Vamos analisá-lo e
          responder-te por email.
        </p>
        <p className="mt-3 border-l-2 border-copper pl-3 text-xs leading-5 text-white/60">
          Se o pedido de reserva for aceite, a viatura fica <strong className="text-copper">reservada por 7 dias</strong>.
          Pedidos de extensão ficam sujeitos a uma pequena entrada.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4 rounded border border-white/10 bg-surface px-5 py-6">
      <p className="border-l-2 border-copper bg-background-alt px-4 py-3 text-xs leading-5 text-white/65">
        Se o teu pedido de reserva for aceite, a viatura fica <strong className="text-copper">reservada por 7 dias</strong>.
        Pedidos de extensão ficam sujeitos a uma pequena entrada.
      </p>

      {error && <div role="alert" className="border-l-4 border-red-500 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>}

      <div>
        <label className={labelCls}>Nome *</label>
        <input name="name" autoComplete="name" minLength={2} maxLength={120} required style={inputStyle} />
      </div>
      <div>
        <label className={labelCls}>Email *</label>
        <input name="email" type="email" autoComplete="email" maxLength={254} required style={inputStyle} />
      </div>
      <div>
        <label className={labelCls}>Telemóvel *</label>
        <input name="phone" type="tel" autoComplete="tel" maxLength={30} required style={inputStyle} />
      </div>
      <div>
        <label className={labelCls}>Motivo da reserva *</label>
        <textarea name="message" rows={4} minLength={5} maxLength={2000} required style={{ ...inputStyle, resize: "vertical" as const }} />
      </div>
      <label className="flex cursor-pointer items-start gap-3 text-sm text-white/70">
        <input name="extension" type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--copper)]" />
        <span>
          Quero reservar por mais de 7 dias (extensão). <span className="text-white/45">— sujeito a uma pequena entrada</span>
        </span>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="bg-copper px-6 py-3 font-display text-sm font-semibold uppercase tracking-widest text-black transition-colors hover:bg-copper-light disabled:opacity-50"
      >
        {loading ? "A enviar…" : "Enviar pedido de reserva"}
      </button>
    </form>
  );
}