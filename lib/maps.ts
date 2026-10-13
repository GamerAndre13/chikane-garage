// Link para o Google Maps.
// Se o back office tiver um URL configurado (site_settings.location_url),
// usa-o tal como está. Caso contrário, abre uma pesquisa pela morada/
// localização escrita — assim o clique na localização leva sempre a algum
// lado útil, mesmo sem link configurado.
export function mapsUrl(
  locationUrl?: string | null,
  ...parts: (string | null | undefined)[]
): string | null {
  const configured = (locationUrl || "").trim();
  if (configured) return configured;

  const query = parts
    .map((part) => (part || "").trim())
    .filter(Boolean)
    .join(", ");
  if (!query) return null;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
