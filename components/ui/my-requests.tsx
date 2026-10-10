"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type VehicleRef = { brand: string; model: string; slug: string };

type RequestRow = {
  id: string;
  message?: string | null;
  created_at?: string | null;
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

// Supabase devolve relação 1:1 como array; normalizar
const pick = (v: unknown) => (Array.isArray(v) ? (v[0] ?? null) : v);

const DRIVE_STATUS: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const statusColor = (s: string) =>
  s === "pending" || s === "new"
    ? "#f59e0b"
    : s === "read"
      ? "#3b82f6"
      : s === "confirmed" || s === "completed"
        ? "#22c55e"
        : "#9a9a94";

const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

function VehicleLink({ v }: { v?: VehicleRef | null }) {
  if (!v?.slug) return <span className="text-muted">Viatura</span>;
  return (
    <Link href={`/catalogo/${v.slug}`} className="text-foreground transition-colors hover:text-copper">
      {v.brand} {v.model}
    </Link>
  );
}

export function MyRequests() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [drives, setDrives] = useState<DriveRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const [r, d] = await Promise.all([
          supabase
            .from("contact_requests")
            .select("id, message, created_at, vehicle_id, vehicles(brand, model, slug)")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("test_drives")
            .select("id, preferred_date, preferred_time, status, created_at, vehicle_id, vehicles(brand, model, slug)")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(10),
        ]);
        setRequests((r.data || []).map((x) => ({ ...x, vehicles: pick(x.vehicles) })));
        setDrives((d.data || []).map((x) => ({ ...x, vehicles: pick(x.vehicles) })));
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-sm text-muted">A carregar…</p>;

  const hasNothing = requests.length === 0 && drives.length === 0;

  if (hasNothing) {
    return (
      <div className="space-y-3 text-sm text-muted">
        <p>Ainda não enviaste pedidos de informação nem marcaste test drives.</p>
        <p>
          <Link href="/catalogo" className="text-copper hover:text-copper-light transition-colors">
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
                {d.status && (
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider" style={{ backgroundColor: `${statusColor(d.status)}20`, color: statusColor(d.status) }}>
                    {DRIVE_STATUS[d.status] || d.status}
                  </span>
                )}
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
                  <p className="shrink-0 text-[11px] text-muted">{fmtDate(r.created_at)}</p>
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