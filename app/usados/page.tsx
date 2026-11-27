import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { isVehiclePubliclyVisible } from "@/lib/vehicle-visibility";
import { expireReservations } from "@/lib/expire-reservations";
import { archiveSoldVehicles } from "@/lib/archive-sold-vehicles";
import { CatalogBrowser } from "@/components/ui/catalog-browser";

export const metadata = {
  title: "Usados | Chikane Garage",
  description: "Descobre a seleção atual de viaturas usadas de performance selecionadas da Chikane Garage.",
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

export default async function UsadosPage() {
  let vehicles: Vehicle[] = [];
  try {
    // Reservas vencidas (máx. 7 dias) voltam a "available" e as vendas com
    // mais de 7 dias são arquivadas antes da leitura.
    await Promise.all([expireReservations(), archiveSoldVehicles()]);
    const supabase = await createClient();
    // O catálogo mostra apenas disponíveis, reservadas e vendidas (nunca
    // arquivadas). As viaturas novas ficam só em /novos.
    const { data } = await supabase
      .from("vehicles")
      .select("*, vehicle_images(url, position, alt_text)")
      .in("status", ["available", "reserved", "sold"])
      .order("created_at", { ascending: false });
    vehicles = ((data || []) as Vehicle[]).filter((v) => isVehiclePubliclyVisible(v) && v.sale_type !== "new");
  } catch { vehicles = []; }

  return <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:px-12">
    <header className="max-w-3xl">
      <p className="font-display text-[10px] uppercase tracking-[0.28em] text-copper">Inventário <span className="px-1 text-white/30">·</span> Atualizado semanalmente</p>
      <h1 className="mt-3 font-display text-5xl font-bold uppercase leading-none tracking-tight text-white sm:text-7xl">Usados</h1>
      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">Consulta as características registadas para cada viatura e contacta-nos para confirmar disponibilidade e condições de venda.</p>
    </header>
    <Suspense fallback={null}>
      <CatalogBrowser vehicles={vehicles}/>
    </Suspense>
  </div>;
}
