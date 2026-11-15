import AdminSidebar from "./AdminSidebar";
import { AdminRoleProvider } from "./role-context";
import { createClient } from "@/lib/supabase/server";
import { isStaffRole, type UserRole } from "@/lib/roles";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // O proxy já garante que só a equipa entra; aqui só se lê o cargo para o
  // menu e para esconder ações. Sem sessão fica "user" (nunca mostra menus).
  let role: UserRole = "user";
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (profile?.role && (isStaffRole(profile.role) || profile.role === "user")) {
        role = profile.role as UserRole;
      }
    }
  } catch {
    role = "user";
  }

  return (
    <AdminRoleProvider role={role}>
      <div className="min-h-screen md:flex" style={{ backgroundColor: "var(--background-alt)" }}>
        <AdminSidebar role={role} />
        <div className="min-w-0 flex-1 p-4 pb-16 sm:p-6 lg:p-8" style={{ color: "var(--foreground)" }}>
          {children}
        </div>
      </div>
    </AdminRoleProvider>
  );
}
