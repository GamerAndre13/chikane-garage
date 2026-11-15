"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useDialogs } from "@/components/ui/dialogs";
import { useToast } from "@/components/ui/toast";
import { ROLE_LABELS, type UserRole } from "@/lib/roles";

// Lista de todos os utilizadores do site e atribuição de cargos (item 7).
// Só o admin abre esta página (proxy + menu) e só ele pode alterar o cargo
// (política profiles_update_admin em supabase/035_roles_backoffice.sql).

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  created_at: string | null;
};

const ROLE_OPTIONS: UserRole[] = ["user", "editor", "sales", "admin"];

// Descrição curta do que cada cargo pode fazer (ajuda a escolher no seletor).
const ROLE_HINTS: Record<UserRole, string> = {
  user: "Cliente — sem acesso ao backoffice.",
  editor: "Editor — campanhas e conteúdo do site.",
  sales: "Gestor de vendas — pedidos, propostas e extras.",
  admin: "Administrador — acesso total e gestão de cargos.",
};

export default function UtilizadoresPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { confirmar, mostrarErro } = useDialogs();
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: rows }, { data: auth }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, email, full_name, phone, role, created_at")
          .order("created_at", { ascending: false }),
        supabase.auth.getUser(),
      ]);
      if (cancelled) return;
      setProfiles((rows ?? []) as Profile[]);
      setCurrentUserId(auth?.user?.id ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visiveis = useMemo(() => {
    const termo = search.trim().toLowerCase();
    return profiles.filter((profile) => {
      const correspondeTexto =
        !termo ||
        `${profile.full_name || ""} ${profile.email || ""}`.toLowerCase().includes(termo) ||
        String(profile.phone || "").includes(termo);
      const correspondeCargo = roleFilter === "all" || (profile.role ?? "user") === roleFilter;
      return correspondeTexto && correspondeCargo;
    });
  }, [profiles, search, roleFilter]);

  const alterarCargo = async (profile: Profile, novoCargo: UserRole) => {
    const cargoAtual = (profile.role ?? "user") as UserRole;
    if (novoCargo === cargoAtual) return;

    // O próprio cargo nunca é alterado aqui (ficaria sem acesso ao backoffice).
    // O seletor da própria linha nem aparece, mas o guarda fica por segurança.
    if (profile.id === currentUserId) {
      mostrarErro({
        titulo: "Não é possível alterar",
        mensagem: "Não podes alterar o teu próprio cargo. Pede a outro administrador que o faça.",
      });
      return;
    }

    const ok = await confirmar({
      titulo: "Alterar cargo",
      mensagem: `Passar ${profile.full_name || profile.email} de «${ROLE_LABELS[cargoAtual]}» para «${ROLE_LABELS[novoCargo]}»?`,
      confirmar: "Alterar",
    });
    if (!ok) return;

    setUpdating(profile.id);
    const { error } = await supabase.from("profiles").update({ role: novoCargo }).eq("id", profile.id);
    setUpdating(null);
    if (error) {
      mostrarErro({ titulo: "Cargo não alterado", mensagem: error.message });
      return;
    }
    setProfiles((prev) => prev.map((item) => (item.id === profile.id ? { ...item, role: novoCargo } : item)));
    toast({ variant: "success", title: "Cargo atualizado", description: `${profile.email} · ${ROLE_LABELS[novoCargo]}` });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p style={{ color: "var(--muted)" }}>A carregar...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1
          className="text-2xl uppercase tracking-wide"
          style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
        >
          Utilizadores
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Todos os clientes registados no site. Atribui cargos para dar acesso ao backoffice.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por nome, email ou telefone"
          className="min-h-11 w-full px-3 py-2 text-sm border rounded bg-background sm:w-auto"
          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="min-h-11 w-full px-3 py-2 text-sm border rounded bg-background sm:w-auto"
          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
        >
          <option value="all">Todos os cargos</option>
          {ROLE_OPTIONS.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
        <div className="ml-auto text-xs" style={{ color: "var(--muted)" }}>
          {visiveis.length} de {profiles.length} utilizadores
        </div>
      </div>

      <div className="md:overflow-hidden md:rounded md:border" style={{ borderColor: "var(--border)" }}>
        <table className="admin-table w-full text-sm" style={{ backgroundColor: "var(--surface-mid)" }}>
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border)" }}>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Nome</th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Email</th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Cargo</th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Registo</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((profile) => {
              const cargo = (profile.role ?? "user") as UserRole;
              const registo = profile.created_at ? new Date(profile.created_at).toLocaleDateString("pt-PT") : "—";
              return (
                <tr key={profile.id} className="border-b" style={{ borderColor: "var(--border)" }}>
                  <td data-label="Nome" className="px-4 py-3" style={{ color: "var(--foreground)" }}>
                    <span className="block truncate">{profile.full_name || "Sem nome"}</span>
                    {profile.phone ? (
                      <span className="block text-xs" style={{ color: "var(--muted)" }}>{profile.phone}</span>
                    ) : null}
                    {profile.id === currentUserId && (
                      <span className="mt-1 inline-flex rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide" style={{ border: "1px solid var(--copper-deep)", color: "var(--copper-deep)" }}>
                        Tu
                      </span>
                    )}
                  </td>
                  <td data-label="Email" className="px-4 py-3" style={{ color: "var(--foreground)" }}>
                    {profile.email}
                  </td>
                  <td data-label="Cargo" className="px-4 py-3">
                    {profile.id === currentUserId ? (
                      // O próprio cargo fica só leitura: um admin não se pode
                      // despromover (ficaria sem acesso ao backoffice). Tem de
                      // ser outro administrador a fazê-lo.
                      <div className="flex flex-col gap-1">
                        <span
                          className="inline-flex w-fit items-center gap-1.5 rounded px-2 py-1 text-xs font-medium"
                          style={{
                            backgroundColor: "var(--background-alt)",
                            color: "var(--foreground)",
                            border: "1px solid var(--border)",
                          }}
                          title="O teu cargo só pode ser alterado por outro administrador."
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="3" y="11" width="18" height="11" rx="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                          {ROLE_LABELS[cargo]}
                        </span>
                        <span className="text-[10px] leading-tight" style={{ color: "var(--muted)" }}>
                          Só outro administrador pode alterar
                        </span>
                      </div>
                    ) : (
                      <select
                        value={cargo}
                        onChange={(e) => alterarCargo(profile, e.target.value as UserRole)}
                        disabled={updating === profile.id}
                        aria-label={`Cargo de ${profile.email}`}
                        title={ROLE_HINTS[cargo]}
                        className="min-h-11 rounded px-2 py-1 text-xs font-medium md:min-h-0"
                        style={{
                          backgroundColor: "var(--background-alt)",
                          color: "var(--foreground)",
                          border: "1px solid var(--border)",
                          cursor: updating === profile.id ? "not-allowed" : "pointer",
                        }}
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td data-label="Registo" className="px-4 py-3 text-xs" style={{ color: "var(--muted)" }}>
                    {registo}
                  </td>
                </tr>
              );
            })}
            {visiveis.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center" style={{ color: "var(--muted)" }}>
                  Nenhum utilizador encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4" style={{ color: "var(--muted)" }}>
        {ROLE_OPTIONS.map((role) => (
          <p key={role} className="rounded border px-3 py-2" style={{ borderColor: "var(--border)" }}>
            <strong style={{ color: "var(--foreground)" }}>{ROLE_LABELS[role]}</strong> — {ROLE_HINTS[role]}
          </p>
        ))}
      </div>
    </div>
  );
}
