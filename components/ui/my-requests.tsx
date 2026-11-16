"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { vehicleHref } from "@/lib/vehicle-links";

type VehicleRef = { brand: string; model: string; slug: string; sale_type?: string | null };

type RequestRow = {
  id: string;
  message?: string | null;
  created_at?: string | null;
  status?: string | null;
  vehicles?: VehicleRef | null;
};
type DriveRow = {
  id: string;
  preferred_date?: string | null;
  preferred_time?: string | null;
  created_at?: string | null;
  status?: string | null;
  vehicles?: VehicleRef | null;
};
type ReservationRow = {
  id: string;
  created_at?: string | null;
  status?: string | null;
  extension_requested?: boolean | null;
  vehicles?: VehicleRef | null;
};

// Supabase devolve relação 1:1 como array; normalizar
const pick = (v: unknown) => (Array.isArray(v) ? (v[0] ?? null) : v);

const DRIVE_STATUS: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
  rejected: "Rejeitado",
};

const REQUEST_STATUS: Record<string, string> = {
  new: "Novo",
  read: "Lido",
  confirmed: "Respondido",
  replied: "Respondido",
  archived: "Arquivado",
};

const RESERVATION_STATUS: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  rejected: "Rejeitada",
  completed: "Concluída",
  cancelled: "Cancelada",
};

const statusColor = (s: string) =>
  s === "pending" || s === "new"
    ? "#f59e0b"
    : s === "read"
      ? "#3b82f6"
      : s === "confirmed" || s === "completed" || s === "approved" || s === "replied"
        ? "#22c55e"
        : "#9a9a94";

const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

function VehicleLink({ v }: { v?: VehicleRef | null }) {
  if (!v?.slug) return <span className="text-muted">Viatura</span>;
  return (
    <Link href={vehicleHref(v)} className="text-foreground transition-colors hover:text-copper">
      {v.brand} {v.model}
    </Link>
  );
}

function StatusBadge({ status, labels }: { status?: string | null; labels: Record<string, string> }) {
  if (!status) return null;
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider"
      style={{ backgroundColor: `${statusColor(status)}20`, color: statusColor(status) }}
    >
      {labels[status] || status}
    </span>
  );
}

export function MyRequests() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [drives, setDrives] = useState<DriveRow[]>([]);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // O pedido pode ter sido feito sem sessão iniciada (user_id nulo).
        // Nesse caso, aparece na mesma conta pelo email da sessão.
        const email = user.email?.toLowerCase();
        const filter = email ? `user_id.eq.${user.id},email.eq."${email}"` : `user_id.eq.${user.id}`;
        const [r, d, res] = await Promise.all([
          supabase
            .from("contact_requests")
            .select("id, message, status, created_at, vehicle_id, vehicles(brand, model, slug, sale_type)")
            .or(filter)
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("test_drives")
            .select("id, preferred_date, preferred_time, status, created_at, vehicle_id, vehicles(brand, model, slug, sale_type)")
            .or(filter)
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("reservations")
            .select("id, status, extension_requested, created_at, vehicle_id, vehicles(brand, model, slug, sale_type)")
            .or(filter)
            .order("created_at", { ascending: false })
            .limit(10),
        ]);
        setRequests((r.data || []).map((x) => ({ ...x, vehicles: pick(x.vehicles) })));
        setDrives((d.data || []).map((x) => ({ ...x, vehicles: pick(x.vehicles) })));
        setReservations((res.data || []).map((x) => ({ ...x, vehicles: pick(x.vehicles) })));
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-sm text-muted">A carregar…</p>;

  const hasNothing = requests.length === 0 && drives.length === 0 && reservations.length === 0;

  if (hasNothing) {
    return (
      <div className="space-y-3 text-sm text-muted">
        <p>Ainda não enviaste pedidos de informação, reservas nem marcaste test drives.</p>
        <p>
          <Link href="/usados" className="text-copper hover:text-copper-light transition-colors">
            Ver catálogo
          </Link>{" "}
          e fala connosco sobre uma viatura.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {drives.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-widest text-muted mb-2">Marcações de test-drive</h3>
          <div className="space-y-2">
            {drives.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 rounded border border-border bg-background p-3">
                <div className="min-w-0">
                  <VehicleLink v={d.vehicles} />
                  <p className="text-xs text-muted mt-0.5">
                    📅 {fmtDate(d.preferred_date)} {d.preferred_time ? `· ${d.preferred_time}` : ""}
                  </p>
                </div>
                <StatusBadge status={d.status} labels={DRIVE_STATUS} />
              </div>
            ))}
          </div>
        </div>
      )}

      {reservations.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-widest text-muted mb-2">Pedidos de reserva</h3>
          <div className="space-y-2">
            {reservations.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded border border-border bg-background p-3">
                <div className="min-w-0">
                  <VehicleLink v={r.vehicles} />
                  <p className="text-xs text-muted mt-0.5">
                    {fmtDate(r.created_at)}
                    {r.extension_requested ? " · pedido de extensão" : ""}
                  </p>
                </div>
                <StatusBadge status={r.status} labels={RESERVATION_STATUS} />
              </div>
            ))}
          </div>
        </div>
      )}

      {requests.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-widest text-muted mb-2">Pedidos de Informação</h3>
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="rounded border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-3">
                  <VehicleLink v={r.vehicles} />
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={r.status} labels={REQUEST_STATUS} />
                    <p className="text-[11px] text-muted">{fmtDate(r.created_at)}</p>
                  </div>
                </div>
                {r.message && <p className="mt-2 text-sm text-muted line-clamp-2">{r.message}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
