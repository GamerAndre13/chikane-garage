// Especificações mostradas nas fichas públicas das viaturas.
// Duas apresentações distintas:
//   · viatura usada  → dados de utilização em primeiro (ano, km, caixa, donos…);
//   · viatura nova   → exactamente as 5 linhas pedidas pelo dono.
// O resto vai para "Mostrar mais informação", para a ficha não ficar uma parede
// de campos. Tudo em funções puras para ser reutilizado por qualquer página.

export type Spec = { label: string; value: string };

type SpecVehicle = {
  registration_year?: number | null;
  registration_month?: number | null;
  engine?: string | null;
  power_hp?: number | null;
  torque_nm?: number | null;
  transmission?: string | null;
  drivetrain?: string | null;
  fuel_type?: string | null;
  combined_consumption?: number | null;
  co2_emissions?: number | null;
  exterior_color?: string | null;
  interior_color?: string | null;
  body_style?: string | null;
  mileage_km?: number | null;
  previous_owners?: number | null;
  service_book?: string | null;
  origin?: string | null;
  origin_country?: string | null;
  warranty_months?: number | null;
  coc_confirmed?: boolean | null;
  isv_paid?: boolean | null;
};

const TRANSMISSION_LABEL: Record<string, string> = {
  automatic: "Automática",
  manual: "Manual",
};

const FUEL_LABEL: Record<string, string> = {
  diesel: "Diesel",
  gasoline: "Gasolina",
  hybrid: "Híbrido",
  electric: "Elétrico",
};

const BODY_STYLE_LABEL: Record<string, string> = {
  sedan: "Sedan",
  coupe: "Coupé",
  touring: "Carrinha / Touring",
  hatchback: "Hatchback",
  suv: "SUV",
  cabrio: "Cabrio",
  compact: "Compacto",
  monovolume: "Monovolume",
  outro: "Outro",
};

function transmissionLabel(value?: string | null): string {
  if (!value) return "—";
  return TRANSMISSION_LABEL[value.toLowerCase()] ?? value;
}

function fuelLabel(value?: string | null): string {
  if (!value) return "—";
  return FUEL_LABEL[value.toLowerCase()] ?? value;
}

function bodyStyleLabel(value?: string | null): string {
  if (!value) return "—";
  return BODY_STYLE_LABEL[value.toLowerCase()] ?? value.replaceAll("_", " ");
}

function serviceBookLabel(value?: string | null): string {
  switch (value) {
    case "full_dealer": return "Completa (concessionário)";
    case "full": return "Completa";
    case "partial": return "Parcial";
    case "none": return "Sem caderneta";
    default: return "—";
  }
}

const yearValue = (value?: number | null) => (value != null ? String(value) : "—");
const numberValue = (value?: number | null) => (value != null ? value.toLocaleString("pt-PT") : "—");
const powerValue = (value?: number | null) => (value != null ? `${value} cv` : "—");
const torqueValue = (value?: number | null) => (value != null ? `${value} Nm` : "—");
const consumptionValue = (value?: number | null) => (value != null ? `${value} l/100km` : "—");
const mileageValue = (value?: number | null) => (value != null ? `${value.toLocaleString("pt-PT")} km` : "—");
const originValue = (value?: string | null) =>
  value ? (value === "imported" ? "Importação" : "Nacional") : "—";

/**
 * Viatura usada: pares que fazem sentido para quem compra em segunda mão.
 * Campos fora dos pares (mês, país, caderneta, CO₂, garantia) ficam em
 * "Mostrar mais informação".
 */
export function usedVehicleSpecs(vehicle: SpecVehicle): { primary: Spec[]; additional: Spec[] } {
  const primary: Spec[] = [
    { label: "Ano", value: yearValue(vehicle.registration_year) },
    { label: "Quilometragem", value: mileageValue(vehicle.mileage_km) },
    { label: "Combustível", value: fuelLabel(vehicle.fuel_type) },
    { label: "Caixa", value: transmissionLabel(vehicle.transmission) },
    { label: "Potência", value: powerValue(vehicle.power_hp) },
    { label: "Binário", value: torqueValue(vehicle.torque_nm) },
    { label: "Motor", value: vehicle.engine || "—" },
    { label: "Consumo", value: consumptionValue(vehicle.combined_consumption) },
    { label: "Cor Exterior", value: vehicle.exterior_color || "—" },
    { label: "Cor Interior", value: vehicle.interior_color || "—" },
    { label: "Tração", value: vehicle.drivetrain ? vehicle.drivetrain.toUpperCase() : "—" },
    { label: "Estilo", value: bodyStyleLabel(vehicle.body_style) },
    { label: "Origem", value: originValue(vehicle.origin) },
    { label: "Donos", value: numberValue(vehicle.previous_owners) },
  ];

  const additional: Spec[] = [];
  if (vehicle.registration_month) additional.push({ label: "Mês Registo", value: String(vehicle.registration_month) });
  if (vehicle.origin_country) additional.push({ label: "País Origem", value: vehicle.origin_country });
  if (vehicle.service_book) additional.push({ label: "Caderneta", value: serviceBookLabel(vehicle.service_book) });
  if (vehicle.co2_emissions != null) additional.push({ label: "CO₂", value: `${vehicle.co2_emissions} g/km` });
  if (vehicle.warranty_months) additional.push({ label: "Garantia", value: `${vehicle.warranty_months} meses` });

  return { primary, additional };
}

/**
 * Viatura nova: exactamente as 5 linhas pedidas pelo dono —
 *   Ano | Combustível
 *   Motor | Consumo
 *   CV | NM
 *   Cor Interior | Cor Exterior
 *   Tração | Estilo
 * Caixa, CO₂, garantia e afins ficam em "Mostrar mais informação".
 */
export function newVehicleSpecs(vehicle: SpecVehicle): { primary: Spec[]; additional: Spec[] } {
  const primary: Spec[] = [
    { label: "Ano", value: yearValue(vehicle.registration_year) },
    { label: "Combustível", value: fuelLabel(vehicle.fuel_type) },
    { label: "Motor", value: vehicle.engine || "—" },
    { label: "Consumo", value: consumptionValue(vehicle.combined_consumption) },
    { label: "CV", value: powerValue(vehicle.power_hp) },
    { label: "NM", value: torqueValue(vehicle.torque_nm) },
    { label: "Cor Interior", value: vehicle.interior_color || "—" },
    { label: "Cor Exterior", value: vehicle.exterior_color || "—" },
    { label: "Tração", value: vehicle.drivetrain ? vehicle.drivetrain.toUpperCase() : "—" },
    { label: "Estilo", value: bodyStyleLabel(vehicle.body_style) },
  ];

  const additional: Spec[] = [];
  if (vehicle.transmission) additional.push({ label: "Caixa", value: transmissionLabel(vehicle.transmission) });
  if (vehicle.co2_emissions != null) additional.push({ label: "CO₂", value: `${vehicle.co2_emissions} g/km` });
  if (vehicle.warranty_months) additional.push({ label: "Garantia", value: `${vehicle.warranty_months} meses` });
  if (vehicle.coc_confirmed) additional.push({ label: "COC", value: "Confirmado ✓" });
  if (vehicle.isv_paid) additional.push({ label: "ISV", value: "Pago ✓" });

  return { primary, additional };
}
