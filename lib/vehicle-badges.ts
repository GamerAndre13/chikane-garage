// Etiquetas comuns dos cartões de viatura (home, catálogo e recomendações).

/** Dias em que uma viatura usada conta como "novidade" depois de chegar. */
export const NOVIDADE_DIAS = 4;

type VehicleBadgeInfo = {
  sale_type?: string | null;
  status?: string | null;
  created_at?: string | null;
};

/**
 * "Novidade": viatura usada que entrou na garagem nos últimos 4 dias.
 * As novas (por encomenda) e as vendidas ficam de fora.
 */
export function isVehicleNovidade(vehicle: VehicleBadgeInfo): boolean {
  if (vehicle.sale_type === "new" || vehicle.status === "sold") return false;
  if (!vehicle.created_at) return false;
  const chegada = new Date(vehicle.created_at).getTime();
  if (!Number.isFinite(chegada)) return false;
  return Date.now() - chegada <= NOVIDADE_DIAS * 24 * 60 * 60 * 1000;
}

/** "Usado" ou "Novo", conforme o tipo de venda da viatura. */
export function saleTypeLabel(vehicle: { sale_type?: string | null }): string {
  return vehicle.sale_type === "new" ? "Novo" : "Usado";
}
