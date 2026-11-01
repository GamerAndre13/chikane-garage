// Opções e formatadores partilhados pelos formulários de viatura do backoffice.
// São funções puras (sem BD) para poderem ser usadas no cliente sem custos.

// Cores sugeridas por omissão. As cores já existentes na base de dados são
// acrescentadas a esta lista pelo hook `useVehicleOptions`.
export const DEFAULT_EXTERIOR_COLORS = [
  "Preto",
  "Branco",
  "Cinzento",
  "Prata",
  "Azul",
  "Vermelho",
  "Verde",
  "Amarelo",
  "Laranja",
  "Castanho",
  "Bege",
  "Dourado",
  "Bordô",
  "Violeta",
];

export const DEFAULT_INTERIOR_COLORS = [
  "Preto",
  "Bege",
  "Castanho",
  "Cinzento",
  "Branco",
  "Vermelho",
  "Azul",
];

// Equipamento sugerido por omissão. Os extras já usados noutras viaturas são
// acrescentados a esta lista pelo hook `useVehicleOptions`.
export const DEFAULT_FEATURES = [
  "Ar condicionado automático",
  "Apple CarPlay",
  "Android Auto",
  "Bancos aquecidos",
  "Bancos desportivos",
  "Bancos elétricos com memória",
  "Câmara traseira",
  "Cruise control adaptativo",
  "Estofos em pele",
  "Escape desportivo",
  "Faróis LED",
  "Faróis matriciais",
  "Head-up display",
  "Jantes de liga leve",
  "Keyless entry",
  "Navegação GPS",
  "Portão elétrico",
  "Sensor de chuva",
  "Sensor de luzes",
  "Sensores de estacionamento",
  "Suspensão adaptativa",
  "Teto de abrir",
  "Teto panorâmico",
  "Travões de cerâmica",
  "Volante aquecido",
];

// Minúsculas sem acentos — usado apenas para comparar valores.
const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

/**
 * Primeira letra de cada palavra em maiúscula e as restantes em minúscula.
 * Ex.: "preto safira" → "Preto Safira"; "AZUL-MARINHO" → "Azul-Marinho".
 */
export function capitalizeWords(value: string): string {
  return value
    .toLocaleLowerCase("pt-PT")
    .replace(/(^|[\s\-/(])(\p{L})/gu, (_match, prefix: string, letter: string) => `${prefix}${letter.toLocaleUpperCase("pt-PT")}`);
}

/** Junta valores por omissão com os existentes, sem repetições e por ordem alfabética. */
export function mergeOptions(defaults: string[], existing: string[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const raw of [...defaults, ...existing]) {
    const value = capitalizeWords(raw.trim());
    if (!value) continue;
    const key = fold(value);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(value);
  }
  return merged.sort((a, b) => a.localeCompare(b, "pt"));
}

export type VehicleCountry = { code: string; name: string };

// Países usados na importação de viaturas. A lista aparece como
// "Alemanha - DE"; a base de dados guarda sempre o código (DE).
export const VEHICLE_COUNTRIES: VehicleCountry[] = [
  { code: "DE", name: "Alemanha" },
  { code: "AT", name: "Áustria" },
  { code: "BE", name: "Bélgica" },
  { code: "BG", name: "Bulgária" },
  { code: "CA", name: "Canadá" },
  { code: "CZ", name: "República Checa" },
  { code: "CY", name: "Chipre" },
  { code: "HR", name: "Croácia" },
  { code: "DK", name: "Dinamarca" },
  { code: "AE", name: "Emirados Árabes Unidos" },
  { code: "SK", name: "Eslováquia" },
  { code: "SI", name: "Eslovénia" },
  { code: "ES", name: "Espanha" },
  { code: "US", name: "Estados Unidos" },
  { code: "EE", name: "Estónia" },
  { code: "FI", name: "Finlândia" },
  { code: "FR", name: "França" },
  { code: "GR", name: "Grécia" },
  { code: "NL", name: "Países Baixos" },
  { code: "HU", name: "Hungria" },
  { code: "IE", name: "Irlanda" },
  { code: "IT", name: "Itália" },
  { code: "JP", name: "Japão" },
  { code: "LV", name: "Letónia" },
  { code: "LT", name: "Lituânia" },
  { code: "LU", name: "Luxemburgo" },
  { code: "MT", name: "Malta" },
  { code: "NO", name: "Noruega" },
  { code: "PL", name: "Polónia" },
  { code: "PT", name: "Portugal" },
  { code: "GB", name: "Reino Unido" },
  { code: "RO", name: "Roménia" },
  { code: "SE", name: "Suécia" },
  { code: "CH", name: "Suíça" },
];

/** Opções do datalist, no formato "Alemanha - DE". */
export const COUNTRY_OPTIONS = VEHICLE_COUNTRIES.map((country) => `${country.name} - ${country.code}`);

/** Converte um código guardado na BD ("DE") no texto da lista ("Alemanha - DE"). */
export function countryLabel(value: string | null | undefined): string {
  const raw = (value || "").trim();
  if (!raw) return "";
  const match = VEHICLE_COUNTRIES.find((country) => fold(country.code) === fold(raw) || fold(country.name) === fold(raw));
  return match ? `${match.name} - ${match.code}` : raw;
}

/**
 * Aceita "DE", "de", "Alemanha", "alemanha" ou "Alemanha - DE" e devolve
 * sempre o código ("DE"). Valores desconhecidos ficam em maiúsculas.
 */
export function resolveCountryCode(value: string): string {
  const raw = value.trim();
  if (!raw) return "";

  const folded = fold(raw);
  const direct = VEHICLE_COUNTRIES.find(
    (country) => fold(country.code) === folded || fold(country.name) === folded || fold(`${country.name} - ${country.code}`) === folded
  );
  if (direct) return direct.code;

  const suffix = folded.match(/(?:^|\s-\s)([a-z]{2})$/);
  if (suffix) {
    const byCode = VEHICLE_COUNTRIES.find((country) => fold(country.code) === suffix[1]);
    if (byCode) return byCode.code;
  }

  return raw.toUpperCase();
}

/**
 * Texto a mostrar no campo depois de sair do foco: se o valor corresponder a
 * um país conhecido, mostra "Alemanha - DE"; caso contrário mantém o que o
 * utilizador escreveu (para não estragar valores ainda incompletos).
 */
export function countryInputLabel(value: string): string {
  const code = resolveCountryCode(value);
  const known = VEHICLE_COUNTRIES.some((country) => country.code === code);
  return known ? countryLabel(code) : value.trim();
}

// Motor no formato X.X (ex.: 2.0) — uma casa antes e uma depois do ponto.
export const ENGINE_PATTERN = /^\d\.\d$/;

/** Máscara do campo motor: só aceita o formato X.X. */
export function maskEngineValue(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned.slice(0, 1);

  const integerPart = cleaned.slice(0, firstDot).slice(0, 1);
  const decimalPart = cleaned.slice(firstDot + 1).replace(/\./g, "").slice(0, 1);
  return `${integerPart}.${decimalPart}`;
}

/** Motor vazio é válido (campo opcional); preenchido tem de ser X.X. */
export function isEngineValid(value: string): boolean {
  const raw = value.trim();
  return raw === "" || ENGINE_PATTERN.test(raw);
}
