// Endereço público de cada viatura. As viaturas novas (por encomenda) têm uma
// ficha própria em /novo/carro/<slug>; as usadas ficam em /usados/<slug>.
// Centralizar aqui evita cartões e emails a apontar para a ficha errada.

export function vehicleHref(vehicle: { slug: string; sale_type?: string | null }): string {
  return vehicle.sale_type === "new" ? `/novo/carro/${vehicle.slug}` : `/usados/${vehicle.slug}`;
}
