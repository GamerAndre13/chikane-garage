import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const sections = [
  ["Produtos", "/admin/loja/produtos", "Artigos, fotografias, variantes e preços"],
  ["Categorias", "/admin/loja/categorias", "Organizar as secções da loja"],
  ["Stock", "/admin/loja/stock", "Quantidades e movimentos"],
  ["Encomendas", "/admin/loja/encomendas", "Preparação, estados e seguimento"],
  ["Cupões", "/admin/loja/cupoes", "Códigos e limites de desconto"],
  ["Portes", "/admin/loja/portes", "Zonas, peso e valores de envio"],
  ["Clientes", "/admin/loja/clientes", "Contactos e exportação para faturação"],
];

export default async function AdminLojaPage() {
  const supabase = await createClient();
  const [{ count: products }, { count: orders }, { count: pending }, { count: lowStock }] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["pending_payment", "paid", "preparing"]),
    supabase.from("product_variants").select("id", { count: "exact", head: true }).lte("stock_quantity", 3).eq("is_active", true),
  ]);
  const stats = [["Artigos ativos", products ?? 0], ["Encomendas", orders ?? 0], ["Por tratar", pending ?? 0], ["Stock baixo", lowStock ?? 0]];
  return <div>
    <header className="mb-8 flex flex-wrap items-end justify-between gap-5"><div><p className="font-display text-[10px] uppercase tracking-[0.25em] text-copper">Gestão comercial</p><h1 className="mt-2 font-display text-3xl font-bold uppercase text-foreground">Loja</h1></div><Link href="/loja" className="border border-border px-4 py-2 text-xs uppercase tracking-widest text-muted hover:border-copper hover:text-copper">Ver loja</Link></header>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label, value]) => <div key={label} className="border border-border bg-surface p-5"><p className="font-display text-3xl text-copper">{value}</p><p className="mt-1 text-xs uppercase tracking-widest text-muted">{label}</p></div>)}</div>
    <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{sections.map(([title, href, description]) => <Link key={href} href={href} className="group border border-border bg-surface p-5 transition-colors hover:border-copper/70"><h2 className="font-display text-lg uppercase text-foreground group-hover:text-copper">{title}</h2><p className="mt-2 text-sm leading-relaxed text-muted">{description}</p></Link>)}</div>
  </div>;
}
