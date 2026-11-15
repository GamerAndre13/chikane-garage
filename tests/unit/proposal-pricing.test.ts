import { describe, expect, it } from "vitest";
import {
  calcularTotaisProposta,
  DISCOUNT_SCOPE_LABELS,
  limiteDesconto,
  normalizarAmbito,
} from "../../lib/proposal-pricing";

// Proposta: viatura 20 000 €, extras 2 000 €, desconto 1 000 €, legalização 500 €.
const base = { basePrice: 20000, extrasTotal: 2000, discount: 1000, legalization: 500 };

describe("totais da proposta por âmbito do desconto", () => {
  it("desconta no total por omissão", () => {
    const t = calcularTotaisProposta({ ...base, scope: "total" });
    expect(t.totalPrice).toBe(22000);
    expect(t.appliedDiscount).toBe(1000);
    expect(t.finalPrice).toBe(21500); // 22 000 − 1 000 + 500
  });

  it("desconta apenas nos extras", () => {
    const t = calcularTotaisProposta({ ...base, scope: "extras" });
    expect(t.appliedDiscount).toBe(1000);
    expect(t.finalPrice).toBe(21500); // 20 000 + 1 000 + 500
  });

  it("desconta apenas na viatura", () => {
    const t = calcularTotaisProposta({ ...base, scope: "vehicle" });
    expect(t.appliedDiscount).toBe(1000);
    expect(t.finalPrice).toBe(21500); // 19 000 + 2 000 + 500
  });

  it("nunca desconta mais do que o valor onde incide", () => {
    const t = calcularTotaisProposta({ basePrice: 20000, extrasTotal: 300, discount: 1000, legalization: 0, scope: "extras" });
    expect(t.appliedDiscount).toBe(300);
    expect(t.finalPrice).toBe(20000);
    const u = calcularTotaisProposta({ basePrice: 800, extrasTotal: 0, discount: 1000, legalization: 0, scope: "vehicle" });
    expect(u.appliedDiscount).toBe(800);
    expect(u.finalPrice).toBe(0);
    const v = calcularTotaisProposta({ basePrice: 500, extrasTotal: 200, discount: 900, legalization: 100, scope: "total" });
    expect(v.appliedDiscount).toBe(700);
    expect(v.finalPrice).toBe(100); // a legalização não é descontada
  });

  it("sem preço base não há total", () => {
    const t = calcularTotaisProposta({ basePrice: null, extrasTotal: 200, discount: 10, legalization: 0, scope: "total" });
    expect(t.totalPrice).toBeNull();
    expect(t.finalPrice).toBeNull();
  });

  it("normaliza âmbitos inválidos e expõe o limite do desconto", () => {
    expect(normalizarAmbito("extras")).toBe("extras");
    expect(normalizarAmbito("vehicle")).toBe("vehicle");
    expect(normalizarAmbito(null)).toBe("total");
    expect(normalizarAmbito("outro")).toBe("total");
    expect(DISCOUNT_SCOPE_LABELS.total).toBe("Total da proposta");
    expect(limiteDesconto({ basePrice: 20000, extrasTotal: 2000, scope: "total" })).toBe(22000);
    expect(limiteDesconto({ basePrice: 20000, extrasTotal: 2000, scope: "extras" })).toBe(2000);
    expect(limiteDesconto({ basePrice: 20000, extrasTotal: 2000, scope: "vehicle" })).toBe(20000);
    expect(limiteDesconto({ basePrice: null, extrasTotal: 2000, scope: "total" })).toBeNull();
  });
});
