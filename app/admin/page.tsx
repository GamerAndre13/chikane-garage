import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [
    { count: totalVehicles },
    { count: availableVehicles },
    { count: reservedVehicles },
    { count: soldVehicles },
    { count: newContacts },
    { count: pendingTestDrives },
  ] = await Promise.all([
    supabase.from("vehicles").select("*", { count: "exact", head: true }),
    supabase.from("vehicles").select("*", { count: "exact", head: true }).eq("status", "available"),
    supabase.from("vehicles").select("*", { count: "exact", head: true }).eq("status", "reserved"),
    supabase.from("vehicles").select("*", { count: "exact", head: true }).eq("status", "sold"),
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
    { label: "Total Viaturas", value: totalVehicles ?? 0, color: "var(--copper-deep)", href: "/admin/veiculos" },
    { label: "Disponíveis", value: availableVehicles ?? 0, color: "#22c55e", href: "/admin/veiculos" },
    { label: "Reservadas", value: reservedVehicles ?? 0, color: "#f59e0b", href: "/admin/veiculos" },
    { label: "Vendidas", value: soldVehicles ?? 0, color: "#ef4444", href: "/admin/veiculos" },
    { label: "Contactos Novos", value: newContacts ?? 0, color: "#ec4899", href: "/admin/pedidos" },
    { label: "Test Drives", value: pendingTestDrives ?? 0, color: "#8b5cf6", href: "/admin/pedidos" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl uppercase tracking-wide" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>
          Dashboard
        </h1>
        <Link
          href="/admin/analytics"
          className="text-xs uppercase tracking-widest px-4 py-2 border rounded"
          style={{ borderColor: "var(--copper-deep)", color: "var(--copper-deep)" }}
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
            className="block border p-5 rounded transition-colors hover:border-[var(--copper-deep)]"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}
          >
            <p className="text-3xl font-display" style={{ color: stat.color }}>
              {stat.value}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              {stat.label}
            </p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/veiculos/novo"
          className="block border p-4 rounded text-center transition-colors hover:border-[#22c55e]"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}
        >
          <span className="text-2xl">🚗</span>
          <p className="mt-2 text-sm font-display uppercase tracking-wide" style={{ color: "#22c55e" }}>
            Nova Viatura
          </p>
        </Link>
        <Link
          href="/admin/conteudo"
          className="block border p-4 rounded text-center transition-colors hover:border-[#f59e0b]"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}
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
        <div className="border rounded p-5" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-display uppercase tracking-wide" style={{ color: "var(--foreground)" }}>
              Contactos Recentes
            </h2>
            <Link href="/admin/pedidos" className="text-xs" style={{ color: "var(--copper-deep)" }}>
              Ver todos →
            </Link>
          </div>
          {(!recentContacts || recentContacts.length === 0) ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>Sem contactos ainda.</p>
          ) : (
            <div className="space-y-3">
              {recentContacts.map((c) => (
                <div key={c.id} className="flex items-start justify-between border-b pb-3" style={{ borderColor: "var(--border)" }}>
                  <div>
                    <p className="text-sm" style={{ color: "var(--foreground)" }}>{c.name}</p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>{c.email}</p>
                    {c.message && <p className="text-xs mt-1 truncate max-w-[200px]" style={{ color: "var(--muted-deep)" }}>{c.message}</p>}
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
        <div className="border rounded p-5" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-display uppercase tracking-wide" style={{ color: "var(--foreground)" }}>
              Test Drives Recentes
            </h2>
            <Link href="/admin/pedidos" className="text-xs" style={{ color: "var(--copper-deep)" }}>
              Ver todos →
            </Link>
          </div>
          {(!recentTestDrives || recentTestDrives.length === 0) ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>Sem test drives ainda.</p>
          ) : (
            <div className="space-y-3">
              {recentTestDrives.map((d) => (
                <div key={d.id} className="flex items-start justify-between border-b pb-3" style={{ borderColor: "var(--border)" }}>
                  <div>
                    <p className="text-sm" style={{ color: "var(--foreground)" }}>{d.name}</p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>{d.email}</p>
                    {d.preferred_date && <p className="text-xs mt-1" style={{ color: "var(--muted-deep)" }}>📅 {d.preferred_date}</p>}
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
