export function pickFromPool(userId: string, poolRaw?: string | null): string | null {
  if (!poolRaw) return null;
  const urls = poolRaw
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (!urls.length) return null;
  let h = 0;
  for (let i = 0; i < userId.length; i++) {
    h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  }
  const idx = h % urls.length;
  return urls[idx];
}