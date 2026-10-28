import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { isVehiclePubliclyVisible } from "@/lib/vehicle-visibility";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (!siteUrl) return [];

  const paths = ["", "/catalogo", "/novos", "/sobre", "/contacto", "/politica-de-privacidade", "/termos-e-condicoes"];
  const entries: MetadataRoute.Sitemap = paths.map((path) => ({ url: `${siteUrl}${path}`, changeFrequency: path === "/catalogo" ? "daily" : "monthly", priority: path === "" ? 1 : path === "/catalogo" ? 0.9 : 0.5 }));
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("vehicles").select("slug, status, sold_at, updated_at, created_at").in("status", ["available", "reserved", "sold"]);
    for (const vehicle of (data || []).filter(isVehiclePubliclyVisible)) {
      entries.push({ url: `${siteUrl}/catalogo/${vehicle.slug}`, lastModified: vehicle.updated_at || vehicle.created_at || undefined, changeFrequency: "weekly", priority: 0.7 });
    }
  } catch {
    // Pages without data access can still be crawled from the static entries.
  }
  return entries;
}
