import { describe, expect, it } from "vitest";
import { normalizarTelefone, validarEmail, validarMensagem, validarNif, validarNome, validarNumero, validarPassword, validarSlug, validarTelemovel, validarTelemovelPT, validarUrl } from "../../lib/validacao";

describe("validações partilhadas", () => {
  it.each([["912 345 678", true], ["+351 912-345-678", true], ["00351912345678", true], ["212345678", false], ["91234567", false], ["9123456789", false], ["", false]])("valida telemóvel %s", (valor, valido) => expect(validarTelemovelPT(valor)).toBe(valido));
  it("normaliza e respeita obrigatoriedade de telefone", () => {
    expect(normalizarTelefone("(912) 345-678")).toBe("912345678");
    expect(validarTelemovel("", false)).toBeNull();
    expect(validarTelemovel("")).toContain("Indica");
    expect(validarTelemovel("912345678")).toBeNull();
  });
  it.each([["", "Indica o teu nome."], ["A", "O nome deve ter pelo menos 2 caracteres."], [" Ana ", null], ["x".repeat(121), "O nome não pode ter mais de 120 caracteres."]])("valida nome %j", (valor, erro) => expect(validarNome(valor)).toBe(erro));
  it.each([["ana@example.com", null], [" ana@sapo.pt ", null], ["ana@gmail.con", "Quiseste dizer gmail.com? Verifica o email."], ["a@b.c", "O domínio do email parece inválido (ex.: nome@exemplo.com)."], [".ana@example.com", "Introduz um email válido (ex.: nome@exemplo.com)."], ["ana..x@example.com", null], ["", "Introduz o teu email."]])("valida email %j", (valor, erro) => expect(validarEmail(valor)).toBe(erro));
  it.each([["245000003", null], ["245000001", "Indica um NIF válido (9 dígitos)."], ["", "Indica o teu NIF."], ["012345678", "Indica um NIF válido (9 dígitos)."], ["123", "O NIF tem de ter 9 dígitos."]])("valida NIF %j", (valor, erro) => expect(validarNif(valor)).toBe(erro));
  it("valida mensagens nos limites", () => {
    expect(validarMensagem("", 1, 20)).toBe("A mensagem é obrigatória.");
    expect(validarMensagem("a", 2, 20)).toContain("pelo menos 2");
    expect(validarMensagem("ab", 2, 2)).toBeNull();
    expect(validarMensagem("abc", 1, 2)).toContain("mais de 2");
    expect(validarMensagem("", 0, 20)).toBeNull();
  });
  it("valida passwords e números incluindo decimal com vírgula", () => {
    expect(validarPassword("")).toContain("password");
    expect(validarPassword("12345")).toContain("6 caracteres");
    expect(validarPassword("123456")).toBeNull();
    expect(validarNumero("", { rotulo: "Preço", obrigatorio: false })).toBeNull();
    expect(validarNumero("x", { rotulo: "Preço" })).toContain("número");
    expect(validarNumero("1,5", { rotulo: "Preço", min: 1, max: 2 })).toBeNull();
    expect(validarNumero("1,5", { rotulo: "Ano", inteiro: true })).toContain("inteiro");
    expect(validarNumero("0", { rotulo: "Preço", min: 1 })).toContain("inferior");
    expect(validarNumero("3", { rotulo: "Preço", max: 2 })).toContain("superior");
    expect(validarNumero("Infinity", { rotulo: "Preço" })).toContain("número");
  });
  it("aceita URLs web e internas e rejeita protocolos/formatos inválidos", () => {
    expect(validarUrl("", false)).toBeNull();
    expect(validarUrl("", true)).toContain("link");
    expect(validarUrl("/catalogo/bmw")).toBeNull();
    expect(validarUrl("https://example.com")).toBeNull();
    expect(validarUrl("javascript:alert(1)")).toContain("http://");
    expect(validarUrl("nao-url")).toContain("link válido");
  });
  it.each([["bmw-serie-3", null], ["", "O slug é obrigatório."], ["BMW", "O slug só pode ter minúsculas, números e hífenes simples (ex.: bmw-serie-3)."], ["a--b", "O slug só pode ter minúsculas, números e hífenes simples (ex.: bmw-serie-3)."], ["a-b-", "O slug só pode ter minúsculas, números e hífenes simples (ex.: bmw-serie-3)."]])("valida slug %j", (valor, erro) => expect(validarSlug(valor)).toBe(erro));
});
