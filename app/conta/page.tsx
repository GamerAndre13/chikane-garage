"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Suspense } from "react";

function ContaPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Se já estiver logado, vai para o perfil
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace("/conta/perfil");
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("full_name") as string;

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(redirect);
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;

        if (data.user && !data.session) {
          setError("Verifica o teu email para confirmar a conta.");
          setMode("login");
        } else {
          router.push(redirect);
          router.refresh();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl uppercase tracking-wide">
        {mode === "login" ? "Entrar" : "Criar Conta"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {mode === "login" ? "Acede à tua conta Chikane Garage." : "Regista-te para gerires a tua conta."}
      </p>

      {error && (
        <div className="mt-4 border border-red bg-red/10 px-4 py-3 text-sm text-red-light">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {mode === "register" && (
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted">Nome completo *</label>
            <input name="full_name" required className="mt-1 w-full border border-border bg-background px-4 py-3 text-sm outline-none focus:border-copper" />
          </div>
        )}
        <div>
          <label className="block text-xs uppercase tracking-wide text-muted">Email *</label>
          <input name="email" type="email" required className="mt-1 w-full border border-border bg-background px-4 py-3 text-sm outline-none focus:border-copper" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-muted">Password *</label>
          <input name="password" type="password" required minLength={6} className="mt-1 w-full border border-border bg-background px-4 py-3 text-sm outline-none focus:border-copper" />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-copper px-6 py-3 font-display text-sm uppercase tracking-widest text-background disabled:opacity-50">
          {loading ? "A processar..." : mode === "login" ? "Entrar" : "Criar Conta"}
        </button>
      </form>

      <button onClick={() => setMode(mode === "login" ? "register" : "login")} className="mt-6 text-center text-sm text-muted hover:text-copper transition-colors">
        {mode === "login" ? "Ainda não tens conta? Regista-te" : "Já tens conta? Entra"}
      </button>
    </div>
  );
}

export default function ContaPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><p className="text-muted">A carregar...</p></div>}>
      <ContaPageContent />
    </Suspense>
  );
}
