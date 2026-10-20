import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isVehiclePubliclyVisible } from "@/lib/vehicle-visibility";
import { expireReservations } from "@/lib/expire-reservations";
import { archiveSoldVehicles } from "@/lib/archive-sold-vehicles";
import { CatalogBrowser } from "@/components/ui/catalog-browser";

type Vehicle = {
  id: string; slug: string; brand?: string | null; model?: string | null; trim?: string | null;
  registration_year?: number | null; mileage_km?: number | null; power_hp?: number | null;
  fuel_type?: string | null; transmission?: string | null; exterior_color?: string | null;
  body_style?: string | null; price?: number | null; status?: string | null; sold_at?: string | null;
  updated_at?: string | null; created_at?: string | null; cover_image_url?: string | null;
  vehicle_images?: { url?: string | null; position?: number | null; alt_text?: string | null }[] | null;
};

export async function VehicleConditionCatalog({ condition, title, intro }: { condition: "new" | "used"; title: string; intro: string }) {
  let vehicles: Vehicle[] = [];
  try {
    await Promise.all([expireReservations(), archiveSoldVehicles()]);
    const supabase = await createClient();
    const { data } = await supabase.from("vehicles").select("*, vehicle_images(url, position, alt_text)").eq("condition", condition).in("status", ["available", "reserved", "sold"]).order("created_at", { ascending: false });
    vehicles = ((data || []) as Vehicle[]).filter(isVehiclePubliclyVisible);
  } catch { vehicles = []; }
  return <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:px-12">
    <header className="max-w-3xl">
      <p className="font-display text-[10px] uppercase tracking-[0.28em] text-copper">Inventário Chikane</p>
      <h1 className="mt-3 font-display text-5xl font-bold uppercase leading-none tracking-tight text-white sm:text-7xl">{title}</h1>
      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">{intro}</p>
    </header>
    {vehicles.length === 0 ? (
      /* Estado vazio: a secção não fica em branco — explica o que fazer. */
      <div className="mt-14 max-w-2xl border border-border bg-surface-deep p-8 sm:p-10">
        <h2 className="font-display text-2xl font-bold uppercase text-white">Ainda não há nada nesta secção</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          {condition === "new"
            ? "As viaturas novas entram por encomenda: configuração, prazo e condições confirmamos caso a caso. Fala connosco."
            : "O inventário de usados muda todas as semanas. Enquanto não surge nada aqui, vê também as viaturas novas."}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={condition === "new" ? "/usados" : "/novos"} className="border border-border px-5 py-3 font-display text-xs uppercase tracking-widest text-silver transition-colors hover:border-copper hover:text-copper">
            Ver {condition === "new" ? "usados" : "novos"}
          </Link>
          <Link href="/catalogo" className="border border-border px-5 py-3 font-display text-xs uppercase tracking-widest text-silver transition-colors hover:border-copper hover:text-copper">
            Ver todo o catálogo
          </Link>
          <Link href="/contacto" className="bg-copper px-5 py-3 font-display text-xs uppercase tracking-widest text-black transition-colors hover:bg-copper-light">
            Fala connosco
          </Link>
        </div>
      </div>
    ) : (
      <Suspense fallback={null}><CatalogBrowser vehicles={vehicles}/></Suspense>
    )}
  </div>;
}
