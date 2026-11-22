import { afterEach, describe, expect, it, vi } from "vitest";
import { clearAttempts, formatRemaining, getLockRemaining, LOCK_MS, MAX_ATTEMPTS, registerFailedAttempt } from "../../lib/login-attempts";

function memoryStorage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
}

describe("bloqueio local de início de sessão", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
  it("não bloqueia vazio e limita ao atingir cinco falhas por email normalizado", () => {
    vi.useFakeTimers(); vi.setSystemTime(1000);
    vi.stubGlobal("window", { localStorage: memoryStorage() });
    expect(registerFailedAttempt("")).toEqual({ locked: false, remainingMs: 0 });
    for (let i = 1; i < MAX_ATTEMPTS; i++) expect(registerFailedAttempt(" Pessoa@EXEMPLO.pt ").locked).toBe(false);
    expect(registerFailedAttempt("pessoa@exemplo.pt")).toEqual({ locked: true, remainingMs: LOCK_MS });
    expect(getLockRemaining("PESSOA@exemplo.pt")).toBe(LOCK_MS);
    expect(registerFailedAttempt("pessoa@exemplo.pt").locked).toBe(true);
  });
  it("expira o bloqueio, reinicia tentativas e permite limpar após sucesso", () => {
    vi.useFakeTimers(); vi.setSystemTime(1000); vi.stubGlobal("window", { localStorage: memoryStorage() });
    for (let i = 0; i < MAX_ATTEMPTS; i++) registerFailedAttempt("a@b.pt");
    vi.advanceTimersByTime(LOCK_MS + 1);
    expect(getLockRemaining("a@b.pt")).toBe(0); expect(registerFailedAttempt("a@b.pt").locked).toBe(false);
    clearAttempts("a@b.pt"); expect(getLockRemaining("a@b.pt")).toBe(0); clearAttempts("");
  });
  it("formata contagem regressiva em segundos e minutos", () => {
    expect(formatRemaining(-1)).toBe("0 s"); expect(formatRemaining(1)).toBe("1 s"); expect(formatRemaining(60_000)).toBe("1 min"); expect(formatRemaining(872_000)).toBe("14 min 32 s");
  });
  it("funciona sem browser e tolera armazenamento indisponível/dados inválidos", () => {
    expect(getLockRemaining("x@y.pt")).toBe(0); expect(registerFailedAttempt("x@y.pt").locked).toBe(false); clearAttempts("x@y.pt");
    const throwingStorage = { getItem: () => "{inválido", setItem: () => { throw new Error("quota"); } };
    vi.stubGlobal("window", { localStorage: throwingStorage });
    expect(registerFailedAttempt("x@y.pt").locked).toBe(false); expect(getLockRemaining("x@y.pt")).toBe(0);
  });
});
