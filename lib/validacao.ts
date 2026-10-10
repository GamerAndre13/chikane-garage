// Validações partilhadas dos formulários do site.

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