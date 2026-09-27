import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FavoriteButton } from "@/components/ui/favorite-button";
import { VehicleDetailGallery } from "@/components/ui/vehicle-detail-gallery";
import { isVehiclePubliclyVisible } from "@/lib/vehicle-visibility";

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
    status?: string | null;
    sold_at?: string | null;
    updated_at?: string | null;
    created_at?: string | null;
  } | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("vehicles")
      .select("brand, model, trim, registration_year, price, cover_image_url, status, sold_at, updated_at, created_at")
      .eq("slug", slug)
      .maybeSingle();
    if (data && isVehiclePubliclyVisible(data)) vehicle = data;
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
  sold_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
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

  if (!vehicle || !isVehiclePubliclyVisible(vehicle)) notFound();

  const gallery = ((vehicle.vehicle_images || []) as VehicleImage[])
    .filter((img) => img.url)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((img) => ({ url: img.url as string, alt: img.alt_text || "" }));
  const photos = [
    ...(vehicle.cover_image_url ? [{ url: vehicle.cover_image_url, alt: `${vehicle.brand} ${vehicle.model}` }] : []),
    ...gallery,
  ].filter((photo, index, all) => all.findIndex((candidate) => candidate.url === photo.url) === index);

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
    <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
      <Link href="/catalogo" className="font-display text-[11px] uppercase tracking-[0.2em] text-silver transition-colors hover:text-copper">← Voltar ao catálogo</Link>

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1.35fr_1fr] xl:gap-12">
        <div className="min-w-0">
          <div className="relative">
            <VehicleDetailGallery photos={photos} title={`${vehicle.brand ?? ""} ${vehicle.model ?? ""}`} />
            <div className="absolute right-3 top-3 z-20"><FavoriteButton vehicleId={vehicle.id} /></div>
            {badge && <span className="absolute left-0 top-5 z-10 bg-copper px-4 py-2 font-display text-[10px] font-semibold uppercase tracking-[0.24em] text-black">{badge.label}</span>}
          </div>
        </div>

        <div className="min-w-0">
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.26em] text-copper">{vehicle.reference_code ? `Chikane selection · ${vehicle.reference_code}` : "Seleção Chikane · Histórico verificado"}</p>
          <h1 className="mt-3 font-display text-5xl font-bold uppercase leading-[0.98] tracking-tight text-foreground sm:text-6xl">{vehicle.brand} {vehicle.model}</h1>
          {vehicle.trim && <p className="mt-2 font-display text-sm uppercase tracking-[0.2em] text-silver">{vehicle.trim}</p>}
          <p className="mt-7 font-display text-4xl font-medium text-copper sm:text-5xl">{vehicle.price != null ? `${vehicle.price.toLocaleString("pt-PT")} €` : "Sob consulta"}</p>
          <p className="mt-1 text-xs text-muted">Preço final. Fala connosco para confirmar todos os detalhes.</p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href={`/contacto?vehicle=${vehicle.slug}`} className="flex-1 bg-copper px-6 py-4 text-center font-display text-xs font-semibold uppercase tracking-[0.24em] text-black transition-colors hover:bg-copper-light">Reservar viatura</Link>
            <Link href={`/contacto?testdrive=${vehicle.slug}`} className="flex-1 border border-copper px-6 py-4 text-center font-display text-xs font-semibold uppercase tracking-[0.24em] text-copper transition-colors hover:bg-copper hover:text-black">Marcar test-drive</Link>
          </div>

          <div className="mt-8 grid grid-cols-2 border-l border-t border-border bg-surface">
            {[...infoSpecs, ...techSpecs, ...originSpecs, ...(vehicle.warranty_months ? [{ label: "Garantia", value: `${vehicle.warranty_months} meses` }] : [])].map((spec) => (
              <div key={spec.label} className="min-h-[78px] border-b border-r border-border px-4 py-3.5 sm:px-5">
                <p className="font-display text-[9px] uppercase tracking-[0.22em] text-muted">{spec.label}</p>
                <p className="mt-1 font-display text-base text-foreground">{spec.value}</p>
              </div>
            ))}
          </div>

          {vehicle.description && <section className="mt-8 border-t border-border pt-6"><h2 className="font-display text-xs uppercase tracking-[0.24em] text-copper">Estado e histórico</h2><p className="mt-3 text-sm leading-7 text-silver">{vehicle.description}</p></section>}

          {features.length > 0 && <section className="mt-7 border-t border-border pt-6"><h2 className="font-display text-xs uppercase tracking-[0.24em] text-copper">Equipamento & extras</h2><div className="mt-3 flex flex-wrap gap-2">{features.map((f) => <span key={f.id} className="border border-border px-3 py-2 text-xs text-silver">{f.label}</span>)}</div></section>}

          <p className="mt-7 border-l-2 border-copper bg-surface px-4 py-3 text-xs leading-5 text-muted">Inspecionada e documentada. Contacta a equipa Chikane para conhecer o processo de reserva e entrega.</p>
        </div>
      </div>

      {(vehicle.financing_available || vehicle.trade_in_accepted || vehicle.accident_history) && <section className="mt-8 grid gap-3 border-t border-border pt-6 sm:grid-cols-2 lg:grid-cols-3">{vehicle.financing_available ? <p className="text-sm text-silver">Financiamento disponível</p> : null}{vehicle.trade_in_accepted ? <p className="text-sm text-silver">Retoma aceite</p> : null}{vehicle.accident_history ? <p className="text-sm text-silver">Histórico de acidente declarado</p> : null}</section>}
    </div>
  );
}
