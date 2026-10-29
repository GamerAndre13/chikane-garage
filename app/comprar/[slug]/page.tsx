import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isVehiclePubliclyVisible } from "@/lib/vehicle-visibility";
import { expireReservations } from "@/lib/expire-reservations";
import { archiveSoldVehicles } from "@/lib/archive-sold-vehicles";
import { VehiclePurchase, type PurchaseExtra } from "@/components/ui/vehicle-purchase";

// Página de compra / pedido de proposta de uma viatura, no formato de
// /comprar/<slug>: extras numerados + resumo sticky com o total e o
// formulário de dados (estilo do "Pedir informações").
// A ficha da viatura continua em /catalogo/<slug>.

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  let vehicle: {
    brand?: string | null;
    model?: string | null;
    trim?: string | null;
    registration_year?: number | null;
    price?: number | null;
    status?: string | null;
    sold_at?: string | null;
    updated_at?: string | null;
    created_at?: string | null;
  } | null = null;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("vehicles")
      .select("brand, model, trim, registration_year, price, status, sold_at, updated_at, created_at")
      .eq("slug", slug)
      .maybeSingle();
    if (data && isVehiclePubliclyVisible(data)) vehicle = data;
  } catch {
    vehicle = null;
  }

  const name = vehicle ? [vehicle.brand, vehicle.model, vehicle.trim].filter(Boolean).join(" ") : "Viatura";

  return {
    title: vehicle ? `Pedir proposta · ${name} | Chikane Garage` : "Pedir proposta | Chikane Garage",
    description: vehicle
      ? `Configura os extras e pede uma proposta para a ${name}.`
      : "Configura os extras e pede uma proposta para a tua próxima viatura.",
  };
}

type Vehicle = {
  id: string;
  slug: string;
  brand?: string | null;
  model?: string | null;
  trim?: string | null;
  registration_year?: number | null;
  mileage_km?: number | null;
  price?: number | null;
  cover_image_url?: string | null;
  status?: string | null;
  sale_type?: string | null;
  sold_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

export default async function ComprarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let vehicle: Vehicle | null = null;
  try {
    // Mantém os estados atualizados (reservas vencidas / vendas antigas).
    await expireReservations();
    await archiveSoldVehicles();
    const supabase = await createClient();
    const { data } = await supabase
      .from("vehicles")
      .select("id, slug, brand, model, trim, registration_year, mileage_km, price, cover_image_url, status, sale_type, sold_at, updated_at, created_at")
      .eq("slug", slug)
      .single();
    vehicle = (data || null) as Vehicle | null;
  } catch {
    vehicle = null;
  }

  if (!vehicle || !isVehiclePubliclyVisible(vehicle) || vehicle.status === "sold") notFound();

  // Extras configuráveis: catálogo associado a esta viatura + variantes ativas.
  let configuratorExtras: PurchaseExtra[] = [];
  if (vehicle.sale_type === "new") {
    try {
      const supabase = await createClient();
      const { data: extraRows } = await supabase
        .from("vehicle_extras")
        .select("catalog_extra_id, name, price")
        .eq("vehicle_id", vehicle.id)
        .order("created_at", { ascending: true });
      const rows = (extraRows || []) as { catalog_extra_id: string | null; name: string; price: number | null }[];
      const catalogIds = rows.map((row) => row.catalog_extra_id).filter((value): value is string => Boolean(value));
      let variantRows: { id: string; extra_id: string; name: string; price: number | null; position: number | null }[] = [];
      // Descrição e fotografia vivem no catálogo partilhado (vehicle_extra_catalog).
      let catalogRows: { id: string; description: string | null; image_url: string | null }[] = [];
      if (catalogIds.length) {
        const [variantsRes, catalogRes] = await Promise.all([
          supabase
            .from("vehicle_extra_variants")
            .select("id, extra_id, name, price, position")
            .in("extra_id", catalogIds)
            .eq("is_active", true)
            .order("position", { ascending: true }),
          supabase
            .from("vehicle_extra_catalog")
            .select("id, description, image_url")
            .in("id", catalogIds),
        ]);
        variantRows = (variantsRes.data || []) as typeof variantRows;
        catalogRows = (catalogRes.data || []) as typeof catalogRows;
      }
      configuratorExtras = rows.map((row, index) => {
        const catalog = catalogRows.find((item) => item.id === row.catalog_extra_id);
        return {
          id: row.catalog_extra_id || `${vehicle.id}-${index}`,
          name: row.name,
          description: catalog?.description ?? null,
          image_url: catalog?.image_url ?? null,
          price: Number(row.price) || 0,
          variants: variantRows
            .filter((variant) => variant.extra_id === row.catalog_extra_id)
            .map((variant) => ({ id: variant.id, name: variant.name, price: Number(variant.price) || 0 })),
        };
      });
    } catch {
      configuratorExtras = [];
    }
  }

  return (
    <VehiclePurchase
      vehicleId={vehicle.id}
      vehicleSlug={vehicle.slug}
      vehicleName={[vehicle.brand, vehicle.model, vehicle.trim].filter(Boolean).join(" ")}
      brand={vehicle.brand}
      model={vehicle.model}
      trim={vehicle.trim}
      year={vehicle.registration_year}
      mileageKm={vehicle.mileage_km}
      saleType={vehicle.sale_type}
      photoUrl={vehicle.cover_image_url}
      basePrice={vehicle.price ?? null}
      extras={configuratorExtras}
    />
  );
}
