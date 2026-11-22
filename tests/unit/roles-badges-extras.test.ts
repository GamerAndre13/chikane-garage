import { afterEach, describe, expect, it, vi } from "vitest";
import { canAccessArea, canManageContent, canManageExtras, canManageSales, canManageVehicles, isStaffRole, ROLE_LABELS, STAFF_ROLES } from "../../lib/roles";
import { isVehicleNovidade, primaryLeftBadge, saleTypeLabel } from "../../lib/vehicle-badges";
import { cheapestVariantFor } from "../../lib/extra-variants";

describe("permissões de cargos", () => {
  it("identifica staff e permissões por área", () => {
    expect(isStaffRole("admin")).toBe(true); expect(isStaffRole("editor")).toBe(true); expect(isStaffRole("sales")).toBe(true); expect(isStaffRole("user")).toBe(false); expect(isStaffRole(null)).toBe(false);
    expect(STAFF_ROLES).toEqual(["admin", "editor", "sales"]); expect(ROLE_LABELS.user).toBe("Cliente");
    for (const area of ["dashboard", "veiculos"] as const) for (const role of ["admin", "editor", "sales"]) expect(canAccessArea(role, area)).toBe(true);
    expect(canAccessArea("user", "dashboard")).toBe(false); expect(canAccessArea(null, "contas")).toBe(false);
    expect(canAccessArea("editor", "campanhas")).toBe(true); expect(canAccessArea("sales", "campanhas")).toBe(false);
    expect(canAccessArea("sales", "extras")).toBe(true); expect(canAccessArea("editor", "extras")).toBe(false);
    expect(canAccessArea("sales", "pedidos")).toBe(true); expect(canAccessArea("editor", "pedidos")).toBe(false);
    expect(canAccessArea("editor", "definicoes")).toBe(true); expect(canAccessArea("sales", "definicoes")).toBe(false);
    expect(canAccessArea("admin", "utilizadores")).toBe(true); expect(canAccessArea("editor", "utilizadores")).toBe(false);
    expect(canManageVehicles("admin")).toBe(true); expect(canManageVehicles("sales")).toBe(true); expect(canManageVehicles("editor")).toBe(false);
    expect(canManageExtras("sales")).toBe(true); expect(canManageExtras("editor")).toBe(false);
    expect(canManageContent("editor")).toBe(true); expect(canManageContent("sales")).toBe(false);
    expect(canManageSales("sales")).toBe(true); expect(canManageSales("editor")).toBe(false);
  });
});

describe("etiquetas de viaturas", () => {
  afterEach(() => vi.useRealTimers());
  it("aplica novidade até quatro dias e exclusões por tipo/estado", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-15T12:00:00Z"));
    expect(isVehicleNovidade({ created_at: "2026-11-11T12:00:00Z" })).toBe(true);
    expect(isVehicleNovidade({ created_at: "2026-11-11T11:59:59Z" })).toBe(false);
    expect(isVehicleNovidade({ sale_type: "new", created_at: "2026-11-15" })).toBe(false);
    expect(isVehicleNovidade({ status: "sold", created_at: "2026-11-15" })).toBe(false);
    expect(isVehicleNovidade({ created_at: "inválida" })).toBe(false);
    expect(isVehicleNovidade({})).toBe(false);
    expect(saleTypeLabel({ sale_type: "new" })).toBe("Novo"); expect(saleTypeLabel({})).toBe("Usado");
    expect(primaryLeftBadge({ created_at: "2026-11-15", status: "reserved" })).toBe("novidade");
    expect(primaryLeftBadge({ status: "reserved" })).toBe("reserved"); expect(primaryLeftBadge({ status: "available" })).toBeNull();
  });
});

describe("variante base de extra", () => {
  const rows = [
    { id: "late", extra_id: "a", name: "Mais tarde", price: 20, position: 1 },
    { id: "cheap", extra_id: "a", name: "Mais barato", price: 10, position: 4 },
    { id: "tie", extra_id: "a", name: "Empate", price: 10, position: 2 },
    { id: "inactive", extra_id: "a", name: "Inativo", price: 1, is_active: false },
    { id: "other", extra_id: "b", name: "Outro", price: 0 },
  ];
  it("escolhe a ativa mais barata, desempata pela posição e trata ausências", () => {
    expect(cheapestVariantFor("a", rows)?.id).toBe("tie"); expect(cheapestVariantFor("b", rows)?.id).toBe("other"); expect(cheapestVariantFor("z", rows)).toBeNull(); expect(cheapestVariantFor("a", [{ ...rows[0], is_active: false }])).toBeNull();
  });
});
