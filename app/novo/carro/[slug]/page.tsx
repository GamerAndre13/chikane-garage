import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FavoriteButton } from "@/components/ui/favorite-button";
import { VehicleDetailGallery } from "@/components/ui/vehicle-detail-gallery";
import { VehicleCardGallery } from "@/components/ui/vehicle-card-gallery";
import { VehicleSpecifications } from "@/components/ui/vehicle-specifications";
import { isVehiclePubliclyVisible } from "@/lib/vehicle-visibility";
import { isVehicleNovidade } from "@/lib/vehicle-badges";
import { newVehicleSpecs } from "@/lib/vehicle-specs";
import { vehicleHref } from "@/lib/vehicle-links";
import { expireReservations } from "@/lib/expire-reservations";
import { archiveSoldVehicles } from "@/lib/archive-sold-vehicles";

// Ficha própria das viaturas novas (por encomenda). É deliberadamente
// diferente da ficha dos usados: aqui não interessam quilometragem, donos,
// origem ou caderneta — interessam a configuração, os extras e o pedido de
// proposta. O layout é editorial, com a configuração em destaque.

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

  const name = vehicle ? [vehicle.brand, vehicle.model, vehicle.trim].filter(Boolean).join(" ") : "Viatura nova";
  const price = vehicle?.price != null ? `${vehicle.price.toLocaleString("pt-PT")} €` : "";

  return {
    title: vehicle ? `${name} | Viatura nova | Chikane Garage` : "Viatura nova | Chikane Garage",
    description: vehicle
      ? `${name}${price ? ` — desde ${price}` : ""}. Configura os extras e pede uma proposta por encomenda na Chikane Garage.`
      : "Viaturas novas por encomenda na Chikane Garage.",
    openGraph: vehicle?.cover_image_url ? { images: [{ url: vehicle.cover_image_url }] } : undefined,
  };
}

type VehicleImage = { id: string; url?: string | null; position?: number | null; alt_text?: string | null };
type VehicleFeature = { id: string; label?: string | null };

type Vehicle = {
  id: string;
  slug: string;
  brand?: string | null;
  model?: string | null;
  trim?: string | null;
  registration_year?: number | null;
  status?: string | null;
  price?: number | null;
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
  registration_month?: number | null;
  warranty_months?: number | null;
  coc_confirmed?: boolean | null;
  isv_paid?: boolean | null;
  reference_code?: string | null;
  cover_image_url?: string | null;
  description?: string | null;
  vehicle_images?: VehicleImage[] | null;
  vehicle_features?: VehicleFeature[] | null;
  sale_type?: string | null;
  sold_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

const PROCESS = [
  { num: "01", title: "Escolhe o modelo", text: "A configuração de base já inclui tudo o que está na ficha." },
  { num: "02", title: "Adiciona extras", text: "Configura cor, jantes, pacotes e equipamento opcional." },
  { num: "03", title: "Recebe a proposta", text: "Enviamos o valor fechado, com prazos e condições." },
  { num: "04", title: "Encomenda e entrega", text: "Confirmamos o pedido e acompanhamos até à entrega." },
];

async function loadVehicle(slug: string): Promise<Vehicle | null> {
  try {
    await Promise.all([expireReservations(), archiveSoldVehicles()]);
    const supabase = await createClient();
    const { data } = await supabase
      .from("vehicles")
      .select("*, vehicle_images(*), vehicle_features(*)")
      .eq("slug", slug)
      .single();
    return (data || null) as Vehicle | null;
  } catch {
    return null;
  }
}

export default async function NovoCarroPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vehicle = await loadVehicle(slug);
  if (!vehicle || !isVehiclePubliclyVisible(vehicle)) notFound();
  // Esta ficha é só para viaturas novas; um usado aqui volta à ficha normal.
  if (vehicle.sale_type !== "new") redirect(`/usados/${vehicle.slug}`);

  const gallery = ((vehicle.vehicle_images || []) as VehicleImage[])
    .filter((img) => img.url)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((img) => ({ url: img.url as string, alt: img.alt_text || "" }));
  const photos = [
    ...(vehicle.cover_image_url ? [{ url: vehicle.cover_image_url, alt: `${vehicle.brand} ${vehicle.model}` }] : []),
    ...gallery,
  ].filter((photo, index, all) => all.findIndex((candidate) => candidate.url === photo.url) === index);

  const features = ((vehicle.vehicle_features || []) as VehicleFeature[]).filter((feature) => feature.label);
  const { primary: primarySpecs, additional: additionalSpecs } = newVehicleSpecs(vehicle);
  const isSold = vehicle.status === "sold";
  const available = vehicle.status === "available";
  const stockLabel = isSold ? "Vendida" : vehicle.status === "reserved" ? "Reservada" : "Disponível por encomenda";

  let similarVehicles: Vehicle[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("vehicles")
      .select("id, slug, brand, model, trim, registration_year, mileage_km, power_hp, fuel_type, price, cover_image_url, status, sale_type, sold_at, updated_at, created_at")
      .eq("sale_type", "new")
      .in("status", ["available", "reserved"])
      .neq("id", vehicle.id)
      .order("created_at", { ascending: false })
      .limit(4);
    similarVehicles = ((data || []) as Vehicle[]).filter(isVehiclePubliclyVisible);
    if (similarVehicles.length) {
      const { data: images } = await supabase
        .from("vehicle_images")
        .select("id, vehicle_id, url, position, alt_text")
        .in("vehicle_id", similarVehicles.map((car) => car.id))
        .order("position");
      const imagesByVehicle = new Map<string, NonNullable<Vehicle["vehicle_images"]>>();
      for (const image of images || []) {
        imagesByVehicle.set(image.vehicle_id, [...(imagesByVehicle.get(image.vehicle_id) || []), image]);
      }
      similarVehicles = similarVehicles.map((car) => ({ ...car, vehicle_images: imagesByVehicle.get(car.id) || [] }));
    }
  } catch {
    similarVehicles = [];
  }

  return (
    <div className="bg-background">
      <section className="relative overflow-hidden border-b border-border">
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-25" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1440px] px-5 pb-14 pt-10 sm:px-8 sm:pt-12 lg:px-12 lg:pb-20">
          <Link href="/novos" className="font-display text-[11px] uppercase tracking-[0.2em] text-silver transition-colors hover:text-copper">
            ← Novos
          </Link>

          <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1.35fr_1fr] xl:gap-14">
            <div className="min-w-0">
              <div className="relative">
                <VehicleDetailGallery photos={photos} title={`${vehicle.brand ?? ""} ${vehicle.model ?? ""}`} />
                <div className="absolute right-3 top-3 z-20"><FavoriteButton vehicleId={vehicle.id} /></div>
                <span className="absolute left-0 top-5 z-10 bg-copper px-4 py-2 font-display text-[10px] font-semibold uppercase tracking-[0.24em] text-black">
                  Novo · Por encomenda
                </span>
              </div>

              <div className="mt-8 border border-border bg-surface p-6">
                <p className="kicker">Como funciona</p>
                <ol className="mt-5 grid gap-px bg-border sm:grid-cols-2">
                  {PROCESS.map((step) => (
                    <li key={step.num} className="bg-surface p-4">
                      <span className="font-display text-xs text-copper">{step.num}</span>
                      <h3 className="mt-1.5 font-display text-sm font-semibold uppercase tracking-wide text-foreground">{step.title}</h3>
                      <p className="mt-1.5 text-xs leading-5 text-muted">{step.text}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="min-w-0">
              <p className="font-display text-[11px] font-semibold uppercase tracking-[0.26em] text-copper">
                {vehicle.reference_code ? `Chikane selection · ${vehicle.reference_code}` : "Configuração por encomenda"}
              </p>
              <h1 className="mt-3 font-display text-5xl font-bold uppercase leading-[0.98] tracking-tight text-foreground sm:text-6xl">
                {vehicle.brand} {vehicle.model}
              </h1>
              {vehicle.trim && <p className="mt-2 font-display text-sm uppercase tracking-[0.2em] text-silver">{vehicle.trim}</p>}
              <p className="mt-7 font-display text-4xl font-medium text-copper sm:text-5xl">
                {vehicle.price != null ? `${vehicle.price.toLocaleString("pt-PT")} €` : "Sob consulta"}
              </p>
              <p className="mt-1 text-xs text-muted">Valor base. Os extras escolhidos são somados na proposta final.</p>

              <p className="mt-4 inline-flex border border-white/15 px-3 py-1 font-display text-[10px] uppercase tracking-[0.18em] text-silver">
                {stockLabel}
              </p>

              {!isSold && (
                <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Link href={`/comprar/${vehicle.slug}`} className="flex items-center justify-center bg-copper px-6 py-4 text-center font-display text-xs font-semibold uppercase tracking-[0.24em] text-black transition-colors hover:bg-copper-light">
                    Configurar
                  </Link>
                  <Link href={`/contacto?vehicle=${vehicle.slug}`} className="flex items-center justify-center border border-copper px-6 py-4 text-center font-display text-xs font-semibold uppercase tracking-[0.24em] text-copper transition-colors hover:bg-copper hover:text-black">
                    Pedir informações
                  </Link>
                </div>
              )}
              {isSold && (
                <div className="mt-7 border border-border bg-surface px-5 py-4">
                  <p className="font-display text-xs uppercase tracking-[0.2em] text-muted">Esta configuração já saiu da garagem</p>
                  <Link href="/novos" className="mt-3 inline-flex font-display text-xs uppercase tracking-[0.18em] text-copper transition-colors hover:text-white">
                    Ver outras viaturas novas →
                  </Link>
                </div>
              )}
              {!isSold && available && (
                <p className="mt-3 text-[11px] leading-relaxed text-muted">
                  Encomenda sujeita a confirmação de produção e prazo. Falamos contigo antes de qualquer compromisso.
                </p>
              )}

              <VehicleSpecifications primary={primarySpecs} additional={additionalSpecs} />

              {vehicle.description && (
                <section className="mt-8 border-t border-border pt-6">
                  <h2 className="font-display text-xs uppercase tracking-[0.24em] text-copper">Descrição</h2>
                  <p className="mt-3 text-sm leading-7 text-silver">{vehicle.description}</p>
                </section>
              )}
            </div>
          </div>
        </div>
      </section>

      {features.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12">
          <p className="kicker">Equipamento de série</p>
          <h2 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight text-foreground">Já incluído</h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {features.map((feature) => (
              <span key={feature.id} className="border border-border bg-surface px-3 py-2 text-xs text-silver">{feature.label}</span>
            ))}
          </div>
          <p className="mt-5 text-xs text-muted">
            O equipamento opcional é escolhido no configurador. Os valores são apresentados na proposta.
          </p>
          {!isSold && (
            <Link href={`/comprar/${vehicle.slug}`} className="mt-6 inline-flex border border-copper px-6 py-3 font-display text-xs font-semibold uppercase tracking-[0.2em] text-copper transition-colors hover:bg-copper hover:text-black">
              Escolher extras
            </Link>
          )}
        </section>
      )}

      {similarVehicles.length > 0 && (
        <section className="border-t border-border">
          <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12">
            <p className="kicker">Outras encomendas</p>
            <h2 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight text-white">Também por encomenda</h2>
            <div className="mt-6 grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {similarVehicles.map((car) => {
                const carPhotos = [
                  ...(car.cover_image_url ? [{ url: car.cover_image_url }] : []),
                  ...((car.vehicle_images || []).filter((image) => image.url).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map((image) => ({ url: image.url!, alt: image.alt_text || "" }))),
                ].filter((photo, index, allPhotos) => allPhotos.findIndex((item) => item.url === photo.url) === index).slice(0, 2);
                return (
                  <article key={car.id} className="card-lift group flex h-full flex-col overflow-hidden border border-white/10 bg-surface hover:border-copper/70 hover:shadow-[0_0_24px_rgba(244,119,36,0.13)]">
                    <VehicleCardGallery photos={carPhotos} href={vehicleHref(car)} title={`${car.brand ?? ""} ${car.model ?? ""}`}>
                      <div className="absolute right-3 top-3 z-20"><FavoriteButton vehicleId={car.id} /></div>
                      {isVehicleNovidade(car) ? (
                        <span className="absolute left-3 top-3 z-20 border border-copper bg-black/80 px-2.5 py-1 font-display text-[9px] uppercase tracking-[0.14em] text-copper">Novidade</span>
                      ) : car.status === "reserved" ? (
                        <span className="absolute left-3 top-3 z-20 border border-amber-400/70 bg-black/80 px-2.5 py-1 font-display text-[9px] uppercase tracking-[0.14em] text-amber-300">Reservada</span>
                      ) : null}
                    </VehicleCardGallery>
                    <Link href={vehicleHref(car)} className="flex flex-1 flex-col p-4">
                      <p className="font-display text-[9px] uppercase tracking-[0.16em] text-white/45">{car.brand} · {car.registration_year}</p>
                      <h3 className="mt-2 min-h-12 font-display text-lg font-semibold uppercase text-white">{car.model}</h3>
                      {car.trim && <p className="mt-1 min-h-4 truncate font-display text-[9px] uppercase tracking-[0.16em] text-white/50">{car.trim}</p>}
                      <p className="mt-auto pt-3 font-display text-base text-copper">{car.price != null ? `${car.price.toLocaleString("pt-PT")} €` : "Sob consulta"}</p>
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
