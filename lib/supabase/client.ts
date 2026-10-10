import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Duração da sessão quando o user marca "Manter sessão iniciada" (30 dias).
// O @supabase/ssr usa por defeito cookies persistentes de 400 dias, o que
// tornava esse checkbox decorativo — por isso aqui controlamos o maxAge.
const REMEMBER_MAX_AGE = 30 * 24 * 60 * 60; // 30 dias em segundos
const REMEMBER_KEY = "chikane-remember";

function shouldRemember(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(REMEMBER_KEY) === "1";
  } catch {
    return false;
  }
}

// createBrowserClient guarda a sessão em cookies (sb-<ref>-auth-token),
// o que permite ao middleware e às server components autenticar o mesmo user.
// Sem "Manter sessão" os cookies ficam de sessão (caem ao fechar o browser);
// com "Manter sessão" duram 30 dias.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookieOptions: {
    maxAge: shouldRemember() ? REMEMBER_MAX_AGE : undefined,
  },
});

/**
 * Re-serializa os cookies de sessão `sb-*-auth-token` (e respetivos chunks)
 * com ou sem Max-Age, imediatamente após o login, na mesma página.
 */
export function applySessionPersistence(remember: boolean): void {
  if (typeof document === "undefined") return;
  const maxAge = remember ? REMEMBER_MAX_AGE : undefined;
  const pairs = document.cookie.split("; ");
  for (const pair of pairs) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    const name = pair.slice(0, eq).trim();
    if (!name.startsWith("sb-") || !name.includes("-auth-token")) continue;
    const value = pair.slice(eq + 1);
    document.cookie = `${name}=${value}; Path=/; SameSite=Lax${maxAge ? `; Max-Age=${maxAge}` : ""}`;
  }
}

/**
 * Regista a preferência de persistência e aplica-a aos cookies de sessão.
 * Deve ser chamado no login/signup com o valor do checkbox "Manter sessão".
 */
export function setRememberPreference(remember: boolean): void {
  try {
    if (remember) {
      window.localStorage.setItem(REMEMBER_KEY, "1");
    } else {
      window.localStorage.removeItem(REMEMBER_KEY);
    }
  } catch {
    // localStorage indisponível (modo privado) — a sessão mantém o comportamento atual
  }
  applySessionPersistence(remember);
}