"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import TableDensity from "./TableDensity";

const navGroups = [
  {
    title: "Geral",
    links: [
      { href: "/admin", label: "Dashboard" },
      { href: "/admin/analytics", label: "Analytics" },
    ],
  },
  {
    title: "Catálogo",
    links: [
      { href: "/admin/veiculos", label: "Viaturas" },
      { href: "/admin/veiculos/extras", label: "Extras" },
      { href: "/admin/campanhas", label: "Campanhas" },
    ],
  },
  {
    title: "Leads & Propostas",
    links: [
      { href: "/admin/pedidos", label: "Pedidos & Reservas" },
      { href: "/admin/propostas", label: "Propostas" },
    ],
  },
  {
    title: "Gestão",
    links: [
      { href: "/admin/contas", label: "Contas" },
      { href: "/admin/definicoes", label: "Definições" },
    ],
  },
];

// Destaca a aba aberta e permite esconder/mostrar a barra lateral.
// Em ecrãs pequenos a barra lateral dá lugar a uma barra no topo com um
// painel de navegação (botões de 44px, sem depender de scroll horizontal).
export default function AdminSidebar() {
  const pathname = usePathname();
  // Só uma entrada ativa: escolhe-se o caminho mais específico que corresponde
  // ao URL (senão "/admin/veiculos/extras" acendia também "Viaturas").
  const activeHref = navGroups
    .flatMap((group) => group.links.map((link) => link.href))
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("chikane-admin-sidebar-collapsed") === "1";
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    window.localStorage.setItem("chikane-admin-sidebar-collapsed", next ? "1" : "0");
  };

  // Fecha o painel móvel com Escape.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const mobileBar = (
    <div
      className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b px-4 py-2.5 md:hidden"
      style={{ backgroundColor: "var(--surface-mid)", borderColor: "var(--border)" }}
    >
      <p className="text-sm uppercase tracking-widest" style={{ fontFamily: "var(--font-display)" }}>
        Chikane <span style={{ color: "var(--copper-deep)" }}>Admin</span>
      </p>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-expanded={mobileOpen}
        aria-controls="admin-mobile-nav"
        className="inline-flex min-h-11 items-center gap-2 rounded border px-3 text-xs uppercase tracking-widest transition-colors"
        style={{ borderColor: "var(--border)", color: "var(--silver)" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
        Menu
      </button>
    </div>
  );

  const mobilePanel = mobileOpen && (
    <div className="fixed inset-0 z-50 md:hidden" id="admin-mobile-nav">
      <button
        type="button"
        aria-label="Fechar menu"
        onClick={() => setMobileOpen(false)}
        className="absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-sm"
      />
      <nav
        className="absolute inset-y-0 right-0 flex w-[85%] max-w-80 flex-col overflow-y-auto border-l p-4"
        style={{
          backgroundColor: "var(--surface-mid)",
          borderColor: "var(--border)",
          paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
        }}
        aria-label="Menu do backoffice"
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm uppercase tracking-widest" style={{ fontFamily: "var(--font-display)" }}>
            Chikane <span style={{ color: "var(--copper-deep)" }}>Admin</span>
          </p>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded border"
            style={{ borderColor: "var(--border)", color: "var(--muted)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {navGroups.map((group) => (
          <div key={group.title} className="mb-4">
            <p className="mb-1 px-2 text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--muted)" }}>
              {group.title}
            </p>
            <div className="space-y-1">
              {group.links.map((link) => {
                const active = link.href === activeHref;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-11 items-center rounded px-3 text-sm transition-colors ${active ? "bg-surface-raised" : ""} hover:bg-surface-raised hover:text-foreground`}
                    style={{ color: active ? "var(--foreground)" : "var(--muted)", fontWeight: active ? 600 : 400 }}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className="mt-auto flex min-h-11 items-center rounded border-t px-3 text-xs"
          style={{ color: "var(--muted)", borderColor: "var(--border)" }}
        >
          ← Voltar ao site
        </Link>
      </nav>
    </div>
  );

  if (collapsed) {
    return (
      <>
        {mobileBar}
        {mobilePanel}
        <aside className="hidden shrink-0 flex-col border-r md:flex" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
          <button
            type="button"
            onClick={toggleCollapsed}
            title="Mostrar barra lateral"
            aria-label="Mostrar barra lateral"
            className="flex items-center justify-center border-b bg-transparent text-sm transition-colors hover:text-foreground cursor-pointer"
            style={{ color: "var(--muted)", borderColor: "var(--border)", width: 48, height: 56 }}
          >
            »
          </button>
        </aside>
      </>
    );
  }

  return (
    <>
      {mobileBar}
      {mobilePanel}
      <aside
        className="hidden w-60 shrink-0 flex-col border-r md:flex"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}
      >
        <div className="flex items-center justify-between border-b p-5" style={{ borderColor: "var(--border)" }}>
          <p
            className="text-sm uppercase tracking-widest"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Chikane <span style={{ color: "var(--copper-deep)" }}>Admin</span>
          </p>
          <button
            type="button"
            onClick={toggleCollapsed}
            title="Esconder barra lateral"
            aria-label="Esconder barra lateral"
            className="bg-transparent text-xs transition-colors hover:text-foreground cursor-pointer"
            style={{ color: "var(--muted)" }}
          >
            «
          </button>
        </div>
        <nav className="p-3 flex-1 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.title} className="mb-4">
              <p className="px-3 mb-1 text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--muted)" }}>
                {group.title}
              </p>
              <div className="space-y-1">
                {group.links.map((link) => {
                  const active = link.href === activeHref;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded px-3 py-2 text-sm transition-colors ${active ? "bg-surface-raised" : ""} hover:bg-surface-raised hover:text-foreground`}
                      style={{ color: active ? "var(--foreground)" : "var(--muted)", fontWeight: active ? 600 : 400 }}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="mb-3">
            <TableDensity />
          </div>
          <Link
            href="/"
            className="block rounded px-3 py-2 text-xs transition-colors hover:text-foreground"
            style={{ color: "var(--muted)" }}
          >
            ← Voltar ao site
          </Link>
        </div>
      </aside>
    </>
  );
}
