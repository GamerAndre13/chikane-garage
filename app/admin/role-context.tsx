"use client";

import { createContext, useContext } from "react";
import type { UserRole } from "@/lib/roles";

// Cargo do utilizador com sessão, disponibilizado pelo layout do backoffice.
// Os ecrãs usam-no para esconder ações que o cargo não pode fazer (a decisão
// final continua a ser do proxy + políticas RLS).
const AdminRoleContext = createContext<UserRole>("user");

export function AdminRoleProvider({ role, children }: { role: UserRole; children: React.ReactNode }) {
  return <AdminRoleContext.Provider value={role}>{children}</AdminRoleContext.Provider>;
}

export function useAdminRole(): UserRole {
  return useContext(AdminRoleContext);
}
