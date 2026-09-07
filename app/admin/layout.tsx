import Link from "next/link";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/veiculos", label: "Viaturas" },
  { href: "/admin/loja", label: "Loja" },
  { href: "/admin/conteudo", label: "Conteúdo" },
  { href: "/admin/pedidos", label: "Pedidos" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#0a0a0a" }}>
      <aside
        className="w-60 shrink-0 border-r flex flex-col"
        style={{ borderColor: "#2a2a2a", backgroundColor: "#141414" }}
      >
        <div className="border-b p-5" style={{ borderColor: "#2a2a2a" }}>
          <p
            className="text-sm uppercase tracking-widest"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Chikane <span style={{ color: "#b87333" }}>Admin</span>
          </p>
        </div>
        <nav className="p-3 flex-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block rounded px-3 py-2 text-sm transition-colors hover:bg-[#1c1c1c] hover:text-[#f5f5f0]"
              style={{ color: "#9a9a94" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t" style={{ borderColor: "#2a2a2a" }}>
          <Link
            href="/"
            className="block rounded px-3 py-2 text-xs transition-colors hover:text-[#f5f5f0]"
            style={{ color: "#9a9a94" }}
          >
            ← Voltar ao site
          </Link>
        </div>
      </aside>
      <div className="flex-1 p-8" style={{ color: "#f5f5f0" }}>
        {children}
      </div>
    </div>
  );
}
