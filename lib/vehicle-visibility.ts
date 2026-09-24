const SOLD_VISIBILITY_MS = 7 * 24 * 60 * 60 * 1000;

type VehicleVisibilityFields = {
  status?: string | null;
  sold_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

export function isVehiclePubliclyVisible(
  vehicle: VehicleVisibilityFields,
  now = Date.now(),
): boolean {
  if (vehicle.status !== "sold") return true;

  const soldAt = vehicle.sold_at || vehicle.updated_at || vehicle.created_at;
  if (!soldAt) return false;

  const soldTimestamp = Date.parse(soldAt);
  return Number.isFinite(soldTimestamp) && now - soldTimestamp < SOLD_VISIBILITY_MS;
}
