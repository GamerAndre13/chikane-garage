import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

// Datas curtas para as listas de atividade (dd/mm/aaaa).
const formatDate = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
};

// Os estados vivem em inglês na base de dados; aqui só se mostram em português.
const statusLabels: Record<string, string> = {
  new: "Novo",
  read: "Lido",
  replied: "Respondido",
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const statusTone = (status: string) => {
  if (status === "new" || status === "pending") return "var(--copper-deep)";
  if (status === "cancelled") return "var(--red-light)";
  return "var(--muted)";
};

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [
    { count: totalVehicles },
    { count: availableVehicles },
    { count: reservedVehicles },
    { count: soldVehicles },
    { count: newContacts },
    { count: pendingTestDrives },
    { count: pendingReservations },
    { count: openProposals },
    { count: activeCampaigns },
  ] = await Promise.all([
    supabase.from("vehicles").select("*", { count: "exact", head: true }),
    supabase.from("vehicles").select("*", { count: "exact", head: true }).eq("status", "available"),
    supabase.from("vehicles").select("*", { count: "exact", head: true }).eq("status", "reserved"),
    supabase.from("vehicles").select("*", { count: "exact", head: true }).eq("status", "sold"),
    supabase.from("contact_requests").select("*", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("test_drives").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("reservations").select("*", { count: "exact", head: true }).eq("status", "pending"),
    // Propostas abertas = ainda não fechadas (ganhas ou perdidas).
    supabase.from("sale_proposals").select("*", { count: "exact", head: true }).in("status", ["pending", "contacted", "in_progress"]),
    supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("is_active", true),
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

  const total = totalVehicles ?? 0;
  const available = availableVehicles ?? 0;
  const reserved = reservedVehicles ?? 0;
  const sold = soldVehicles ?? 0;
  const contacts = newContacts ?? 0;
  const testDrives = pendingTestDrives ?? 0;
  const reservations = pendingReservations ?? 0;
  const proposals = openProposals ?? 0;
  const campaigns = activeCampaigns ?? 0;
  const share = (value: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

  // Os três pedidos à espera de resposta: mesma forma, mesmo peso e uma linha
  // com três colunas. Cada um abre a aba certa dos pedidos.
  const awaiting = [
    { label: "Pedidos", value: reservations, hint: "Reservas à espera de decisão", href: "/admin/pedidos?tab=reservas" },
    { label: "Test drives", value: testDrives, hint: "Marcações por confirmar", href: "/admin/pedidos?tab=testdrives" },
    { label: "Contactos", value: contacts, hint: "Mensagens por responder", href: "/admin/pedidos?tab=contactos" },
  ];

  // Catálogo: três estados, todos com o mesmo peso (a cor tem significado).
  const catalog = [
    { label: "Disponíveis", value: available, color: "var(--copper)" },
    { label: "Reservadas", value: reserved, color: "var(--warning)" },
    { label: "Vendidas", value: sold, color: "var(--muted-deep)" },
  ];

  return (
    <div>
      {/* Cabeçalho: título + a única ação principal (plana, sem gradientes). */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1
            className="text-2xl uppercase tracking-wide"
            style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
          >
            Dashboard
          </h1>
          <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
            Estado atual — os números são lidos a cada carregamento.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/analytics"
            className="inline-flex min-h-11 items-center rounded border px-3 text-xs uppercase tracking-widest transition-colors hover:text-foreground"
            style={{ borderColor: "var(--border)", color: "var(--muted)" }}
          >
            Analytics
          </Link>
          <Link
            href="/admin/veiculos/novo"
            className="inline-flex min-h-11 items-center rounded px-4 text-xs uppercase tracking-widest transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--copper-deep)", color: "var(--background-alt)" }}
          >
            + Nova viatura
          </Link>
        </div>
      </div>

      {/* Por responder: três valores com o mesmo tamanho, espaçamento e forma,
          numa só linha com três colunas. O número é o herói. */}
      <section
        className="rounded-md border"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}
      >
        <div
          className="flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3"
          style={{ borderColor: "var(--border)" }}
        >
          <h2
            className="text-xs uppercase tracking-[0.18em]"
            style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
          >
            Por responder
          </h2>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Estado atual — atualiza a cada carregamento
          </p>
        </div>

        <div className="grid sm:grid-cols-3">
          {awaiting.map((item, index) => (
            <Link
              key={item.label}
              href={item.href}
              className={`group block px-4 py-5 transition-colors hover:bg-surface-raised ${
                index > 0 ? "border-t sm:border-t-0 sm:border-l" : ""
              }`}
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                {item.label}
              </p>
              <p className="mt-2 flex items-baseline gap-2">
                <span
                  className="text-4xl leading-none tabular-nums"
                  style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
                >
                  {item.value}
                </span>
                <span
                  aria-hidden="true"
                  className="text-xs transition-transform group-hover:translate-x-0.5"
                  style={{ color: "var(--muted)" }}
                >
                  →
                </span>
              </p>
              <p className="mt-2 text-xs" style={{ color: "var(--muted-deep)" }}>
                {item.hint}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Catálogo: total em destaque e os três estados com números maiores. */}
      <section
        className="mt-3 rounded-md border"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}
      >
        <div
          className="flex flex-wrap items-end justify-between gap-3 border-b px-4 py-3"
          style={{ borderColor: "var(--border)" }}
        >
          <div>
            <h2
              className="text-xs uppercase tracking-[0.18em]"
              style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
            >
              Catálogo
            </h2>
            <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
              Viaturas no total
            </p>
          </div>
          <p className="flex items-baseline gap-2">
            <span
              className="text-4xl leading-none tabular-nums"
              style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
            >
              {total}
            </span>
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              {total === 1 ? "viatura" : "viaturas"}
            </span>
          </p>
        </div>

        <div className="grid sm:grid-cols-3">
          {catalog.map((item, index) => (
            <Link
              key={item.label}
              href="/admin/veiculos"
              className={`block px-4 py-4 transition-colors hover:bg-surface-raised ${
                index > 0 ? "border-t sm:border-t-0 sm:border-l" : ""
              }`}
              style={{ borderColor: "var(--border)" }}
            >
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                {item.label}
              </p>
              <p className="mt-2 flex items-baseline gap-2">
                <span
                  className="text-3xl leading-none tabular-nums"
                  style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
                >
                  {item.value}
                </span>
                <span className="text-xs tabular-nums" style={{ color: "var(--muted)" }}>
                  {share(item.value)}%
                </span>
              </p>
            </Link>
          ))}
        </div>

        <div className="px-4 pb-4" aria-hidden="true">
          <div className="flex h-1.5 w-full overflow-hidden rounded-sm" style={{ backgroundColor: "var(--surface-raised)" }}>
            {catalog.map((item) => (
              <span key={item.label} style={{ width: `${share(item.value)}%`, backgroundColor: item.color }} />
            ))}
          </div>
        </div>
      </section>

      {/* Em curso: propostas e campanhas, no mesmo tom das listas abaixo. */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Link
          href="/admin/propostas"
          className="group flex items-baseline justify-between gap-3 rounded-md border px-4 py-4 transition-colors hover:bg-surface-raised"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}
        >
          <span>
            <span className="block text-xs uppercase tracking-widest" style={{ color: "var(--muted)" }}>
              Propostas abertas
            </span>
            <span className="mt-1 block text-xs" style={{ color: "var(--muted-deep)" }}>
              Por fechar (ganhas ou perdidas)
            </span>
          </span>
          <span className="flex items-baseline gap-2">
            <span
              className="text-3xl leading-none tabular-nums"
              style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
            >
              {proposals}
            </span>
            <span aria-hidden="true" className="text-xs transition-transform group-hover:translate-x-0.5" style={{ color: "var(--muted)" }}>
              →
            </span>
          </span>
        </Link>

        <Link
          href="/admin/campanhas"
          className="group flex items-baseline justify-between gap-3 rounded-md border px-4 py-4 transition-colors hover:bg-surface-raised"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}
        >
          <span>
            <span className="block text-xs uppercase tracking-widest" style={{ color: "var(--muted)" }}>
              Campanhas ativas
            </span>
            <span className="mt-1 block text-xs" style={{ color: "var(--muted-deep)" }}>
              Ligadas no backoffice
            </span>
          </span>
          <span className="flex items-baseline gap-2">
            <span
              className="text-3xl leading-none tabular-nums"
              style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
            >
              {campaigns}
            </span>
            <span aria-hidden="true" className="text-xs transition-transform group-hover:translate-x-0.5" style={{ color: "var(--muted)" }}>
              →
            </span>
          </span>
        </Link>
      </div>

      {/* Atividade recente */}
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-md border" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
            <h2
              className="text-xs uppercase tracking-[0.18em]"
              style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
            >
              Contactos recentes
            </h2>
            <Link href="/admin/pedidos?tab=contactos" className="text-xs transition-colors hover:text-foreground" style={{ color: "var(--copper-deep)" }}>
              Ver todos →
            </Link>
          </div>
          {!recentContacts || recentContacts.length === 0 ? (
            <p className="px-4 py-6 text-sm" style={{ color: "var(--muted)" }}>Sem contactos ainda.</p>
          ) : (
            <ul>
              {recentContacts.map((contact) => (
                <li
                  key={contact.id}
                  className="flex items-start justify-between gap-3 border-b px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-raised"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm" style={{ color: "var(--foreground)" }}>{contact.name}</p>
                    <p className="truncate text-xs" style={{ color: "var(--muted)" }}>{contact.email || "—"}</p>
                    {contact.message && (
                      <p className="mt-1 truncate text-xs" style={{ color: "var(--muted-deep)" }} title={contact.message}>
                        {contact.message}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className="text-[10px] uppercase tracking-wider"
                      style={{ color: statusTone(contact.status) }}
                    >
                      {statusLabels[contact.status] || contact.status || "—"}
                    </span>
                    <p className="mt-1 text-[11px] tabular-nums" style={{ color: "var(--muted-deep)" }}>
                      {formatDate(contact.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-md border" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
            <h2
              className="text-xs uppercase tracking-[0.18em]"
              style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
            >
              Test drives recentes
            </h2>
            <Link href="/admin/pedidos?tab=testdrives" className="text-xs transition-colors hover:text-foreground" style={{ color: "var(--copper-deep)" }}>
              Ver todos →
            </Link>
          </div>
          {!recentTestDrives || recentTestDrives.length === 0 ? (
            <p className="px-4 py-6 text-sm" style={{ color: "var(--muted)" }}>Sem test drives ainda.</p>
          ) : (
            <ul>
              {recentTestDrives.map((drive) => (
                <li
                  key={drive.id}
                  className="flex items-start justify-between gap-3 border-b px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-raised"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm" style={{ color: "var(--foreground)" }}>{drive.name}</p>
                    <p className="truncate text-xs" style={{ color: "var(--muted)" }}>{drive.email || "—"}</p>
                    {drive.preferred_date && (
                      <p className="mt-1 text-xs tabular-nums" style={{ color: "var(--muted-deep)" }}>
                        Preferida: {formatDate(drive.preferred_date)}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className="text-[10px] uppercase tracking-wider"
                      style={{ color: statusTone(drive.status) }}
                    >
                      {statusLabels[drive.status] || drive.status || "—"}
                    </span>
                    <p className="mt-1 text-[11px] tabular-nums" style={{ color: "var(--muted-deep)" }}>
                      {formatDate(drive.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
