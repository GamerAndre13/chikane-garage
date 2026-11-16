import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { isVehiclePubliclyVisible } from "@/lib/vehicle-visibility";
import { vehicleHref } from "@/lib/vehicle-links";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (!siteUrl) return [];

  const paths = ["", "/usados", "/novos", "/sobre", "/contacto", "/politica-de-privacidade", "/termos-e-condicoes"];
  const entries: MetadataRoute.Sitemap = paths.map((path) => ({ url: `${siteUrl}${path}`, changeFrequency: path === "/usados" ? "daily" : "monthly", priority: path === "" ? 1 : path === "/usados" ? 0.9 : 0.5 }));
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("vehicles").select("slug, sale_type, status, sold_at, updated_at, created_at").in("status", ["available", "reserved", "sold"]);
    for (const vehicle of (data || []).filter(isVehiclePubliclyVisible)) {
      entries.push({ url: `${siteUrl}${vehicleHref(vehicle)}`, lastModified: vehicle.updated_at || vehicle.created_at || undefined, changeFrequency: "weekly", priority: 0.7 });
    }
  } catch {
    // Pages without data access can still be crawled from the static entries.
  }
  return entries;
}
