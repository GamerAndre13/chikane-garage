// ── Feedback dos formulários ──────────────────────────────────────────────
// Depois de submeter um formulário, a página sobe até ao aviso de sucesso/erro
// para o utilizador ver o resultado sem ter de procurar (item 1). O aviso deve
// ter o id indicado; sem ele, sobe-se até ao topo da página.
export function scrollParaFeedback(id = "form-feedback"): void {
  if (typeof window === "undefined") return;
  // Espera pelo render do aviso (o estado muda no fim do submit).
  window.setTimeout(() => {
    const alvo = document.getElementById(id);
    const semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!alvo) {
      window.scrollTo({ top: 0, behavior: semMovimento ? "auto" : "smooth" });
      return;
    }
    const topo = alvo.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: Math.max(0, topo), behavior: semMovimento ? "auto" : "smooth" });
    // Leva também o foco ao aviso (leitores de ecrã anunciam a mensagem).
    alvo.focus({ preventScroll: true });
  }, 60);
}
