import { createClient } from "@/lib/supabase/server";
import { isVehiclePubliclyVisible } from "@/lib/vehicle-visibility";
import { CatalogBrowser } from "@/components/ui/catalog-browser";

export const metadata = {
  title: "Catálogo | Chikane Garage",
  description: "Descobre a seleção atual de viaturas de performance BMW da Chikane Garage.",
};

type Vehicle = {
  id: string; slug: string; brand?: string | null; model?: string | null; trim?: string | null;
  registration_year?: number | null; mileage_km?: number | null; power_hp?: number | null;
  fuel_type?: string | null; transmission?: string | null; exterior_color?: string | null;
  price?: number | null; status?: string | null; sold_at?: string | null; updated_at?: string | null;
  created_at?: string | null; cover_image_url?: string | null;
  vehicle_images?: { url?: string | null; position?: number | null; alt_text?: string | null }[] | null;
};

export default async function CatalogoPage() {
  let vehicles: Vehicle[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("vehicles").select("*, vehicle_images(url, position, alt_text)").order("created_at", { ascending: false });
    vehicles = ((data || []) as Vehicle[]).filter(isVehiclePubliclyVisible);
  } catch { vehicles = []; }

  return <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:px-12">
    <header className="max-w-3xl">
      <p className="font-display text-[10px] uppercase tracking-[0.28em] text-copper">Inventário <span className="px-1 text-white/30">·</span> Atualizado semanalmente</p>
      <h1 className="mt-3 font-display text-5xl font-bold uppercase leading-none tracking-tight text-white sm:text-7xl">Catálogo</h1>
      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/55 sm:text-base">Cada unidade é comprada por nós na Alemanha, inspecionada em 140 pontos e entregue legalizada. Sem intermediários, sem surpresas.</p>
    </header>
    <CatalogBrowser vehicles={vehicles}/>
  </div>;
}
