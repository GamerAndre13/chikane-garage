// Validações partilhadas dos formulários do site.
// Cada função devolve a mensagem de erro (em pt-PT) ou null quando o valor
// está válido. Os formulários chamam-nas ao sair de cada campo e mostram a
// mensagem por baixo do input, com o rebordo vermelho até ficar válido.

// Remove espaços, hífenes, pontos e parênteses de um número de telefone.
export function normalizarTelefone(phone: string): string {
  return phone.replace(/[\s\-().]/g, "");
}

// Telemóvel português: 9 dígitos a começar por 9 (ex.: 912 345 678).
// Aceita o prefixo internacional +351 / 00351 à frente; devolve false
// para vazios, números fixos ou formatos inválidos.
export function validarTelemovelPT(phone: string): boolean {
  const limpo = normalizarTelefone(phone);
  const semPrefixo = limpo.replace(/^(?:\+351|00351)/, "");
  return /^9\d{8}$/.test(semPrefixo);
}

/** Nome de pessoa: 2 a 120 caracteres (depois de retirar espaços). */
export function validarNome(valor: string): string | null {
  const nome = valor.trim();
  if (!nome) return "Indica o teu nome.";
  if (nome.length < 2) return "O nome deve ter pelo menos 2 caracteres.";
  if (nome.length > 120) return "O nome não pode ter mais de 120 caracteres.";
  return null;
}

/**
 * Email: formato geral + domínio plausível. Detecta também os enganos mais
 * comuns (gmail.con, hotmail.co, …) e sugere o domínio certo.
 */
export function validarEmail(valor: string): string | null {
  const email = valor.trim();
  if (!email) return "Introduz o teu email.";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) === false) {
    return "Introduz um email válido (ex.: nome@exemplo.com).";
  }
  const [local, domain] = email.split("@");
  if (!local || !domain) return "Introduz um email válido (ex.: nome@exemplo.com).";
  if (domain.includes("..") || local.startsWith(".") || local.endsWith(".")) {
    return "Introduz um email válido (ex.: nome@exemplo.com).";
  }
  const tld = domain.split(".").pop() || "";
  if (tld.length < 2) {
    return "O domínio do email parece inválido (ex.: nome@exemplo.com).";
  }
  const comuns = ["gmail.com", "hotmail.com", "outlook.com", "sapo.pt", "yahoo.com", "icloud.com", "live.com", "hotmail.pt"];
  const sugestoes: Record<string, string> = {
    "gmail.con": "gmail.com",
    "gmail.co": "gmail.com",
    "gmial.com": "gmail.com",
    "gmai.com": "gmail.com",
    "hotmail.con": "hotmail.com",
    "hotmail.co": "hotmail.com",
    "outlok.com": "outlook.com",
    "outlook.con": "outlook.com",
  };
  if (sugestoes[domain]) {
    return `Quiseste dizer ${sugestoes[domain]}? Verifica o email.`;
  }
  if (comuns.includes(domain)) return null;
  if (!/^[a-z]{2,}$/.test(tld)) return "O domínio do email parece inválido.";
  return null;
}

/** Telemóvel português. Com `obrigatorio: false` o vazio é válido. */
export function validarTelemovel(valor: string, obrigatorio = true): string | null {
  const telemovel = valor.trim();
  if (!telemovel) return obrigatorio ? "Indica o teu telemóvel." : null;
  return validarTelemovelPT(telemovel)
    ? null
    : "Indica um telemóvel português válido (9 dígitos, começa por 9).";
}

/** NIF português: 9 dígitos e dígito de controlo (mod 11). */
export function validarNif(valor: string): string | null {
  const nif = valor.replace(/[\s.]/g, "");
  if (!nif) return "Indica o teu NIF.";
  if (!/^\d{9}$/.test(nif)) return "O NIF tem de ter 9 dígitos.";
  if (!"1235689".includes(nif[0])) return "Indica um NIF válido (9 dígitos).";
  let soma = 0;
  for (let i = 0; i < 8; i += 1) soma += Number(nif[i]) * (9 - i);
  const check = 11 - (soma % 11);
  const digito = check >= 10 ? 0 : check;
  return digito === Number(nif[8]) ? null : "Indica um NIF válido (9 dígitos).";
}

/** Texto livre com limites de comprimento. */
export function validarMensagem(
  valor: string,
  minimo: number,
  maximo: number,
  rotulo = "A mensagem"
): string | null {
  const texto = valor.trim();
  if (minimo > 0 && !texto) return `${rotulo} é obrigatória.`;
  if (texto.length < minimo) return `${rotulo} deve ter pelo menos ${minimo} caracteres.`;
  if (texto.length > maximo) return `${rotulo} não pode ter mais de ${maximo} caracteres.`;
  return null;
}

/** Password com um comprimento mínimo (6 por omissão). */
export function validarPassword(valor: string, minimo = 6): string | null {
  if (!valor) return "Introduz uma password.";
  if (valor.length < minimo) return `A password deve ter pelo menos ${minimo} caracteres.`;
  return null;
}

type OpcoesNumero = {
  rotulo: string;
  min?: number;
  max?: number;
  inteiro?: boolean;
  /** Obrigatório por omissão; com false o campo vazio é válido. */
  obrigatorio?: boolean;
};

/**
 * Campo numérico (preços, quilómetros, anos, ordem…). Aceita vírgula decimal.
 * Devolve a mensagem com o rótulo indicado (ex.: "O preço").
 */
export function validarNumero(valor: string, opcoes: OpcoesNumero): string | null {
  const { rotulo, min, max, inteiro = false, obrigatorio = true } = opcoes;
  const texto = valor.trim();
  if (!texto) return obrigatorio ? `${rotulo} é obrigatório.` : null;
  const numero = Number(texto.replace(",", "."));
  if (!Number.isFinite(numero)) return `${rotulo} tem de ser um número.`;
  if (inteiro && !Number.isInteger(numero)) return `${rotulo} tem de ser um número inteiro.`;
  if (min != null && numero < min) return `${rotulo} não pode ser inferior a ${min}.`;
  if (max != null && numero > max) return `${rotulo} não pode ser superior a ${max}.`;
  return null;
}

/** URL http(s) válido (ou caminho interno começado por "/"). */
export function validarUrl(valor: string, obrigatorio = false): string | null {
  const url = valor.trim();
  if (!url) return obrigatorio ? "Indica um link." : null;
  if (url.startsWith("/")) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? null
      : "O link tem de começar por http:// ou https://.";
  } catch {
    return "Indica um link válido (ex.: https://exemplo.com).";
  }
}

/** Slug de URL: minúsculas, números e hífenes. */
export function validarSlug(valor: string): string | null {
  const slug = valor.trim();
  if (!slug) return "O slug é obrigatório.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return "O slug só pode ter minúsculas, números e hífenes simples (ex.: bmw-serie-3).";
  }
  return null;
}
