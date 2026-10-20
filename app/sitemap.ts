import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { isVehiclePubliclyVisible } from "@/lib/vehicle-visibility";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (!siteUrl) return [];

  const paths = ["", "/catalogo", "/usados", "/novos", "/loja", "/envios-e-devolucoes", "/faq", "/sobre", "/contacto", "/politica-de-privacidade", "/termos-e-condicoes", "/livro-reclamacoes"];
  const entries: MetadataRoute.Sitemap = paths.map((path) => ({ url: `${siteUrl}${path}`, changeFrequency: path === "/catalogo" ? "daily" : "monthly", priority: path === "" ? 1 : path === "/catalogo" ? 0.9 : 0.5 }));
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("vehicles").select("slug, status, sold_at, updated_at, created_at").in("status", ["available", "reserved", "sold"]);
    for (const vehicle of (data || []).filter(isVehiclePubliclyVisible)) {
      entries.push({ url: `${siteUrl}/catalogo/${vehicle.slug}`, lastModified: vehicle.updated_at || vehicle.created_at || undefined, changeFrequency: "weekly", priority: 0.7 });
    }

    // Loja: categorias e artigos publicados, para o SEO da montra.
    const [categoriesRes, productsRes] = await Promise.all([
      supabase.from("product_categories").select("slug").is("parent_id", null).eq("is_active", true),
      supabase.from("products").select("slug").eq("status", "active"),
    ]);
    for (const category of categoriesRes.data || []) {
      entries.push({ url: `${siteUrl}/loja/${category.slug}`, changeFrequency: "monthly", priority: 0.5 });
    }
    for (const product of productsRes.data || []) {
      entries.push({ url: `${siteUrl}/produto/${product.slug}`, changeFrequency: "monthly", priority: 0.6 });
    }
  } catch {
    // Pages without data access can still be crawled from the static entries.
  }
  return entries;
}
