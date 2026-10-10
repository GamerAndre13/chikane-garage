"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type Consent = { necessary: true; analytics: boolean; savedAt: string };
const STORAGE_KEY = "chikane-cookie-consent-v1";
const ANALYTICS_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export function openCookieSettings() {
  window.dispatchEvent(new Event("chikane:cookie-settings"));
}

export function CookieConsent() {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Leitura inicial de preferências guardadas — só existe no cliente: o
    // banner renderiza sem consentimento e esconde-se após a hidratação.
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Consent;
        // Leitura inicial de preferências guardadas: o localStorage só existe
        // no cliente, por isso este setState síncrono no monte é intencional.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setConsent({ necessary: true, analytics: parsed.analytics === true, savedAt: parsed.savedAt });
        setAnalytics(parsed.analytics === true);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    const open = () => setSettingsOpen(true);
    window.addEventListener("chikane:cookie-settings", open);
    return () => window.removeEventListener("chikane:cookie-settings", open);
  }, []);

  const visible = (!consent && !dismissed) || settingsOpen;

  // Gestão de foco e tecla Escape: ao abrir foca a primeira ação; ao fechar
  // devolve o foco ao elemento anterior; Escape fecha (ou dispensa o banner).
  useEffect(() => {
    if (!visible) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusTimer = window.setTimeout(() => {
      dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    }, 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (settingsOpen) {
        setSettingsOpen(false);
      } else if (!consent) {
        setDismissed(true);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [visible, settingsOpen, consent]);

  function save(value: boolean) {
    const next = { necessary: true as const, analytics: value && Boolean(ANALYTICS_ID), savedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setConsent(next);
    setAnalytics(next.analytics);
    setSettingsOpen(false);
  }

  return <>
    {consent?.analytics && ANALYTICS_ID && <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_ID}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">{`window.dataLayer = window.dataLayer || []; function gtag(){window.dataLayer.push(arguments);} window.gtag = gtag; gtag('js', new Date()); gtag('config', '${ANALYTICS_ID}', { anonymize_ip: true });`}</Script>
    </>}
    {visible && <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="cookie-title" className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-3xl border border-white/15 bg-[#111] p-5 shadow-2xl sm:inset-x-6 sm:bottom-6 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <h2 id="cookie-title" className="font-display text-lg font-semibold uppercase tracking-wide text-white">Privacidade e cookies</h2>
          <p className="mt-2 text-sm leading-6 text-white/70">Usamos armazenamento necessário para o funcionamento do site. A medição de visitas só é ativada com a tua autorização e se estiver configurada. Podes alterar a escolha nas preferências de cookies.</p>
          <a href="/politica-de-privacidade" className="mt-2 inline-block text-xs text-copper underline underline-offset-4">Ler política de privacidade</a>
          {settingsOpen && <div className="mt-4 border-t border-white/10 pt-4">
            <label className="flex items-start gap-3 text-sm text-white/75"><input type="checkbox" checked={analytics} disabled={!ANALYTICS_ID} onChange={(event) => setAnalytics(event.target.checked)} className="mt-1 accent-[#f47724]"/><span><span className="font-medium text-white">Analytics (opcional)</span><span className="block text-xs text-white/55">{ANALYTICS_ID ? "Ajuda a perceber como o site é utilizado." : "Indisponível: não existe um identificador de analytics configurado."}</span></span></label>
          </div>}
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {!settingsOpen ? <>
            <button type="button" onClick={() => save(false)} className="min-h-11 border border-white/25 px-4 py-2 text-xs font-semibold text-white transition-colors hover:border-white">Rejeitar opcionais</button>
            <button type="button" onClick={() => setSettingsOpen(true)} className="min-h-11 border border-white/25 px-4 py-2 text-xs font-semibold text-white transition-colors hover:border-white">Configurar</button>
            {ANALYTICS_ID && <button type="button" onClick={() => save(true)} className="min-h-11 bg-copper px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-copper-light">Aceitar analytics</button>}
          </> : <>
            <button type="button" onClick={() => save(false)} className="min-h-11 border border-white/25 px-4 py-2 text-xs font-semibold text-white">Rejeitar opcionais</button>
            <button type="button" onClick={() => save(analytics)} className="min-h-11 bg-copper px-4 py-2 text-xs font-semibold text-black">Aceito opcionais</button>
          </>}
        </div>
      </div>
    </div>}
  </>;
}