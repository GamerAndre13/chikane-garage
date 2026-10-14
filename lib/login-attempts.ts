// Bloqueio local de tentativas de início de sessão.
//
// Depois de MAX_ATTEMPTS tentativas falhadas para o mesmo email, o login fica
// bloqueado durante LOCK_MS (15 minutos), avisando o utilizador. O estado
// vive no localStorage do navegador (não há tabela na BD para isto) e é
// limpo assim que o início de sessão tem sucesso.
//
// Nota: o Supabase também aplica limites no servidor; isto é uma camada de
// proteção/aviso adicional do lado do cliente.

const KEY = "chikane-login-attempts-v1";
export const MAX_ATTEMPTS = 5;
export const LOCK_MS = 15 * 60 * 1000;

type Entry = { count: number; lockedUntil: number };
type Store = Record<string, Entry>;

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Ignora (modo privado / quota) — o bloqueio é apenas uma conveniência.
  }
}

// Milissegundos que faltam até o email poder voltar a tentar (0 = livre).
export function getLockRemaining(email: string): number {
  const key = email.trim().toLowerCase();
  if (!key) return 0;
  const entry = read()[key];
  if (!entry) return 0;
  return Math.max(0, entry.lockedUntil - Date.now());
}

// Regista uma tentativa falhada. Ao atingir o limite, bloqueia 15 minutos.
export function registerFailedAttempt(email: string): { locked: boolean; remainingMs: number } {
  const key = email.trim().toLowerCase();
  if (!key) return { locked: false, remainingMs: 0 };

  const store = read();
  const previous = store[key];
  const now = Date.now();

  // Já está bloqueado: mantém o bloqueio e não reinicia o contador.
  if (previous?.lockedUntil && previous.lockedUntil > now) {
    return { locked: true, remainingMs: previous.lockedUntil - now };
  }

  // Bloqueio anterior expirado → começa do zero; caso contrário acumula.
  const expired = previous?.lockedUntil ? previous.lockedUntil <= now : false;
  const count = (expired ? 0 : previous?.count ?? 0) + 1;
  const locked = count >= MAX_ATTEMPTS;
  const lockedUntil = locked ? now + LOCK_MS : 0;

  // Depois de bloquear guarda o contador a zero (o bloqueio é que manda).
  store[key] = { count: locked ? 0 : count, lockedUntil };
  write(store);

  return { locked, remainingMs: locked ? LOCK_MS : 0 };
}

// Limpa o contador (após um início de sessão bem-sucedido).
export function clearAttempts(email: string) {
  const key = email.trim().toLowerCase();
  if (!key) return;
  const store = read();
  if (store[key]) {
    delete store[key];
    write(store);
  }
}

// "14 min 32 s" / "45 s" — texto curto para as mensagens de aviso.
export function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds} s`;
  if (seconds === 0) return `${minutes} min`;
  return `${minutes} min ${seconds} s`;
}
