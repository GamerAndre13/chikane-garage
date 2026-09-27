import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FavoriteButton } from "@/components/ui/favorite-button";
import { isVehiclePubliclyVisible } from "@/lib/vehicle-visibility";
import { VehicleCardGallery } from "@/components/ui/vehicle-card-gallery";

export const metadata = {
  title: "Catálogo | Chikane Garage",
  description: "Descobre a seleção atual de viaturas de performance BMW da Chikane Garage.",
};

type Vehicle = {
  id: string;
  slug: string;
  brand?: string | null;
  model?: string | null;
  trim?: string | null;
  registration_year?: number | null;
  mileage_km?: number | null;
  power_hp?: number | null;
  fuel_type?: string | null;
  transmission?: string | null;
  exterior_color?: string | null;
  price?: number | null;
  status?: string | null;
  sold_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  cover_image_url?: string | null;
  vehicle_images?: { url?: string | null; position?: number | null; alt_text?: string | null }[] | null;
  description?: string | null;
};

function statusLabel(status?: string | null): { label: string; color: string } {
  switch (status) {
    case "available": return { label: "Disponível", color: "#22c55e" };
    case "reserved": return { label: "Reservada", color: "#f59e0b" };
    case "sold": return { label: "Vendida", color: "#9a9a94" };
    default: return { label: "", color: "#9a9a94" };
  }
}

export default async function CatalogoPage() {
  let vehicles: Vehicle[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("vehicles").select("*, vehicle_images(url, position, alt_text)").order("created_at", { ascending: false });
    vehicles = ((data || []) as Vehicle[]).filter(isVehiclePubliclyVisible);
  } catch { vehicles = []; }

  return (
    <div className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-12">
      <div className="max-w-2xl">
        <p className="font-display text-[11px] uppercase tracking-[0.28em] text-copper">A nossa seleção</p>
        <h1 className="mt-3 font-display text-5xl font-bold uppercase tracking-tight text-foreground sm:text-6xl">Catálogo</h1>
        <p className="mt-4 text-base leading-relaxed text-muted">
          Cada viatura é inspecionada, fotografada e documentada antes de ser anunciada. O que vês é exatamente o que recebes.
        </p>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="font-display text-xs font-semibold uppercase tracking-widest text-muted">
          {vehicles.length} {vehicles.length === 1 ? "viatura" : "viaturas"} em stock
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {vehicles.length === 0 ? (
        <div className="mt-16 rounded border border-border p-16 text-center" style={{ backgroundColor: "#141414" }}>
          <p className="font-display text-2xl font-bold uppercase tracking-wide text-foreground">De momento não temos viaturas disponíveis</p>
          <p className="mt-2 text-sm text-muted">Volta em breve, ou fala connosco para a próxima chegada.</p>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => {
            const status = statusLabel(v.status);
            const photos = [...(v.cover_image_url ? [{ url: v.cover_image_url }] : []), ...((v.vehicle_images || []).filter((image) => image.url).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map((image) => ({ url: image.url!, alt: image.alt_text || "" })))].filter((photo, index, all) => all.findIndex((candidate) => candidate.url === photo.url) === index).slice(0, 4);
            return (
              <article key={v.id} className="group overflow-hidden border border-border bg-surface transition-colors hover:border-copper/60">
                <VehicleCardGallery photos={photos} href={`/catalogo/${v.slug}`} title={`${v.brand ?? ""} ${v.model ?? ""}`}>
                  <div className="absolute right-3 top-3 z-20"><FavoriteButton vehicleId={v.id} /></div>
                  {status.label && (
                    <span className="absolute bottom-3 left-3 z-10 rounded-full px-3 py-1 font-display text-[11px] font-semibold uppercase tracking-widest" style={{ backgroundColor: "rgba(10,10,10,0.85)", color: status.color, border: `1px solid ${status.color}` }}>
                      {status.label}
                    </span>
                  )}
                </VehicleCardGallery>
                <Link href={`/catalogo/${v.slug}`} className="block p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-copper">
                  <p className="text-xs text-muted">{v.brand} · {v.registration_year}</p>
                  <h2 className="mt-1 font-display text-lg font-bold uppercase tracking-wide text-foreground">{v.model}</h2>
                  {v.trim && <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-muted">{v.trim}</p>}
                  <div className="mt-4 space-y-1 border-t border-border pt-4">
                    {v.mileage_km != null && (
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <span className="font-semibold uppercase tracking-wide text-foreground">KM</span>
                        <span>{v.mileage_km.toLocaleString("pt-PT")} km</span>
                      </div>
                    )}
                    {v.power_hp != null && (
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <span className="font-semibold uppercase tracking-wide text-foreground">Potência</span>
                        <span>{v.power_hp} cv</span>
                      </div>
                    )}
                    {v.transmission && (
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <span className="font-semibold uppercase tracking-wide text-foreground">Caixa</span>
                        <span>{v.transmission === "automatic" ? "Automática" : "Manual"}</span>
                      </div>
                    )}
                    {v.exterior_color && (
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <span className="font-semibold uppercase tracking-wide text-foreground">Cor</span>
                        <span>{v.exterior_color}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                    <span className="font-display text-xl font-bold text-foreground">
                      {v.price != null ? `${v.price.toLocaleString("pt-PT")} €` : "Sob consulta"}
                    </span>
                    <span className="font-display text-xs font-semibold uppercase tracking-widest text-copper">Ver mais →</span>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
