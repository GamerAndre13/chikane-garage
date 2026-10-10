"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { FavoritesList } from "@/components/ui/favorites-list";
import { MyRequests } from "@/components/ui/my-requests";
import { pickFromPool } from "@/lib/avatar-pool";
import { uploadAvatar } from "@/app/actions/upload";

// Mensagem clara quando a base de dados ainda não tem a coluna/ativação necessária.
function friendlyDbError(msg: string): string {
  const low = (msg || "").toLowerCase();
  if (
    low.includes("deletion_requested_at") ||
    low.includes("schema cache") ||
    low.includes("pgrst205") ||
    low.includes("row-level security") ||
    low.includes("request_account_deletion") ||
    low.includes("cancel_account_deletion")
  ) {
    return "A funcionalidade ainda não está ativa na base de dados. Executa a migration 013 no SQL Editor do Supabase e tenta novamente.";
  }
  return msg || "Erro ao guardar o pedido. Tenta novamente.";
}

export default function PerfilPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    phone: "",
    avatar_url: "",
  });

  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [settings, setSettings] = useState<{ avatar_pool?: string | null } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [requestingDelete, setRequestingDelete] = useState(false);
  const [deletionRequested, setDeletionRequested] = useState(false);
  const [cancellingDelete, setCancellingDelete] = useState(false);

  const loadProfileInternal = async (user: { id: string; email?: string | null }) => {
    setLoading(true);
    try {
      setUser({ id: user.id, email: user.email || "" });

      const [profileRes, settingsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, email, phone, avatar_url, deletion_requested_at")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("site_settings").select("avatar_pool").limit(1).maybeSingle(),
      ]);

      if (profileRes.data) {
        const p = profileRes.data as { full_name: string | null; email: string | null; phone: string | null; avatar_url: string | null; deletion_requested_at: string | null };
        setProfile({
          full_name: p.full_name || "",
          email: p.email || user.email || "",
          phone: p.phone || "",
          avatar_url: p.avatar_url || "",
        });
        setDeletionRequested(!!p.deletion_requested_at);
      } else {
        setProfile({ full_name: "", email: user.email || "", phone: "", avatar_url: "" });
        setDeletionRequested(false);
      }

      if (settingsRes.data) {
        setSettings({ avatar_pool: (settingsRes.data as { avatar_pool: string | null }).avatar_pool });
      } else {
        setSettings(null);
      }
    } catch (err) {
      console.error("Erro:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { router.push("/conta"); return; }
      const cu = { id: u.user.id, email: u.user.email || "" };
      setUser(cu);
      await loadProfileInternal(cu);
    };
    run();
  }, [router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const full_name = formData.get("full_name") as string;
    const phone = formData.get("phone") as string;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/conta"); return; }

      const { error } = await supabase
        .from("profiles")
        .update({ full_name, phone, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (error) throw error;

      setSuccess("Perfil atualizado com sucesso!");
      setProfile(prev => ({ ...prev, full_name, phone }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao guardar");
    } finally {
      setSaving(false);
    }
  }

  async function requestDeletion() {
    if (!user) return;
    setRequestingDelete(true);
    setError(null);
    setSuccess(null);

    let error: { message: string; code?: string } | null = null;

    // Usa o RPC (fiável e sem dependências de RLS); se a função ainda
    // não existir na BD, tenta o update direto.
    const { error: rpcError } = await supabase.rpc("request_account_deletion");
    if (rpcError && (rpcError.message || "").toLowerCase().includes("request_account_deletion")) {
      const { error: updError } = await supabase
        .from("profiles")
        .update({ deletion_requested_at: new Date().toISOString() })
        .eq("id", user.id);
      error = updError;
    } else if (rpcError) {
      error = rpcError as { message: string };
    }

    setRequestingDelete(false);
    if (error) {
      setError(friendlyDbError(error.message));
      return;
    }
    setDeletionRequested(true);
    setShowDeleteConfirm(false);
    setSuccess("Pedido de eliminação enviado. Está em espera de aprovação por um administrador.");
  }

  async function cancelDeletion() {
    if (!user) return;
    setCancellingDelete(true);
    setError(null);
    setSuccess(null);

    let error: { message: string } | null = null;

    const { error: rpcError } = await supabase.rpc("cancel_account_deletion");
    if (rpcError && (rpcError.message || "").toLowerCase().includes("cancel_account_deletion")) {
      const { error: updError } = await supabase
        .from("profiles")
        .update({ deletion_requested_at: null })
        .eq("id", user.id);
      error = updError ? { message: updError.message } : null;
    } else if (rpcError) {
      error = { message: rpcError.message };
    }

    setCancellingDelete(false);
    if (error) {
      setError(friendlyDbError(error.message));
      return;
    }
    setDeletionRequested(false);
    setSuccess("Pedido de eliminação cancelado.");
  }

  async function handlePasswordChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const newPassword = formData.get("new_password") as string;
    const confirmPassword = formData.get("confirm_password") as string;

    if (newPassword !== confirmPassword) { setError("As passwords não coincidem"); setSaving(false); return; }
    if (newPassword.length < 6) { setError("Minimo 6 caracteres"); setSaving(false); return; }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSuccess("Password alterada com sucesso!");
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar password");
    } finally {
      setSaving(false);
    }
  }

  

  

  

  

  

  

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadAvatar(formData);

      if (result.error) throw new Error(result.error);
      if (result.url) {
        const newUrl = result.url;
        // Forçar avatar sempre aleatório: guardamos a URL subida mas o UI renderiza aleatório? Espere —
        // Utilizador escolheu "sempre aleatória da lista": então não persistimos URL personalizada na UI por defeito.
        // Mas uploadAvatar atualiza BD com a URL. Vamos anular: ao carregar nova foto, mantemos a escolha (subida) mas UI mostrará aleatória? Contraditório.
        // Decisão: se sempre aleatória da lista, ignoramos avatar_url guardado e mostramos pool; upload de foto própria fica desativado ou apenas gerido pela pool?
        // Pedido: "sempre aleatória da lista (Recomendado)" — foto própria não aparece. Então:
        // - Ao fazer uploadAvatar, NÃO atualizamos avatar_url para URL personalizada? Ou limpamos para vazio após? Melhor: não chamar uploadAvatar como avatar de perfil; mas permitir upload para pool (admin) — aqui user não precisa de upload próprio.
        // - No entanto o botão "câmara" existe. Opção: ocultar botão quando modo aleatório? Ou ao upload, limpar avatar_url (forçar aleatório).
        // Implementação: definir avatar_url = '' após upload com sucesso (forçar pool).
        await supabase.from("profiles").update({ avatar_url: "" }).eq("id", (await supabase.auth.getUser()).data.user?.id);
        setProfile(prev => ({ ...prev, avatar_url: "" }));
        setSuccess("Foto adicionada. Com o modo «sempre aleatória da lista», o teu avatar passa a ser escolhido da lista de carros.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar foto");
    } finally {
      setSaving(false);
    }
  }

  

  

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex h-64 items-center justify-center"><p className="text-muted">A carregar...</p></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-16">
        <p className="text-xs uppercase tracking-widest text-copper">BEM-VINDO DE VOLTA</p>
        <h1 className="font-display text-4xl uppercase tracking-wide mt-2">
          {profile.full_name || profile.email?.split("@")[0] || "Utilizador"}
        </h1>
        <p className="mt-2 text-sm text-muted">{profile.email}</p>
      </div>

      {error && <div className="mb-6 border border-red bg-red/10 px-4 py-3 text-sm text-red-light">{error}</div>}
      {success && <div className="mb-6 border border-copper bg-copper/10 px-4 py-3 text-sm text-copper">{success}</div>}

      {/* Layout 2 Colunas */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Esquerda - Definições */}
        <div className="lg:col-span-2 space-y-6">
          <section className="border border-border bg-surface p-6">
            <h2 className="font-display text-lg uppercase tracking-wide text-copper mb-6">Definições</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-start gap-6">
                <div className="relative w-28 h-28 flex-shrink-0">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover border border-border" />
                  ) : (
                    <img src={user?.id ? pickFromPool(user.id, settings?.avatar_pool) || "" : ""} alt="Avatar" className="w-full h-full rounded-full object-cover border border-border" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }} />
                  )}
                  <div className="w-full h-full rounded-full bg-copper/20 flex items-center justify-center hidden">
                    <span className="font-display text-4xl text-copper">
                      {profile.full_name?.charAt(0).toUpperCase() || profile.email?.charAt(0).toUpperCase() || "U"}
                    </span>
                  </div>
                  <label className="absolute bottom-0 right-0 bg-copper p-2 rounded-full cursor-pointer hover:bg-copper/80 transition-colors">
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={saving} className="sr-only" />
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </label>
                </div>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wide text-muted mb-2">Foto de Perfil</p>
                  <p className="text-sm text-muted">Clica na câmara para alterar.</p>
                </div>
              </div>
              <hr className="border-border" />
              <div>
                <label className="block text-xs uppercase tracking-wide text-muted mb-2">Nome *</label>
                <input name="full_name" required defaultValue={profile.full_name} className="w-full border border-border bg-background px-4 py-3 text-sm outline-none focus:border-copper" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-muted mb-2">Email *</label>
                <input type="email" required defaultValue={profile.email} disabled className="w-full border border-border bg-surface-raised px-4 py-3 text-sm outline-none text-muted" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-muted mb-2">Telefone</label>
                <input name="phone" defaultValue={profile.phone} placeholder="+351 9XX XXX XXX" className="w-full border border-border bg-background px-4 py-3 text-sm outline-none focus:border-copper" />
              </div>
              <button type="submit" disabled={saving} className="bg-copper px-8 py-3 font-display text-sm uppercase tracking-widest text-background disabled:opacity-50">
                {saving ? "A guardar..." : "Guardar Alterações"}
              </button>
            </form>
          </section>

          <section className="border border-border bg-surface p-6">
            <h2 className="font-display text-lg uppercase tracking-wide text-copper mb-6">Alterar Password</h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wide text-muted mb-2">Nova Password *</label>
                <input name="new_password" type="password" required minLength={6} className="w-full border border-border bg-background px-4 py-3 text-sm outline-none focus:border-copper" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-muted mb-2">Confirmar Password *</label>
                <input name="confirm_password" type="password" required minLength={6} className="w-full border border-border bg-background px-4 py-3 text-sm outline-none focus:border-copper" />
              </div>
              <button type="submit" disabled={saving} className="border border-border px-8 py-3 font-display text-sm uppercase tracking-widest text-muted hover:border-copper hover:text-foreground disabled:opacity-50">
                {saving ? "A alterar..." : "Alterar Password"}
              </button>
            </form>
          </section>

          {/* Os Teus Pedidos */}
          <section className="border border-border bg-surface p-6">
            <h2 className="font-display text-lg uppercase tracking-wide text-copper mb-4">Os Teus Pedidos</h2>
            <MyRequests />
          </section>
        </div>

        {/* Direita - Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <section className="border border-border bg-surface p-6">
            <h2 className="font-display text-lg uppercase tracking-wide text-copper mb-4">Viaturas Guardadas</h2>
            <FavoritesList />
          </section>

          <section className="border border-border bg-surface p-6">
            <h2 className="font-display text-lg uppercase tracking-wide text-copper mb-4">Zona de Perigo</h2>
            <p className="text-xs text-muted mb-4">Eliminar a tua conta é irreversível.</p>
            <button type="button" className="border border-border px-4 py-2 font-display text-xs uppercase tracking-widest text-muted hover:border-copper hover:text-foreground transition-colors w-full"
              disabled={deletionRequested || requestingDelete}
              onClick={() => setShowDeleteConfirm(true)}>
              {deletionRequested ? "Pedido de eliminação em espera" : "Eliminar Conta"}
            </button>
            {deletionRequested && (
              <button type="button" className="mt-2 border border-border px-4 py-2 font-display text-xs uppercase tracking-widest text-muted hover:border-copper hover:text-foreground transition-colors w-full"
                disabled={cancellingDelete}
                onClick={cancelDeletion}>
                {cancellingDelete ? "A cancelar..." : "Cancelar pedido"}
              </button>
            )}
            {showDeleteConfirm && (
              <div className="mt-3 border border-border bg-surface-raised p-3">
                <p className="text-xs text-muted mb-2">Tens a certeza? Após enviar, o pedido fica em espera até ser aprovado por um administrador.</p>
                <div className="flex gap-2">
                  <button type="button" className="flex-1 border border-border px-3 py-2 font-display text-xs uppercase tracking-widest text-muted hover:bg-red hover:text-background transition-colors"
                    disabled={requestingDelete}
                    onClick={requestDeletion}>
                    {requestingDelete ? "A enviar..." : "Sim, eliminar"}
                  </button>
                  <button type="button" className="flex-1 border border-border px-3 py-2 font-display text-xs uppercase tracking-widest text-muted"
                    onClick={() => setShowDeleteConfirm(false)}>
                    Voltar
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
