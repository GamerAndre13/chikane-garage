"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Navegação do backoffice agrupada por secções
const groups = [
  {
    title: "Painel",
    links: [
      { href: "/admin", label: "Dashboard" },
      { href: "/admin/analytics", label: "Analytics" },
    ],
  },
  {
    title: "Vendas",
    links: [
      { href: "/admin/pedidos", label: "Pedidos" },
    ],
  },
  {
    title: "Catálogo",
    links: [
      { href: "/admin/veiculos", label: "Viaturas" },
    ],
  },
  {
    title: "Conteúdo",
    links: [
      { href: "/admin/conteudo", label: "Conteúdo" },
      { href: "/admin/loja/campanhas", label: "Campanhas" },
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

const isActiveLink = (pathname: string, href: string) => {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
};

// Permite esconder/mostrar a barra lateral (preferência guardada no browser).
export default function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("chikane-admin-sidebar-collapsed") === "1";
  });

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    window.localStorage.setItem("chikane-admin-sidebar-collapsed", next ? "1" : "0");
  };

  if (collapsed) {
    return (
      <aside className="shrink-0 border-r flex flex-col" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
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
    );
  }

  return (
    <aside
      className="w-60 shrink-0 border-r flex flex-col"
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
      <nav className="p-3 flex-1">
        {groups.map((group) => (
          <div key={group.title} className="mb-3">
            <p className="px-3 pb-1 pt-4 font-display text-[9px] uppercase tracking-[0.28em] text-muted-deep">{group.title}</p>
            {group.links.map((link) => {
              const active = isActiveLink(pathname, link.href);
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
        ))}
      </nav>
      <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
        <Link
          href="/"
          className="block rounded px-3 py-2 text-xs transition-colors hover:text-foreground"
          style={{ color: "var(--muted)" }}
        >
          ← Voltar ao site
        </Link>
      </div>
    </aside>
  );
}
