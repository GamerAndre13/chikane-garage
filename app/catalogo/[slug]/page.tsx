import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FavoriteButton } from "@/components/ui/favorite-button";
import { VehicleDetailGallery } from "@/components/ui/vehicle-detail-gallery";
import { isVehiclePubliclyVisible } from "@/lib/vehicle-visibility";
import { VehicleSpecifications } from "@/components/ui/vehicle-specifications";
import { VehicleCardGallery } from "@/components/ui/vehicle-card-gallery";
import { expireReservations } from "@/lib/expire-reservations";
import { archiveSoldVehicles } from "@/lib/archive-sold-vehicles";

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
      ? `${name} ${year}${price ? ` — ${price}` : ""}. Consulta as características e pede informações sobre esta viatura.`
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
  body_style?: string | null;
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
    case "available": return { label: "Disponível", color: "var(--success)" };
    case "reserved": return { label: "Reservada", color: "var(--warning)" };
    case "sold": return { label: "Vendida", color: "var(--muted)" };
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

// Para viaturas vendidas: data da venda e há quantos dias foi. O "now" é um
// parâmetro com omissão (como em isVehiclePubliclyVisible) para não chamar
// funções impuras dentro do componente.
function soldInfoFor(vehicle: { status?: string | null; sold_at?: string | null }, now = Date.now()) {
  if (vehicle.status !== "sold" || !vehicle.sold_at) return null;
  const soldAt = Date.parse(vehicle.sold_at);
  if (!Number.isFinite(soldAt)) return null;
  const days = Math.max(0, Math.floor((now - soldAt) / 86400000));
  const date = new Date(soldAt).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
  return { days, date };
}

// "Equipamento & extras" + "Condições". No desktop ficam por baixo das
// fotografias, com as condições debaixo do equipamento; no telemóvel mantêm-se
// na coluna da direita (para o preço e os botões virem logo a seguir às fotos).
function VehicleEquipmentAndConditions({ accidentHistory, features }: { accidentHistory?: boolean | null; features: VehicleFeature[] }) {
  return (
    <div className="grid gap-7">
      {features.length > 0 && (
        <section className="border-t border-border pt-6">
          <h2 className="font-display text-xs uppercase tracking-[0.24em] text-copper">Equipamento & extras</h2>
          <div className="mt-3 flex flex-wrap gap-2">{features.map((f) => <span key={f.id} className="border border-border px-3 py-2 text-xs text-silver">{f.label}</span>)}</div>
        </section>
      )}

      <section className="border-t border-border pt-6">
        <h2 className="font-display text-xs uppercase tracking-[0.24em] text-copper">Condições</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded border border-copper/30 bg-copper/5 p-4">
            <div className="flex items-center gap-2.5 text-copper">
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="2.5" y="6" width="19" height="13" rx="1.5"/><circle cx="12" cy="12.5" r="2.2"/><path d="M6.5 9.5h.01M17.5 15.5h.01"/></svg>
              <p className="font-display text-[10px] uppercase tracking-[0.18em]">Financiamento</p>
            </div>
            <p className="mt-2.5 text-sm leading-5 text-silver">Disponível — pede-nos uma simulação à tua medida.</p>
          </div>
          <div className="rounded border border-copper/30 bg-copper/5 p-4">
            <div className="flex items-center gap-2.5 text-copper">
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M7.5 4 3 8.5l4.5 4.5"/><path d="M3 8.5h18"/><path d="m16.5 20 4.5-4.5-4.5-4.5"/><path d="M21 15.5H3"/></svg>
              <p className="font-display text-[10px] uppercase tracking-[0.18em]">Retoma aceite</p>
            </div>
            <p className="mt-2.5 text-sm leading-5 text-silver">Aceitamos a tua viatura em troca desta.</p>
          </div>
        </div>
        {accidentHistory && (
          <p className="mt-3 border-l-2 border-amber-400/70 bg-amber-400/5 px-4 py-3 text-xs leading-5 text-silver">
            Histórico de acidente declarado — pede-nos mais detalhes sobre esta viatura.
          </p>
        )}
      </section>
    </div>
  );
}

export default async function VehiclePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let vehicle: Vehicle | null = null;
  try {
    // Reservas vencidas (máx. 7 dias) voltam a "available" e as vendas com
    // mais de 7 dias são arquivadas antes da leitura.
    await Promise.all([expireReservations(), archiveSoldVehicles()]);
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
  const soldInfo = soldInfoFor(vehicle);

  const primarySpecs: { label: string; value: string }[] = [
    { label: "Quilometragem", value: vehicle.mileage_km != null ? `${vehicle.mileage_km.toLocaleString("pt-PT")} km` : "—" },
    { label: "Ano", value: vehicle.registration_year ? String(vehicle.registration_year) : "—" },
    { label: "Potência", value: vehicle.power_hp != null ? `${vehicle.power_hp} cv` : "—" },
    { label: "Combustível", value: vehicle.fuel_type || "—" },
    { label: "Caixa", value: vehicle.transmission ? (vehicle.transmission === "automatic" ? "Automática" : "Manual") : "—" },
    { label: "Origem", value: vehicle.origin ? (vehicle.origin === "imported" ? "Importação" : "Nacional") : "—" },
    { label: "Donos Anteriores", value: vehicle.previous_owners != null ? String(vehicle.previous_owners) : "—" },
    { label: "Cor", value: vehicle.exterior_color || "—" },
  ];

  const additionalSpecs: { label: string; value: string }[] = [];
  if (vehicle.engine) additionalSpecs.push({ label: "Motor", value: vehicle.engine });
  if (vehicle.torque_nm != null) additionalSpecs.push({ label: "Binário", value: `${vehicle.torque_nm} Nm` });
  if (vehicle.drivetrain) additionalSpecs.push({ label: "Tração", value: vehicle.drivetrain.toUpperCase() });
  if (vehicle.body_style) additionalSpecs.push({ label: "Estilo", value: vehicle.body_style });
  if (vehicle.registration_month) additionalSpecs.push({ label: "Mês Registo", value: String(vehicle.registration_month) });
  if (vehicle.interior_color) additionalSpecs.push({ label: "Cor Interior", value: vehicle.interior_color });
  if (vehicle.service_book) additionalSpecs.push({ label: "Caderneta", value: serviceBookLabel(vehicle.service_book) });
  if (vehicle.origin_country) additionalSpecs.push({ label: "País Origem", value: vehicle.origin_country });
  if (vehicle.coc_confirmed) additionalSpecs.push({ label: "COC", value: "Confirmado ✓" });
  if (vehicle.isv_paid) additionalSpecs.push({ label: "ISV", value: "Pago ✓" });
  if (vehicle.combined_consumption != null) additionalSpecs.push({ label: "Consumo", value: `${vehicle.combined_consumption} l/100km` });
  if (vehicle.co2_emissions != null) additionalSpecs.push({ label: "CO₂", value: `${vehicle.co2_emissions} g/km` });
  if (vehicle.warranty_months) additionalSpecs.push({ label: "Garantia", value: `${vehicle.warranty_months} meses` });

  let similarVehicles: Vehicle[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("vehicles").select("id, slug, brand, model, trim, registration_year, mileage_km, power_hp, fuel_type, price, cover_image_url, status, sold_at, updated_at, created_at").in("status", ["available", "reserved"]).neq("id", vehicle.id).order("created_at", { ascending: false }).limit(30);
    const candidates = ((data || []) as Vehicle[]).filter(isVehiclePubliclyVisible);
    similarVehicles = candidates.sort((a, b) => {
      const score = (candidate: Vehicle) => (candidate.brand === vehicle.brand ? 100 : 0) - Math.abs((candidate.power_hp || 0) - (vehicle.power_hp || 0)) / 20 - Math.abs((candidate.registration_year || 0) - (vehicle.registration_year || 0)) * 2;
      return score(b) - score(a);
    }).slice(0, 4);
    if (similarVehicles.length) {
      const { data: images } = await supabase.from("vehicle_images").select("id, vehicle_id, url, position, alt_text").in("vehicle_id", similarVehicles.map((car) => car.id)).order("position");
      const imagesByVehicle = new Map<string, NonNullable<Vehicle["vehicle_images"]>>();
      for (const image of images || []) imagesByVehicle.set(image.vehicle_id, [...(imagesByVehicle.get(image.vehicle_id) || []), image]);
      similarVehicles = similarVehicles.map((car) => ({ ...car, vehicle_images: imagesByVehicle.get(car.id) || [] }));
    }
  } catch { similarVehicles = []; }

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

          <div className="mt-8 hidden lg:block">
            <VehicleEquipmentAndConditions accidentHistory={vehicle.accident_history} features={features} />
          </div>
        </div>

        <div className="min-w-0">
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.26em] text-copper">{vehicle.reference_code ? `Chikane selection · ${vehicle.reference_code}` : "Detalhes da viatura"}</p>
          <h1 className="mt-3 font-display text-5xl font-bold uppercase leading-[0.98] tracking-tight text-foreground sm:text-6xl">{vehicle.brand} {vehicle.model}</h1>
          {vehicle.trim && <p className="mt-2 font-display text-sm uppercase tracking-[0.2em] text-silver">{vehicle.trim}</p>}
          <p className="mt-7 font-display text-4xl font-medium text-copper sm:text-5xl">{vehicle.price != null ? `${vehicle.price.toLocaleString("pt-PT")} €` : "Sob consulta"}</p>
          <p className="mt-1 text-xs text-muted">Preço final. Fala connosco para confirmar todos os detalhes.</p>

          {soldInfo && (
            <p className="mt-3 border-l-2 border-muted pl-3 text-xs leading-5 text-muted">
              Vendida a {soldInfo.date} — há {soldInfo.days} {soldInfo.days === 1 ? "dia" : "dias"}.
            </p>
          )}

          {vehicle.status !== "sold" && (
            <div className={`mt-7 grid grid-cols-1 gap-3 ${vehicle.status === "available" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
              {vehicle.status === "available" && (
                <Link href={`/contacto?reserva=${vehicle.slug}`} className="flex items-center justify-center bg-copper px-6 py-4 text-center font-display text-xs font-semibold uppercase tracking-[0.24em] text-black transition-colors hover:bg-copper-light">Reservar viatura</Link>
              )}
              <Link href={`/contacto?vehicle=${vehicle.slug}`} className="flex items-center justify-center bg-copper px-6 py-4 text-center font-display text-xs font-semibold uppercase tracking-[0.24em] text-black transition-colors hover:bg-copper-light">Pedir informações</Link>
              <Link href={`/contacto?testdrive=${vehicle.slug}`} className="flex items-center justify-center bg-copper px-6 py-4 text-center font-display text-xs font-semibold uppercase tracking-[0.24em] text-black transition-colors hover:bg-copper-light">Marcar test-drive</Link>
            </div>
          )}

          <VehicleSpecifications primary={primarySpecs} additional={additionalSpecs} />

          {vehicle.description && <section className="mt-8 border-t border-border pt-6"><h2 className="font-display text-xs uppercase tracking-[0.24em] text-copper">Descrição</h2><p className="mt-3 text-sm leading-7 text-silver">{vehicle.description}</p></section>}

          <div className="mt-7 lg:hidden">
            <VehicleEquipmentAndConditions accidentHistory={vehicle.accident_history} features={features} />
          </div>

          <p className="mt-7 border-l-2 border-copper bg-surface px-4 py-3 text-xs leading-5 text-muted">Contacta a equipa para confirmar disponibilidade, características e condições desta viatura.</p>
        </div>
      </div>

      <section className="mt-16 border-t border-border pt-10"><p className="font-display text-[10px] uppercase tracking-[0.24em] text-copper">A próxima escolha</p><h2 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight text-white">Recomendações</h2>{similarVehicles.length ? <div className="mt-6 grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-4">{similarVehicles.map((car) => { const carPhotos = [...(car.cover_image_url ? [{ url: car.cover_image_url }] : []), ...((car.vehicle_images || []).filter((image) => image.url).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map((image) => ({ url: image.url!, alt: image.alt_text || "" })))].filter((photo, index, allPhotos) => allPhotos.findIndex((item) => item.url === photo.url) === index).slice(0, 2); return <article key={car.id} className="card-lift group flex h-full flex-col overflow-hidden border border-white/10 bg-surface hover:border-copper/70 hover:shadow-[0_0_24px_rgba(244,119,36,0.13)]"><VehicleCardGallery photos={carPhotos} href={`/catalogo/${car.slug}`} title={`${car.brand ?? ""} ${car.model ?? ""}`}><div className="absolute right-3 top-3 z-20"><FavoriteButton vehicleId={car.id}/></div>{car.status === "reserved" && <span className="absolute bottom-3 left-3 z-20 border border-amber-400/70 bg-black/80 px-2.5 py-1 font-display text-[9px] uppercase tracking-[0.14em] text-amber-300">Reservada</span>}</VehicleCardGallery><Link href={`/catalogo/${car.slug}`} className="flex flex-1 flex-col p-4"><p className="font-display text-[9px] uppercase tracking-[0.16em] text-white/45">{car.brand} · {car.registration_year}</p><h3 className="mt-2 min-h-12 font-display text-lg font-semibold uppercase text-white">{car.model}</h3>{car.trim && <p className="mt-1 min-h-4 truncate font-display text-[9px] uppercase tracking-wider text-copper">{car.trim}</p>}<p className="mt-auto pt-3 font-display text-lg text-white">{car.price != null ? `${car.price.toLocaleString("pt-PT")} €` : "Sob consulta"}</p></Link></article>; })}</div> : <p className="mt-5 border border-white/10 bg-surface px-5 py-8 text-sm text-white/55">Estamos a preparar novas recomendações. Volta em breve para ver as próximas viaturas.</p>}</section>
    </div>
  );
}
