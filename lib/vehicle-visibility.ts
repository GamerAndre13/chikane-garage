const SOLD_VISIBILITY_MS = 7 * 24 * 60 * 60 * 1000;

type VehicleVisibilityFields = {
  status?: string | null;
  sold_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

/**
 * Uma viatura arquivada nunca é pública (saiu do catálogo). As viaturas
 * vendidas mantêm-se visíveis durante 7 dias após a venda; passado esse
 * prazo a base de dados arquiva-as automaticamente (RPC archive_sold_vehicles).
 */
export function isVehiclePubliclyVisible(
  vehicle: VehicleVisibilityFields,
  now = Date.now(),
): boolean {
  if (vehicle.status === "archived") return false;
  if (vehicle.status !== "sold") return true;

  const soldAt = vehicle.sold_at || vehicle.updated_at || vehicle.created_at;
  if (!soldAt) return false;

  const soldTimestamp = Date.parse(soldAt);
  return Number.isFinite(soldTimestamp) && now - soldTimestamp < SOLD_VISIBILITY_MS;
}
