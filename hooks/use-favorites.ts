"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

const STORAGE_KEY = "chikane_favorites";

function getLocalFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function setLocalFavorites(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Detectar user logado + carregar favoritos
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);
        // Carregar da base de dados
        const { data } = await supabase
          .from("favorites")
          .select("vehicle_id")
          .eq("user_id", user.id);
        const dbIds = (data || []).map((f) => f.vehicle_id);

        // Juntar com favoritos locais (localStorage)
        const localIds = getLocalFavorites();
        const merged = [...new Set([...localIds, ...dbIds])];

        // Sincronizar os locais para a BD
        const toSync = localIds.filter((id) => !dbIds.includes(id));
        if (toSync.length > 0) {
          await supabase.from("favorites").insert(
            toSync.map((vehicle_id) => ({ user_id: user.id, vehicle_id }))
          );
        }

        // Limpar localStorage depois de sincronizar
        if (localIds.length > 0) {
          setLocalFavorites([]);
        }

        setFavorites(merged);
      } else {
        // Sem login → usar localStorage
        setFavorites(getLocalFavorites());
      }
      setLoaded(true);
    }
    init();
  }, []);

  const toggle = useCallback(async (vehicleId: string) => {
    const isFav = favorites.includes(vehicleId);
    let next: string[];

    if (isFav) {
      next = favorites.filter((id) => id !== vehicleId);
    } else {
      next = [...favorites, vehicleId];
    }

    setFavorites(next);

    if (userId) {
      // User logado → guardar na BD
      if (isFav) {
        await supabase
          .from("favorites")
          .delete()
          .eq("user_id", userId)
          .eq("vehicle_id", vehicleId);
      } else {
        await supabase
          .from("favorites")
          .insert({ user_id: userId, vehicle_id: vehicleId });
      }
    } else {
      // Sem login → guardar no localStorage
      setLocalFavorites(next);
    }
  }, [favorites, userId]);

  const isFavorited = useCallback((vehicleId: string) => {
    return favorites.includes(vehicleId);
  }, [favorites]);

  return { favorites, toggle, isFavorited, loaded };
}
