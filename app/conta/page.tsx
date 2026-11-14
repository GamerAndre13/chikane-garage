"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, setRememberPreference } from "@/lib/supabase/client";
import { Suspense } from "react";
import { clearAttempts, getLockRemaining, registerFailedAttempt } from "@/lib/login-attempts";
import { validarEmail, validarNome, validarPassword } from "@/lib/validacao";
import { FieldError, campoClasse } from "@/components/ui/field-error";
import { scrollParaFeedback } from "@/lib/scroll-feedback";

// Converte erros da API de autenticação em mensagens amigáveis em português,
// sem expor detalhes técnicos do Supabase ao utilizador.
function friendlyAuthError(msg: string): string {
  const low = msg.toLowerCase();
  if (low.includes("invalid login credentials")) return "Email ou password incorretos. Verifica e tenta novamente.";
  if (low.includes("email not confirmed") || low.includes("email_not_confirmed")) return "Ainda não confirmaste o email. Vê a caixa de entrada (e o spam).";
  if (low.includes("already registered")) return "Já existe uma conta com este email. Entra ou faz reset da password.";
  if (low.includes("rate limit") || low.includes("too many requests")) return "Demasiadas tentativas. Espera um pouco e tenta novamente.";
  if (low.includes("password should be at least")) return "A password deve ter pelo menos 6 caracteres.";
  if (low.includes("unable to validate email")) return "O endereço de email parece inválido.";
  if (low.includes("chikane-garage.blog") || low.includes("chikanegarage") || low.includes("smtp") || low.includes("failed to fetch") || low.includes("network")) return "Não foi possível completar o pedido. Tenta novamente em instantes.";
  return msg;
}

function ContaPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const authError = searchParams.get("error");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bloqueio temporário após várias tentativas falhadas.
  const [locked, setLocked] = useState(false);
  // Erros por campo (itens 13/14): validados ao sair do campo.
  const [erros, setErros] = useState<Record<string, string | null>>({});

  const calcularErro = (campo: string, valor: string): string | null => {
    if (campo === "full_name") return validarNome(valor);
    if (campo === "email") return validarEmail(valor);
    if (campo === "password") return validarPassword(valor);
    return null;
  };

  const validarCampo = (campo: string, valor: string) => {
    const msg = calcularErro(campo, valor);
    setErros((prev) => ({ ...prev, [campo]: msg }));
    return msg;
  };

  const revalidar = (campo: string, valor: string) => {
    if (!erros[campo]) return;
    const msg = calcularErro(campo, valor);
    setErros((prev) => ({ ...prev, [campo]: msg }));
  };

  const inputCls = "mt-1 w-full border border-border bg-background px-4 py-3 text-sm outline-none focus:border-copper focus-visible:ring-2 focus-visible:ring-copper/60";

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
    const email = ((formData.get("email") as string) || "").trim().toLowerCase();
    const password = formData.get("password") as string;
    const fullName = formData.get("full_name") as string;
    // "Manter sessão iniciada": sem isso os cookies de sessão caem ao fechar o browser
    const remember = formData.get("remember_me") === "on";

    // Validar os campos visíveis antes de tentar criar conta / entrar: os
    // erros ficam por baixo de cada input.
    const campos: Record<string, string | null> = {
      email: calcularErro("email", email),
      password: calcularErro("password", password),
    };
    if (mode === "register") campos.full_name = calcularErro("full_name", fullName || "");
    setErros((prev) => ({ ...prev, ...campos }));
    if (Object.values(campos).some(Boolean)) {
      setError("Confirma os campos assinalados a vermelho.");
      setLoading(false);
      return;
    }

    try {
      if (mode === "login") {
        // Bloqueio local após várias tentativas falhadas.
        if (getLockRemaining(email) > 0) {
          setLocked(true);
          setError("Muitas tentativas. Tenta mais tarde.");
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          const { locked: nowLocked } = registerFailedAttempt(email);
          if (nowLocked) {
            setLocked(true);
            setError("Muitas tentativas. Tenta mais tarde.");
            setLoading(false);
            return;
          }
          throw error;
        }
        clearAttempts(email);
        setLocked(false);
        setRememberPreference(remember);
        router.push(redirect);
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}` },
        });
        if (error) throw error;

        if (data.user && !data.session) {
          // Preferência guardada para quando a conta for confirmada por email
          setRememberPreference(remember);
          setError("Verifica o teu email para confirmar a conta.");
          setMode("login");
        } else {
          setRememberPreference(remember);
          router.push(redirect);
          router.refresh();
        }
      }
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : "Erro desconhecido"));
    } finally {
      setLoading(false);
      // Sobe até à mensagem (erro ou confirmação de email).
      scrollParaFeedback();
    }
  }

  async function handleGoogleLogin() {
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}`,
      },
    });
    if (oauthError) setError(friendlyAuthError(oauthError.message));
  }

  // Erro local (formulário) ou erro devolvido pelo /auth/callback
  const mensagemErro =
    error ?? (authError ? "Falha na autenticação. Tenta novamente." : null);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl uppercase tracking-wide">
        {mode === "login" ? "Entrar" : "Criar Conta"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {mode === "login" ? "Acede à tua conta Chikane Garage." : "Regista-te para gerires a tua conta."}
      </p>

      {mensagemErro && (
        <div id="form-feedback" tabIndex={-1} role="alert" className="mt-4 border border-red bg-red/10 px-4 py-3 text-sm text-red-light outline-none">
          {mensagemErro}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {mode === "register" && (
          <div>
            <label htmlFor="conta-full-name" className="block text-xs uppercase tracking-wide text-muted">Nome completo *</label>
            <input
              id="conta-full-name"
              name="full_name"
              autoComplete="name"
              spellCheck={false}
              required
              aria-invalid={Boolean(erros.full_name)}
              onBlur={(e) => validarCampo("full_name", e.target.value)}
              onChange={(e) => revalidar("full_name", e.target.value)}
              className={campoClasse(inputCls, erros.full_name)}
            />
            <FieldError message={erros.full_name} />
          </div>
        )}
        <div>
          <label htmlFor="conta-email" className="block text-xs uppercase tracking-wide text-muted">Email *</label>
          <input
            id="conta-email"
            name="email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            required
            aria-invalid={Boolean(erros.email)}
            onBlur={(e) => validarCampo("email", e.target.value)}
            onChange={(e) => revalidar("email", e.target.value)}
            className={campoClasse(inputCls, erros.email)}
          />
          <FieldError message={erros.email} />
        </div>
        <div>
          <label htmlFor="conta-password" className="block text-xs uppercase tracking-wide text-muted">Password *</label>
          <input
            id="conta-password"
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={6}
            aria-invalid={Boolean(erros.password)}
            onBlur={(e) => validarCampo("password", e.target.value)}
            onChange={(e) => revalidar("password", e.target.value)}
            className={campoClasse(inputCls, erros.password)}
          />
          <FieldError message={erros.password} />
        </div>
        {mode === "register" && (
          <div className="flex items-center gap-2">
            <input type="checkbox" id="subscribe_newsletter" name="subscribe_newsletter" className="w-4 h-4" defaultChecked />
            <label htmlFor="subscribe_newsletter" className="text-xs text-muted">Subscrever ao newsletter</label>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input type="checkbox" id="remember_me" name="remember_me" className="w-4 h-4" />
          <label htmlFor="remember_me" className="text-xs text-muted">Manter sessão iniciada</label>
        </div>
        <button type="submit" disabled={loading || (mode === "login" && locked)} className="w-full bg-copper px-6 py-3 font-display text-sm uppercase tracking-widest text-background disabled:opacity-50">
          {loading
            ? "A processar…"
            : mode === "login" && locked
              ? "Bloqueado"
              : mode === "login"
                ? "Entrar"
                : "Criar Conta"}
        </button>
      </form>

      <div className="mt-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-muted">ou</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        className="mt-6 flex w-full items-center justify-center gap-3 border border-border bg-background px-6 py-3 text-sm text-silver transition-colors hover:border-copper hover:text-white"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
          <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
        </svg>
        {mode === "login" ? "Entrar com Google" : "Criar conta com Google"}
      </button>

      <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setErros({}); setError(null); }} className="mt-6 text-center text-sm text-muted hover:text-copper transition-colors">
        {mode === "login" ? "Ainda não tens conta? Regista-te" : "Já tens conta? Entra"}
      </button>
    </div>
  );
}

export default function ContaPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><p className="text-muted">A carregar…</p></div>}>
      <ContaPageContent />
    </Suspense>
  );
}
