"use client";

import Link from "next/link";
import { useShopCart } from "@/components/shop/cart-provider";

type Props = {
  vehicle: {
    id: string;
    slug: string;
    brand?: string | null;
    model?: string | null;
    trim?: string | null;
    price?: number | null;
    cover_image_url?: string | null;
  };
};

// Botão "Adicionar ao carrinho" para viaturas novas (ficha /catalogo/[slug]).
// Quando a viatura já está no carrinho, transforma-se em ligação ao carrinho.
export function AddVehicleToCartButton({ vehicle }: Props) {
  const { addVehicle, lines, hydrated } = useShopCart();
  const inCart = hydrated && lines.some((line) => line.type === "vehicle" && line.vehicleId === vehicle.id);
  const price = vehicle.price;
  if (price == null) return null;

  if (inCart) {
    return (
      <Link
        href="/carrinho"
        className="flex items-center justify-center border border-copper/60 px-6 py-4 text-center font-display text-xs font-semibold uppercase tracking-[0.24em] text-copper transition-colors hover:bg-copper hover:text-black"
      >
        ✓ No carrinho — ver
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() =>
        addVehicle({
          id: vehicle.id,
          slug: vehicle.slug,
          name: `${vehicle.brand ?? ""} ${vehicle.model ?? ""}`.trim() + (vehicle.trim ? ` ${vehicle.trim}` : ""),
          image: vehicle.cover_image_url ?? "",
          price,
        })
      }
      className="flex items-center justify-center border border-copper/60 px-6 py-4 text-center font-display text-xs font-semibold uppercase tracking-[0.24em] text-copper transition-colors hover:bg-copper hover:text-black"
    >
      Adicionar ao carrinho
    </button>
  );
}
