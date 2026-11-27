import { describe, expect, it } from "vitest";
import { capitalizeWords, countryInputLabel, countryLabel, isEngineValid, maskEngineValue, mergeOptions, resolveCountryCode } from "../../lib/vehicle-options";

describe("opções de viaturas", () => {
  it("capitaliza palavras com acentos, hífen e parênteses", () => expect(capitalizeWords("  AZUL-marinho (pele preta)")).toBe("  Azul-Marinho (Pele Preta)"));
  it("combina opções ignorando duplicados por acento e caixa", () => expect(mergeOptions(["Preto", "Azul"], [" preto ", "azul-marinho", ""])).toEqual(["Azul", "Azul-Marinho", "Preto"]));
  it("resolve país por código, nome, etiqueta e preserva desconhecidos", () => {
    expect(countryLabel(" de ")).toBe("Alemanha - DE");
    expect(countryLabel(" ")).toBe("");
    expect(countryLabel("XX")).toBe("XX");
    expect(resolveCountryCode("alemanha")).toBe("DE");
    expect(resolveCountryCode("Alemanha - DE")).toBe("DE");
    expect(resolveCountryCode("xx")).toBe("XX");
    expect(resolveCountryCode("")).toBe("");
    expect(countryInputLabel("PT")).toBe("Portugal - PT");
    expect(countryInputLabel("República Checa")).toBe("República Checa - CZ");
    expect(countryInputLabel("desconhecido")).toBe("desconhecido");
  });
  it("aplica máscara X.X ao motor e valida vazio como opcional", () => {
    expect(maskEngineValue("2.0cc")).toBe("2.0");
    expect(maskEngineValue("20")).toBe("2");
    expect(maskEngineValue("2..05")).toBe("2.0");
    expect(maskEngineValue("abc")).toBe("");
    expect(isEngineValid("")).toBe(true);
    expect(isEngineValid("1.6")).toBe(true);
    expect(isEngineValid("12.0")).toBe(false);
  });
});
