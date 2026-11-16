// Validação partilhada dos formulários de viatura do backoffice.
// Regra do dono: todos os campos são obrigatórios, exceto a descrição e as
// emissões de CO₂. As viaturas novas (por encomenda) não mostram os campos
// que não se aplicam (ano/mês de registo, quilometragem, donos, caderneta e
// origem) — esses continuam a ser preenchidos automaticamente no submit.

import { isEngineValid, resolveCountryCode } from "@/lib/vehicle-options";

export type VehicleFormValues = Record<string, string>;
export type VehicleFormErrors = Record<string, string>;

const isBlank = (value: string | undefined) => !String(value ?? "").trim();

/** Número não negativo (aceita decimais, salvo quando `integer`). */
function invalidNumber(value: string, { integer = false, max }: { integer?: boolean; max?: number } = {}): boolean {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return true;
  if (max != null && number > max) return true;
  return integer && !Number.isInteger(number);
}

export function validateVehicleForm(form: VehicleFormValues): VehicleFormErrors {
  const errors: VehicleFormErrors = {};
  const isNew = form.sale_type === "new";

  // Identificação
  if (isBlank(form.brand)) errors.brand = "Escolhe a marca.";
  if (isBlank(form.model)) errors.model = "Indica o modelo.";
  if (isBlank(form.trim)) errors.trim = "Indica a versão / trim.";

  if (!isNew) {
    if (isBlank(form.registration_year)) {
      errors.registration_year = "Indica o ano de registo.";
    } else {
      const year = Number(form.registration_year);
      if (!Number.isInteger(year) || year < 1900 || year > 2100) {
        errors.registration_year = "Ano entre 1900 e 2100.";
      }
    }
    if (isBlank(form.registration_month)) {
      errors.registration_month = "Indica o mês de registo.";
    } else if (invalidNumber(form.registration_month, { integer: true, max: 12 }) || Number(form.registration_month) < 1) {
      errors.registration_month = "Mês entre 1 e 12.";
    }
  }

  // Especificações técnicas
  if (isBlank(form.engine)) errors.engine = "Indica a cilindrada.";
  else if (!isEngineValid(form.engine)) errors.engine = "Usa o formato X.X (ex.: 2.0).";

  if (isBlank(form.power_hp)) errors.power_hp = "Indica a potência.";
  else if (invalidNumber(form.power_hp)) errors.power_hp = "Indica uma potência válida.";

  if (isBlank(form.torque_nm)) errors.torque_nm = "Indica o binário.";
  else if (invalidNumber(form.torque_nm)) errors.torque_nm = "Indica um binário válido.";

  if (isBlank(form.transmission)) errors.transmission = "Escolhe a caixa.";
  if (isBlank(form.drivetrain)) errors.drivetrain = "Escolhe a tração.";
  if (isBlank(form.fuel_type)) errors.fuel_type = "Escolhe o combustível.";

  if (isBlank(form.combined_consumption)) errors.combined_consumption = "Indica o consumo.";
  else if (invalidNumber(form.combined_consumption)) errors.combined_consumption = "Indica um consumo válido.";

  // CO₂ é opcional; só se valida quando preenchido.
  if (!isBlank(form.co2_emissions) && invalidNumber(form.co2_emissions)) {
    errors.co2_emissions = "Indica um valor de CO₂ válido.";
  }

  // Veículo
  if (!isNew) {
    if (isBlank(form.mileage_km)) errors.mileage_km = "Indica a quilometragem.";
    else if (invalidNumber(form.mileage_km)) errors.mileage_km = "Indica uma quilometragem válida.";

    if (isBlank(form.previous_owners)) errors.previous_owners = "Indica os donos anteriores.";
    else if (invalidNumber(form.previous_owners, { integer: true })) {
      errors.previous_owners = "Indica um número de donos válido.";
    }

    if (isBlank(form.service_book)) errors.service_book = "Escolhe a caderneta.";
    if (isBlank(form.origin)) errors.origin = "Escolhe a origem.";
    if (form.origin === "imported" && isBlank(resolveCountryCode(form.origin_country))) {
      errors.origin_country = "Indica o país de origem.";
    }
  }

  if (isBlank(form.exterior_color)) errors.exterior_color = "Indica a cor exterior.";
  if (isBlank(form.body_style)) errors.body_style = "Escolhe o estilo de carro.";
  if (isBlank(form.interior_color)) errors.interior_color = "Indica a cor interior.";

  // Preço
  if (isBlank(form.price)) errors.price = "Indica o preço.";
  else if (invalidNumber(form.price)) errors.price = "Indica um preço válido.";

  if (isBlank(form.warranty_months)) errors.warranty_months = "Indica a garantia (pode ser 0).";
  else if (invalidNumber(form.warranty_months, { integer: true })) {
    errors.warranty_months = "Indica uma garantia válida.";
  }

  return errors;
}
