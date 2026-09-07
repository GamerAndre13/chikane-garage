"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type FavoriteVehicle = {
  id: string;
  vehicle_id: string;
  created_at: string;
  vehicles?: {
    brand: string;
    model: string;
    trim: string;
    price: number;
    cover_image_url: string;
    slug: string;
  } | null;
};

export function FavoritesList() {
  const [favorites, setFavorites] = useState<FavoriteVehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  async function loadFavorites() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("favorites")
      .select("id, vehicle_id, created_at, vehicles(brand, model, trim, price, cover_image_url, slug)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // Supabase retorna vehicles como array, normalizar
    const normalized = (data || []).map((fav: any) => ({
      ...fav,
      vehicles: Array.isArray(fav.vehicles) ? fav.vehicles[0] ?? null : fav.vehicles,
    }));
    setFavorites(normalized);
    setLoading(false);
  }

  if (loading) {
    return <p className="text-sm text-muted">A carregar...</p>;
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
      {favorites.map((fav) => (
        <div key={fav.id} className="flex items-center gap-3 p-3 border border-border bg-background rounded">
          {fav.vehicles?.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fav.vehicles.cover_image_url} alt="" className="w-12 h-12 rounded object-cover" />
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
                <p className="text-xs text-copper">{fav.vehicles.price.toLocaleString("pt-PT")} €</p>
              </Link>
            ) : (
              <p className="text-sm text-muted">Viatura removida</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
