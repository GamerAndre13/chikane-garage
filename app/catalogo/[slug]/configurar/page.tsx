import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isVehiclePubliclyVisible } from "@/lib/vehicle-visibility";
import { VehicleConfigurator, type ConfiguratorAccessory } from "@/components/shop/vehicle-configurator";
import type { ShopProduct } from "@/lib/shop";

export const metadata = { title: "Configurar viatura | Chikane Garage" };

// Compra online de viatura nova 0 km: monta a viatura com os acessórios
// compatíveis, escolhe a entrega e envia um pedido de encomenda à equipa
// (sem pagamento online).
export default async function VehicleConfiguratorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let vehicle: { id: string; slug: string; brand?: string | null; model?: string | null; trim?: string | null; price?: number | null; condition?: string | null; status?: string | null; cover_image_url?: string | null; registration_year?: number | null; mileage_km?: number | null; sold_at?: string | null; updated_at?: string | null; created_at?: string | null } | null = null;
  let accessories: ConfiguratorAccessory[] = [];
  let prefill: { name?: string; email?: string; phone?: string } = {};

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("vehicles")
      .select("id, slug, brand, model, trim, price, condition, status, cover_image_url, registration_year, mileage_km, sold_at, updated_at, created_at")
      .eq("slug", slug)
      .maybeSingle();
    if (data && isVehiclePubliclyVisible(data)) vehicle = data;

    if (vehicle) {
      const { data: products } = await supabase
        .from("products")
        .select("id,slug,name,price,stock_mode,is_featured,product_categories(name,slug),brands(name),product_variants(id,name,price_delta,is_active),product_images(url,alt_text,position),product_compatibility(brand,model,year_from,year_to)")
        .eq("status", "active")
        .order("published_at", { ascending: false })
        .limit(120);
      const brand = (vehicle.brand ?? "").trim().toLowerCase();
      const model = (vehicle.model ?? "").trim().toLowerCase();
      const year = vehicle.registration_year ?? null;
      const partCategories = new Set(["pecas-e-manutencao", "jantes-e-pneus", "extras-e-acessorios"]);
      accessories = (((products ?? []) as unknown as ShopProduct[])
        .map((product) => {
          const compatible = brand !== "" && (product.product_compatibility ?? []).some((entry) =>
            (entry.brand ?? "").trim().toLowerCase() === brand &&
            (!(entry.model ?? "").trim() || (entry.model ?? "").trim().toLowerCase() === model) &&
            (year == null || ((entry.year_from ?? 0) <= year && (entry.year_to ?? 9999) >= year)));
          const brandMatch = brand !== "" && (product.brands?.name ?? "").trim().toLowerCase() === brand;
          const parts = partCategories.has(product.product_categories?.slug ?? "");
          return { product, score: (compatible ? 6 : 0) + (brandMatch ? 3 : 0) + (parts ? 2 : 0) + (product.is_featured ? 1 : 0) };
        })
        .filter((entry) => entry.score >= 2)
        .sort((a, b) => b.score - a.score)
        .slice(0, 14)
        .map((entry): ConfiguratorAccessory => ({
          id: entry.product.id,
          name: entry.product.name,
          price: Number(entry.product.price),
          category: entry.product.product_categories?.name ?? null,
          stock_mode: entry.product.stock_mode ?? null,
          image: [...(entry.product.product_images ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0]?.url ?? null,
          variants: (entry.product.product_variants ?? []).filter((variant) => variant.is_active !== false).map((variant) => ({ id: variant.id, name: variant.name, price_delta: Number(variant.price_delta ?? 0) })),
        }))
        .filter((item) => item.variants.length > 0));
    }

    // Clientes registados: pré-preenchemos o contacto a partir do perfil.
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle();
      prefill = { name: profile?.full_name || undefined, email: user.email || undefined, phone: profile?.phone || undefined };
    }
  } catch {
    if (!vehicle) notFound();
  }

  if (!vehicle) notFound();
  // Só viaturas novas, disponíveis e com preço entram no configurador — as
  // restantes seguem o fluxo de contacto pela ficha.
  if (!(vehicle.condition === "new" && vehicle.status === "available" && vehicle.price != null)) redirect(`/catalogo/${slug}`);
  const name = [vehicle.brand, vehicle.model].filter(Boolean).join(" ");

  return (
    <div className="mx-auto max-w-[1280px] px-5 pb-20 pt-10 sm:px-8 sm:pt-14 lg:px-12">
      <Link href={`/catalogo/${slug}`} className="font-display text-[11px] uppercase tracking-[0.2em] text-silver transition-colors hover:text-copper">← Voltar à ficha da viatura</Link>
      <p className="mt-8 font-display text-[11px] font-semibold uppercase tracking-[0.26em] text-copper">Compra online</p>
      <h1 className="mt-3 font-display text-4xl font-bold uppercase leading-none tracking-tight text-foreground sm:text-5xl">{name}{vehicle.trim && <span className="ml-3 font-normal text-silver">{vehicle.trim}</span>}</h1>
      <div className="mt-10">
        <VehicleConfigurator
          vehicle={{
            id: vehicle.id,
            slug: vehicle.slug,
            name,
            trim: vehicle.trim,
            price: Number(vehicle.price),
            image: vehicle.cover_image_url,
            year: vehicle.registration_year,
            mileageKm: vehicle.mileage_km,
          }}
          accessories={accessories}
          prefill={prefill}
        />
      </div>
    </div>
  );
}
