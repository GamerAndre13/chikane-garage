import Link from "next/link";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/veiculos", label: "Viaturas" },
  { href: "/admin/conteudo", label: "Conteúdo" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/contas", label: "Contas" },
  { href: "/admin/definicoes", label: "Definições" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--background-alt)" }}>
      <aside
        className="w-60 shrink-0 border-r flex flex-col"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}
      >
        <div className="border-b p-5" style={{ borderColor: "var(--border)" }}>
          <p
            className="text-sm uppercase tracking-widest"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Chikane <span style={{ color: "var(--copper-deep)" }}>Admin</span>
          </p>
        </div>
        <nav className="p-3 flex-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block rounded px-3 py-2 text-sm transition-colors hover:bg-surface-raised hover:text-foreground"
              style={{ color: "var(--muted)" }}
            >
              {link.label}
            </Link>
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
      <div className="flex-1 p-8" style={{ color: "var(--foreground)" }}>
        {children}
      </div>
    </div>
  );
}
