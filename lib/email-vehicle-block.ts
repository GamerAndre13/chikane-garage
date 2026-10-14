// Bloco de viatura reutilizável nos emails transacionais (test-drive/reserva):
// fotografia clicável que abre o anúncio da viatura no site.
// HTML simples e inline (compatível com clientes de email).

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function vehicleEmailBlock({
  url,
  imageUrl,
  name,
}: {
  url?: string | null;
  imageUrl?: string | null;
  name?: string | null;
}): string {
  if (!url) return "";
  const label = escapeHtml(name?.trim() || "a viatura");
  const image = imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" alt="${label}" style="width:100%;max-height:280px;object-fit:cover;display:block" />`
    : "";
  return `
            <a href="${escapeHtml(url)}" style="display:block;text-decoration:none;margin:0 0 20px;border:1px solid #222;border-radius:10px;overflow:hidden;background:#1a1a1a">
              ${image}
              <div style="padding:14px 16px">
                <p style="margin:0;color:#fff;font-size:15px;font-weight:bold">${label}</p>
                <p style="margin:6px 0 0;color:#f47724;font-size:13px">Ver o anúncio da viatura →</p>
              </div>
            </a>`;
}
