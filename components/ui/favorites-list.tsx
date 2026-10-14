"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type FavoriteVehicle = {
  id: string;
  vehicle_id: string;
  created_at: string;
  vehicles?: {
    brand: string | null;
    model: string | null;
    trim: string | null;
    price: number | null;
    cover_image_url: string | null;
    slug: string;
    status: string | null;
  } | null;
};

// O Supabase devolve `vehicles` como array de um elemento (ou null) — normalizar
type RawFavorite = Omit<FavoriteVehicle, "vehicles"> & {
  vehicles?: FavoriteVehicle["vehicles"] | FavoriteVehicle["vehicles"][];
};

// Tag do estado da viatura — igual à do catálogo (só disponíveis, reservadas
// e vendidas; arquivadas não mostram tag).
function statusLabel(status?: string | null) {
  if (status === "reserved") return { label: "Reservada", color: "var(--warning)" };
  if (status === "sold") return { label: "Vendida", color: "var(--muted)" };
  if (status === "available") return { label: "Disponível", color: "var(--copper)" };
  return null;
}

export function FavoritesList() {
  const [favorites, setFavorites] = useState<FavoriteVehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Carga inicial — IIFE com flag de cancelamento (evita setState em efeito
  // e setState depois de desmontar o componente).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (!cancelled) setLoading(false); return; }

      const { data } = await supabase
        .from("favorites")
        .select("id, vehicle_id, created_at, vehicles(brand, model, trim, price, cover_image_url, slug, status)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (cancelled) return;

      const normalized = (data || []).map((fav: RawFavorite) => ({
        ...fav,
        vehicles: Array.isArray(fav.vehicles) ? fav.vehicles[0] ?? null : fav.vehicles,
      }));
      setFavorites(normalized);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <p className="text-sm text-muted">A carregar…</p>;
  }

  if (favorites.length === 0) {
    return (
      <p className="text-sm text-muted">
        Ainda não tens viaturas guardadas.{" "}
        <Link href="/catalogo" className="text-copper hover:text-copper-light transition-colors">
          Ver catálogo
        </Link>
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {favorites.map((fav) => {
        const status = statusLabel(fav.vehicles?.status);
        return (
          <div key={fav.id} className="flex items-center gap-3 p-3 border border-border bg-background rounded">
            {fav.vehicles?.cover_image_url ? (
              <Image src={fav.vehicles.cover_image_url} alt="" width={48} height={48} sizes="48px" className="w-12 h-12 rounded object-cover" />
            ) : (
              <div className="w-12 h-12 rounded bg-copper/20 flex items-center justify-center">
                <span className="text-copper text-xs font-display">🚗</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              {fav.vehicles ? (
                <Link href={`/catalogo/${fav.vehicles.slug}`} className="block">
                  <p className="text-sm font-medium text-foreground truncate">
                    {fav.vehicles.brand} {fav.vehicles.model} {fav.vehicles.trim}
                  </p>
                  <p className="text-xs tabular-nums text-copper">{fav.vehicles.price != null ? `${fav.vehicles.price.toLocaleString("pt-PT")} €` : "Sob consulta"}</p>
                </Link>
              ) : (
                <p className="text-sm text-muted">Viatura removida</p>
              )}
            </div>
            {status && (
              <span
                className="shrink-0 border border-current px-2.5 py-1 font-display text-[10px] uppercase tracking-[0.14em]"
                style={{ color: status.color }}
              >
                {status.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
