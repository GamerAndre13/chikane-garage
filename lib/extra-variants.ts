// Utilitários de apresentação das variantes de extras.
// A variante mais barata é a que representa o extra no configurador público
// (e, por consequência, também no backoffice): assim o valor mostrado é o que
// o cliente vai pagar pela opção base.

export type ExtraVariantSummary = {
  id: string;
  extra_id: string;
  name: string;
  price: number | null;
  position?: number | null;
  is_active?: boolean | null;
};

/** Devolve a variante ativa mais barata de um extra (ou null se não tiver). */
export function cheapestVariantFor<T extends ExtraVariantSummary>(
  extraId: string,
  variants: T[]
): T | null {
  const active = variants.filter(
    (variant) => variant.extra_id === extraId && variant.is_active !== false
  );
  if (!active.length) return null;
  return [...active].sort(
    (a, b) =>
      (Number(a.price) || 0) - (Number(b.price) || 0) ||
      (Number(a.position) || 0) - (Number(b.position) || 0)
  )[0];
}
