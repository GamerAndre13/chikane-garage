"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Volta ao topo em todas as páginas:
 * - sempre que muda de rota (o Next mantém a posição de scroll do histórico);
 * - quando se clica no link da página em que já estamos — nesse caso também
 *   atualiza os dados do servidor (router.refresh), como um "recarregar".
 */
export function ScrollToTop() {
  const pathname = usePathname();
  const router = useRouter();

  // Mudança de página: topo imediato, sem animação a atravessar a página nova.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // Âncoras (#secção) continuam a fazer o seu scroll normal.
      if (url.hash) return;
      // Só interessa quando o link aponta para a página em que já estamos:
      // o Next não navega, por isso atualizamos e subimos manualmente.
      if (url.pathname !== window.location.pathname) return;

      router.refresh();
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [router]);

  return null;
}
