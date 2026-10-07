// Normalização dos links vindos do backoffice (/admin/definicoes).
// Aceitam URL completa ("https://..."), domínio ("instagram.com/x")
// ou só o identificador ("@chikanegarage").

function toUrl(value: string, handleBase: string): string {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[^\s/]+\.[^\s/]+/i.test(v)) return `https://${v.replace(/^www\./i, "")}`;
  return `${handleBase}${v.replace(/^@/, "")}`;
}

export function instagramUrl(value: string): string {
  return toUrl(value, "https://instagram.com/");
}

export function facebookUrl(value: string): string {
  return toUrl(value, "https://facebook.com/");
}

export function youtubeUrl(value: string): string {
  return toUrl(value, "https://youtube.com/");
}

export function tiktokUrl(value: string): string {
  return toUrl(value, "https://tiktok.com/@");
}

export function whatsappUrl(value: string): string {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[^\s/]+\.[^\s/]+/i.test(v)) return `https://${v.replace(/^www\./i, "")}`;
  const digits = v.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}
