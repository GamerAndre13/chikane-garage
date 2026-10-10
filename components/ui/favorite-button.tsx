"use client";

import { useFavorites } from "@/hooks/use-favorites";

export function FavoriteButton({ vehicleId }: { vehicleId: string }) {
  const { isFavorited, toggle, loaded } = useFavorites();
  const active = isFavorited(vehicleId);

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(vehicleId); }}
      disabled={!loaded}
      aria-label={active ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      aria-pressed={active}
      className="absolute top-3 right-3 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border border-border transition-colors hover:border-copper"
      title={active ? "Remover dos favoritos" : "Adicionar aos favoritos"}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? "#b87333" : "none"} stroke={active ? "#b87333" : "currentColor"} strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
