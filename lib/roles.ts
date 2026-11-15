// ── Cargos do backoffice ──────────────────────────────────────────────────
// Três níveis de acesso (item 7), além do cliente comum:
//   admin  — tudo (viaturas, extras, campanhas, pedidos, propostas, contas,
//            definições) e gestão de quem tem acesso ao backoffice;
//   editor — campanhas e definições do site; viaturas e extras só leitura;
//   sales  — pedidos/reservas, propostas e extras; viaturas só leitura.
// As mesmas regras estão nas políticas RLS (supabase/035_roles_backoffice.sql).

export type UserRole = "user" | "editor" | "sales" | "admin";

/** Áreas do backoffice usadas pelo menu e pelo proxy. */
export type AdminArea = "dashboard" | "veiculos" | "extras" | "campanhas" | "pedidos" | "propostas" | "contas" | "definicoes" | "utilizadores";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  editor: "Editor",
  sales: "Gestor de vendas",
  user: "Cliente",
};

export const STAFF_ROLES: UserRole[] = ["admin", "editor", "sales"];

export function isStaffRole(role: string | null | undefined): role is "admin" | "editor" | "sales" {
  return role === "admin" || role === "editor" || role === "sales";
}

const AREA_ROLES: Record<AdminArea, UserRole[]> = {
  dashboard: ["admin", "editor", "sales"],
  veiculos: ["admin", "editor", "sales"],
  extras: ["admin", "sales"],
  campanhas: ["admin", "editor"],
  pedidos: ["admin", "sales"],
  propostas: ["admin", "sales"],
  contas: ["admin"],
  definicoes: ["admin", "editor"],
  utilizadores: ["admin"],
};

/** O cargo pode abrir a área? (só serve para esconder/bloquear ecrãs) */
export function canAccessArea(role: string | null | undefined, area: AdminArea): boolean {
  return AREA_ROLES[area].includes((role ?? "user") as UserRole);
}

/** Editor e gestor de vendas só consultam viaturas; criar/editar é do admin. */
export function canManageVehicles(role: string | null | undefined): boolean {
  return role === "admin";
}

/** Extras: admin e gestor de vendas. */
export function canManageExtras(role: string | null | undefined): boolean {
  return role === "admin" || role === "sales";
}

/** Conteúdo do site e campanhas: admin e editor. */
export function canManageContent(role: string | null | undefined): boolean {
  return role === "admin" || role === "editor";
}

/** Pedidos, propostas e reservas: admin e gestor de vendas. */
export function canManageSales(role: string | null | undefined): boolean {
  return role === "admin" || role === "sales";
}
