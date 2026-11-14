import { describe, expect, it } from "vitest";
import { isVehiclePubliclyVisible } from "../../lib/vehicle-visibility";

const now = Date.parse("2026-11-14T12:00:00.000Z");

describe("isVehiclePubliclyVisible", () => {
  it("mantém viaturas disponíveis e reservadas visíveis", () => {
    expect(isVehiclePubliclyVisible({ status: "available" }, now)).toBe(true);
    expect(isVehiclePubliclyVisible({ status: "reserved" }, now)).toBe(true);
  });

  it("oculta viaturas arquivadas", () => {
    expect(isVehiclePubliclyVisible({ status: "archived" }, now)).toBe(false);
  });

  it("mantém uma viatura vendida visível antes de completar sete dias", () => {
    expect(isVehiclePubliclyVisible({ status: "sold", sold_at: "2026-11-08T12:00:01.000Z" }, now)).toBe(true);
  });

  it("oculta uma viatura vendida ao completar sete dias", () => {
    expect(isVehiclePubliclyVisible({ status: "sold", sold_at: "2026-11-07T12:00:00.000Z" }, now)).toBe(false);
  });

  it("usa updated_at e depois created_at como datas alternativas", () => {
    expect(isVehiclePubliclyVisible({ status: "sold", updated_at: "2026-11-13T12:00:00.000Z" }, now)).toBe(true);
    expect(isVehiclePubliclyVisible({ status: "sold", created_at: "2026-11-13T12:00:00.000Z" }, now)).toBe(true);
  });

  it("oculta vendas sem data ou com data inválida", () => {
    expect(isVehiclePubliclyVisible({ status: "sold" }, now)).toBe(false);
    expect(isVehiclePubliclyVisible({ status: "sold", sold_at: "data-inválida" }, now)).toBe(false);
  });
});
