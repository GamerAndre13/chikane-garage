import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { isVehiclePubliclyVisible } from "@/lib/vehicle-visibility";
import { expireReservations } from "@/lib/expire-reservations";
import { archiveSoldVehicles } from "@/lib/archive-sold-vehicles";
import { CatalogBrowser } from "@/components/ui/catalog-browser";

export const metadata = {
  title: "Viaturas Novas",
  description:
    "Viaturas novas por encomenda, configuradas ao detalhe. Escolhe os extras e gera a tua proposta na Chikane Garage.",
};

type Vehicle = {
  id: string; slug: string; brand?: string | null; model?: string | null; trim?: string | null;
  registration_year?: number | null; mileage_km?: number | null; power_hp?: number | null;
  fuel_type?: string | null; transmission?: string | null; exterior_color?: string | null;
  body_style?: string | null;
  price?: number | null; status?: string | null; sold_at?: string | null; updated_at?: string | null;
  created_at?: string | null; cover_image_url?: string | null;
  sale_type?: string | null;
  vehicle_images?: { url?: string | null; position?: number | null; alt_text?: string | null }[] | null;
};

// Listagem pública das viaturas novas (por encomenda). Reutiliza o
// CatalogBrowser do catálogo, mas filtra por sale_type = 'new'.
export default async function NovosPage() {
  let vehicles: Vehicle[] = [];
  try {
    await expireReservations();
    await archiveSoldVehicles();
    const supabase = await createClient();
    const { data } = await supabase
      .from("vehicles")
      .select("*, vehicle_images(url, position, alt_text)")
      .eq("sale_type", "new")
      .in("status", ["available", "reserved", "sold"])
      .order("created_at", { ascending: false });
    vehicles = ((data || []) as Vehicle[]).filter(isVehiclePubliclyVisible);
  } catch { vehicles = []; }

  return <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:px-12">
    <header className="max-w-3xl">
      <p className="font-display text-[10px] uppercase tracking-[0.28em] text-copper">Por encomenda <span className="px-1 text-white/30">·</span> Configuração à medida</p>
      <h1 className="mt-3 font-display text-5xl font-bold uppercase leading-none tracking-tight text-white sm:text-7xl">Novos</h1>
      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">Viaturas novas configuradas ao teu gosto. Na ficha de cada modelo podes escolher os extras e gerar uma proposta com todos os valores detalhados.</p>
    </header>

    {/* Tal como em /usados, os filtros estão sempre presentes — mesmo quando
        ainda não há viaturas novas publicadas. */}
    <Suspense fallback={null}>
      <CatalogBrowser vehicles={vehicles} />
    </Suspense>
  </div>;
}
