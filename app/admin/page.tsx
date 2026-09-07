import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [
    { count: totalVehicles },
    { count: availableVehicles },
    { count: reservedVehicles },
    { count: soldVehicles },
    { count: totalProducts },
    { count: newContacts },
    { count: pendingTestDrives },
  ] = await Promise.all([
    supabase.from("vehicles").select("*", { count: "exact", head: true }),
    supabase.from("vehicles").select("*", { count: "exact", head: true }).eq("status", "available"),
    supabase.from("vehicles").select("*", { count: "exact", head: true }).eq("status", "reserved"),
    supabase.from("vehicles").select("*", { count: "exact", head: true }).eq("status", "sold"),
    supabase.from("shop_products").select("*", { count: "exact", head: true }),
    supabase.from("contact_requests").select("*", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("test_drives").select("*", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  // Recent contacts
  const { data: recentContacts } = await supabase
    .from("contact_requests")
    .select("id, name, email, message, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  // Recent test drives
  const { data: recentTestDrives } = await supabase
    .from("test_drives")
    .select("id, name, email, vehicle_id, preferred_date, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  const stats = [
    { label: "Total Viaturas", value: totalVehicles ?? 0, color: "#b87333", href: "/admin/veiculos" },
    { label: "Disponíveis", value: availableVehicles ?? 0, color: "#22c55e", href: "/admin/veiculos" },
    { label: "Reservadas", value: reservedVehicles ?? 0, color: "#f59e0b", href: "/admin/veiculos" },
    { label: "Vendidas", value: soldVehicles ?? 0, color: "#ef4444", href: "/admin/veiculos" },
    { label: "Produtos Loja", value: totalProducts ?? 0, color: "#3b82f6", href: "/admin/loja" },
    { label: "Contactos Novos", value: newContacts ?? 0, color: "#ec4899", href: "/admin/pedidos" },
    { label: "Test Drives", value: pendingTestDrives ?? 0, color: "#8b5cf6", href: "/admin/pedidos" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl uppercase tracking-wide" style={{ fontFamily: "var(--font-display)", color: "#f5f5f0" }}>
          Dashboard
        </h1>
        <Link
          href="/admin/analytics"
          className="text-xs uppercase tracking-widest px-4 py-2 border rounded"
          style={{ borderColor: "#b87333", color: "#b87333" }}
        >
          📊 Analytics
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="block border p-5 rounded transition-colors hover:border-[#b87333]"
            style={{ borderColor: "#2a2a2a", backgroundColor: "#141414" }}
          >
            <p className="text-3xl font-display" style={{ color: stat.color }}>
              {stat.value}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide" style={{ color: "#9a9a94" }}>
              {stat.label}
            </p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link
          href="/admin/veiculos/novo"
          className="block border p-4 rounded text-center transition-colors hover:border-[#22c55e]"
          style={{ borderColor: "#2a2a2a", backgroundColor: "#141414" }}
        >
          <span className="text-2xl">🚗</span>
          <p className="mt-2 text-sm font-display uppercase tracking-wide" style={{ color: "#22c55e" }}>
            Nova Viatura
          </p>
        </Link>
        <Link
          href="/admin/loja/novo"
          className="block border p-4 rounded text-center transition-colors hover:border-[#3b82f6]"
          style={{ borderColor: "#2a2a2a", backgroundColor: "#141414" }}
        >
          <span className="text-2xl">📦</span>
          <p className="mt-2 text-sm font-display uppercase tracking-wide" style={{ color: "#3b82f6" }}>
            Novo Produto
          </p>
        </Link>
        <Link
          href="/admin/conteudo"
          className="block border p-4 rounded text-center transition-colors hover:border-[#f59e0b]"
          style={{ borderColor: "#2a2a2a", backgroundColor: "#141414" }}
        >
          <span className="text-2xl">✏️</span>
          <p className="mt-2 text-sm font-display uppercase tracking-wide" style={{ color: "#f59e0b" }}>
            Editar Conteúdo
          </p>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Recent Contacts */}
        <div className="border rounded p-5" style={{ borderColor: "#2a2a2a", backgroundColor: "#141414" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-display uppercase tracking-wide" style={{ color: "#f5f5f0" }}>
              Contactos Recentes
            </h2>
            <Link href="/admin/pedidos" className="text-xs" style={{ color: "#b87333" }}>
              Ver todos →
            </Link>
          </div>
          {(!recentContacts || recentContacts.length === 0) ? (
            <p className="text-sm" style={{ color: "#9a9a94" }}>Sem contactos ainda.</p>
          ) : (
            <div className="space-y-3">
              {recentContacts.map((c) => (
                <div key={c.id} className="flex items-start justify-between border-b pb-3" style={{ borderColor: "#2a2a2a" }}>
                  <div>
                    <p className="text-sm" style={{ color: "#f5f5f0" }}>{c.name}</p>
                    <p className="text-xs" style={{ color: "#9a9a94" }}>{c.email}</p>
                    {c.message && <p className="text-xs mt-1 truncate max-w-[200px]" style={{ color: "#6b6b6b" }}>{c.message}</p>}
                  </div>
                  <span
                    className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: c.status === "new" ? "#22c55e20" : "#f59e0b20",
                      color: c.status === "new" ? "#22c55e" : "#f59e0b",
                    }}
                  >
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Test Drives */}
        <div className="border rounded p-5" style={{ borderColor: "#2a2a2a", backgroundColor: "#141414" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-display uppercase tracking-wide" style={{ color: "#f5f5f0" }}>
              Test Drives Recentes
            </h2>
            <Link href="/admin/pedidos" className="text-xs" style={{ color: "#b87333" }}>
              Ver todos →
            </Link>
          </div>
          {(!recentTestDrives || recentTestDrives.length === 0) ? (
            <p className="text-sm" style={{ color: "#9a9a94" }}>Sem test drives ainda.</p>
          ) : (
            <div className="space-y-3">
              {recentTestDrives.map((d) => (
                <div key={d.id} className="flex items-start justify-between border-b pb-3" style={{ borderColor: "#2a2a2a" }}>
                  <div>
                    <p className="text-sm" style={{ color: "#f5f5f0" }}>{d.name}</p>
                    <p className="text-xs" style={{ color: "#9a9a94" }}>{d.email}</p>
                    {d.preferred_date && <p className="text-xs mt-1" style={{ color: "#6b6b6b" }}>📅 {d.preferred_date}</p>}
                  </div>
                  <span
                    className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: d.status === "pending" ? "#8b5cf620" : "#22c55e20",
                      color: d.status === "pending" ? "#8b5cf6" : "#22c55e",
                    }}
                  >
                    {d.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
