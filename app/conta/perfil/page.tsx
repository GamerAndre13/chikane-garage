"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { FavoritesList } from "@/components/ui/favorites-list";
import { MyRequests } from "@/components/ui/my-requests";
import { uploadAvatar } from "@/app/actions/upload";

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

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/conta"); return; }

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email, phone, avatar_url")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Erro ao carregar perfil:", error.message);
        setProfile({ full_name: "", email: user.email || "", phone: "", avatar_url: "" });
        return;
      }

      setProfile({
        full_name: data.full_name || "",
        email: data.email || user.email || "",
        phone: data.phone || "",
        avatar_url: data.avatar_url || "",
      });
    } catch (err) {
      console.error("Erro:", err);
    } finally {
      setLoading(false);
    }
  }

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
        setProfile(prev => ({ ...prev, avatar_url: newUrl }));
        setSuccess("Foto atualizada!");
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
                    <div className="w-full h-full rounded-full bg-copper/20 flex items-center justify-center">
                      <span className="font-display text-4xl text-copper">
                        {profile.full_name?.charAt(0).toUpperCase() || profile.email?.charAt(0).toUpperCase() || "U"}
                      </span>
                    </div>
                  )}
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

          <section className="border border-red/30 bg-red/5 p-6">
            <h2 className="font-display text-lg uppercase tracking-wide text-red mb-4">Zona de Perigo</h2>
            <p className="text-xs text-red-light mb-4">Eliminar a tua conta é irreversível.</p>
            <button type="button" className="border border-red px-4 py-2 font-display text-xs uppercase tracking-widest text-red hover:bg-red hover:text-background transition-colors w-full"
              onClick={() => { if (confirm("Tens a certeza?")) alert("A implementar"); }}>
              Eliminar Conta
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
