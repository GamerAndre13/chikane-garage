import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FavoriteButton } from "@/components/ui/favorite-button";

// Para cada viatura (página dinâmica), gerar metadata próprio → melhor SEO
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  let vehicle: {
    brand?: string | null;
    model?: string | null;
    trim?: string | null;
    registration_year?: number | null;
    price?: number | null;
    cover_image_url?: string | null;
  } | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("vehicles")
      .select("brand, model, trim, registration_year, price, cover_image_url")
      .eq("slug", slug)
      .maybeSingle();
    if (data) vehicle = data;
  } catch {
    vehicle = null;
  }

  const name = vehicle ? [vehicle.brand, vehicle.model, vehicle.trim].filter(Boolean).join(" ") : "Viatura";
  const year = vehicle?.registration_year ? String(vehicle.registration_year) : "";
  const price = vehicle?.price != null ? `${vehicle.price.toLocaleString("pt-PT")} €` : "";

  return {
    title: vehicle ? `${name} ${year} | Chikane Garage` : "Viatura | Chikane Garage",
    description: vehicle
      ? `${name} ${year} — ${price} | Inspecionada, documentada e entregue com garantia Chikane.`
      : "Detalhes da viatura Chikane Garage.",
    openGraph: vehicle?.cover_image_url ? { images: [{ url: vehicle.cover_image_url }] } : undefined,
  };
}

type VehicleImage = {
  id: string;
  url?: string | null;
  position?: number | null;
  alt_text?: string | null;
};

type VehicleFeature = {
  id: string;
  label?: string | null;
};

type Vehicle = {
  id: string;
  slug: string;
  brand?: string | null;
  model?: string | null;
  trim?: string | null;
  registration_year?: number | null;
  registration_month?: number | null;
  status?: string | null;
  engine?: string | null;
  power_hp?: number | null;
  torque_nm?: number | null;
  transmission?: string | null;
  drivetrain?: string | null;
  fuel_type?: string | null;
  combined_consumption?: number | null;
  co2_emissions?: number | null;
  exterior_color?: string | null;
  interior_color?: string | null;
  mileage_km?: number | null;
  previous_owners?: number | null;
  service_book?: string | null;
  accident_history?: boolean | null;
  origin?: string | null;
  origin_country?: string | null;
  price?: number | null;
  financing_available?: boolean | null;
  warranty_months?: number | null;
  trade_in_accepted?: boolean | null;
  reference_code?: string | null;
  cover_image_url?: string | null;
  video_url?: string | null;
  description?: string | null;
  is_featured?: boolean | null;
  coc_confirmed?: boolean | null;
  isv_paid?: boolean | null;
  vehicle_images?: VehicleImage[] | null;
  vehicle_features?: VehicleFeature[] | null;
};

function statusBadge(status?: string | null): { label: string; color: string } | null {
  switch (status) {
    case "available": return { label: "Disponível", color: "#22c55e" };
    case "reserved": return { label: "Reservada", color: "#f59e0b" };
    case "sold": return { label: "Vendida", color: "#9a9a94" };
    default: return null;
  }
}

function serviceBookLabel(sb?: string | null): string {
  switch (sb) {
    case "full_dealer": return "Caderneta completa (Concessionário)";
    case "full": return "Caderneta completa";
    case "partial": return "Parcial";
    case "none": return "Sem caderneta";
    default: return "—";
  }
}

export default async function VehiclePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let vehicle: Vehicle | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("vehicles")
      .select("*, vehicle_images(*), vehicle_features(*)")
      .eq("slug", slug)
      .single();
    vehicle = (data || null) as Vehicle | null;
  } catch { vehicle = null; }

  if (!vehicle) notFound();

  const heroImage = vehicle.cover_image_url || null;
  const gallery = ((vehicle.vehicle_images || []) as VehicleImage[])
    .filter((img) => img.url)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((img) => ({ url: img.url as string, alt: img.alt_text || "" }));

  const features = (vehicle.vehicle_features || []) as VehicleFeature[];
  const badge = statusBadge(vehicle.status);

  // Specs técnicas
  const techSpecs: { label: string; value: string }[] = [];
  if (vehicle.engine) techSpecs.push({ label: "Motor", value: vehicle.engine });
  if (vehicle.power_hp != null) techSpecs.push({ label: "Potência", value: `${vehicle.power_hp} cv` });
  if (vehicle.torque_nm != null) techSpecs.push({ label: "Binário", value: `${vehicle.torque_nm} Nm` });
  if (vehicle.transmission) techSpecs.push({ label: "Caixa", value: vehicle.transmission === "automatic" ? "Automática" : "Manual" });
  if (vehicle.drivetrain) techSpecs.push({ label: "Tração", value: vehicle.drivetrain.toUpperCase() });
  if (vehicle.fuel_type) techSpecs.push({ label: "Combustível", value: vehicle.fuel_type });
  if (vehicle.combined_consumption != null) techSpecs.push({ label: "Consumo", value: `${vehicle.combined_consumption} l/100km` });
  if (vehicle.co2_emissions != null) techSpecs.push({ label: "CO₂", value: `${vehicle.co2_emissions} g/km` });

  // Info veículo
  const infoSpecs: { label: string; value: string }[] = [];
  if (vehicle.registration_year) infoSpecs.push({ label: "Ano", value: String(vehicle.registration_year) });
  if (vehicle.registration_month) infoSpecs.push({ label: "Mês Registo", value: String(vehicle.registration_month) });
  if (vehicle.mileage_km != null) infoSpecs.push({ label: "Quilometragem", value: `${vehicle.mileage_km.toLocaleString("pt-PT")} km` });
  if (vehicle.exterior_color) infoSpecs.push({ label: "Cor Exterior", value: vehicle.exterior_color });
  if (vehicle.interior_color) infoSpecs.push({ label: "Cor Interior", value: vehicle.interior_color });
  if (vehicle.previous_owners != null) infoSpecs.push({ label: "Donos Anteriores", value: String(vehicle.previous_owners) });
  if (vehicle.service_book) infoSpecs.push({ label: "Caderneta", value: serviceBookLabel(vehicle.service_book) });

  // Origem e legalização
  const originSpecs: { label: string; value: string }[] = [];
  if (vehicle.origin) originSpecs.push({ label: "Origem", value: vehicle.origin === "imported" ? "Importação" : "Nacional" });
  if (vehicle.origin_country) originSpecs.push({ label: "País Origem", value: vehicle.origin_country });
  if (vehicle.coc_confirmed) originSpecs.push({ label: "COC", value: "Confirmado ✓" });
  if (vehicle.isv_paid) originSpecs.push({ label: "ISV", value: "Pago ✓" });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8" style={{ backgroundColor: "#0a0a0a" }}>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted">
        <Link href="/catalogo" className="text-muted hover:text-copper transition-colors">Catálogo</Link>
        <span>/</span>
        <span className="text-copper">{vehicle.brand} {vehicle.model}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Left: images */}
        <div>
          <div className="relative aspect-[4/3] overflow-hidden rounded border border-border" style={{ backgroundColor: "#141414" }}>
            {heroImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroImage} alt={`${vehicle.brand} ${vehicle.model}`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center">
                <span className="text-6xl">🚗</span>
                <span className="mt-3 font-display text-xs uppercase tracking-[0.3em] text-copper">Chikane Garage</span>
              </div>
            )}
            <FavoriteButton vehicleId={vehicle.id} />
            {badge && (
              <span className="absolute bottom-4 left-4 z-10 rounded-full px-4 py-1.5 font-display text-xs font-semibold uppercase tracking-widest" style={{ backgroundColor: "rgba(10,10,10,0.85)", color: badge.color, border: `1px solid ${badge.color}` }}>
                {badge.label}
              </span>
            )}
          </div>

          {/* Thumbnails */}
          {gallery.length > 0 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {gallery.map((img, i) => (
                <div key={i} className="aspect-square overflow-hidden rounded border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.alt} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: details */}
        <div>
          <p className="font-display text-xs uppercase tracking-[0.3em] text-copper">
            {vehicle.trim ? vehicle.trim : "Viatura"} {vehicle.reference_code && `· ${vehicle.reference_code}`}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold uppercase tracking-wide text-foreground sm:text-5xl">
            {vehicle.brand} {vehicle.model}
          </h1>

          <div className="mt-5 flex items-end justify-between">
            <span className="font-display text-3xl font-bold text-foreground">
              {vehicle.price != null ? `${vehicle.price.toLocaleString("pt-PT")} €` : "Sob consulta"}
            </span>
          </div>

          {/* Specs Técnicos */}
          {techSpecs.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-xs font-semibold uppercase tracking-widest text-muted">Especificações Técnicas</h2>
              <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded border border-border">
                {techSpecs.map((spec) => (
                  <div key={spec.label} className="p-4" style={{ backgroundColor: "#141414" }}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">{spec.label}</p>
                    <p className="mt-1 font-display text-lg text-foreground">{spec.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info Veículo */}
          {infoSpecs.length > 0 && (
            <div className="mt-6">
              <h2 className="font-display text-xs font-semibold uppercase tracking-widest text-muted">Informação do Veículo</h2>
              <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded border border-border">
                {infoSpecs.map((spec) => (
                  <div key={spec.label} className="p-4" style={{ backgroundColor: "#141414" }}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">{spec.label}</p>
                    <p className="mt-1 font-display text-lg text-foreground">{spec.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Origem */}
          {originSpecs.length > 0 && (
            <div className="mt-6">
              <h2 className="font-display text-xs font-semibold uppercase tracking-widest text-muted">Origem & Legalização</h2>
              <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded border border-border">
                {originSpecs.map((spec) => (
                  <div key={spec.label} className="p-4" style={{ backgroundColor: "#141414" }}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">{spec.label}</p>
                    <p className="mt-1 font-display text-lg text-foreground">{spec.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extras */}
          {features.length > 0 && (
            <div className="mt-6">
              <h2 className="font-display text-xs font-semibold uppercase tracking-widest text-muted">Equipamento & Extras</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {features.map((f) => (
                  <span key={f.id} className="rounded border border-border px-3 py-1.5 text-xs font-medium text-silver" style={{ backgroundColor: "#141414" }}>
                    {f.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Condições Comerciais */}
          <div className="mt-6 rounded border border-border p-4" style={{ backgroundColor: "#141414" }}>
            <h2 className="font-display text-xs font-semibold uppercase tracking-widest text-muted mb-3">Condições Comerciais</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {vehicle.warranty_months != null && vehicle.warranty_months > 0 && (
                <div><span className="text-muted">Garantia:</span> <span className="text-foreground">{vehicle.warranty_months} meses</span></div>
              )}
              {vehicle.financing_available && (
                <div><span className="text-muted">Financiamento:</span> <span className="text-green-400">Disponível ✓</span></div>
              )}
              {vehicle.trade_in_accepted && (
                <div><span className="text-muted">Troca:</span> <span className="text-green-400">Aceite ✓</span></div>
              )}
              {vehicle.accident_history && (
                <div><span className="text-muted">Acidentes:</span> <span className="text-red-400">Sim ⚠</span></div>
              )}
            </div>
          </div>

          {/* Descrição */}
          {vehicle.description && (
            <div className="mt-6">
              <h2 className="font-display text-xs font-semibold uppercase tracking-widest text-muted">Descrição</h2>
              <p className="mt-3 text-sm leading-relaxed text-silver">{vehicle.description}</p>
            </div>
          )}

          {/* CTA */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={`/contacto?vehicle=${vehicle.slug}`} className="flex-1 bg-copper px-6 py-4 text-center font-display text-sm font-semibold uppercase tracking-widest text-white transition-colors hover:bg-copper-light">
              Contactar
            </Link>
            <Link href={`/contacto?testdrive=${vehicle.slug}`} className="flex-1 border border-copper px-6 py-4 text-center font-display text-sm font-semibold uppercase tracking-widest text-copper transition-colors hover:bg-copper hover:text-white">
              Marcar Test Drive
            </Link>
          </div>

          <div className="mt-6 rounded border border-border p-5 text-sm text-muted" style={{ backgroundColor: "#141414" }}>
            Garantia Chikane incluída em todas as viaturas. Inspeção pormenorizada e histórico documentado.
          </div>
        </div>
      </div>
    </div>
  );
}
