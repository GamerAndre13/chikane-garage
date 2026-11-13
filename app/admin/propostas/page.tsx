"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

interface Proposal {
  id: string;
  vehicle_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  nif: string;
  base_price: number | null;
  extras_total: number | null;
  total_price: number | null;
  discount: number | null;
  final_price: number | null;
  status: string;
  created_at: string;
  message: string | null;
  selected_extras: { name?: string; variant_name?: string | null; price?: number }[] | null;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendente", color: "#f59e0b" },
  { value: "contacted", label: "Contactado", color: "#3b82f6" },
  { value: "in_progress", label: "Em negociação", color: "#8b5cf6" },
  { value: "closed_won", label: "Fechado - Ganho", color: "#22c55e" },
  { value: "closed_lost", label: "Fechado - Perdido", color: "#ef4444" },
] as const;

export default function PropostasPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("sale_proposals")
        .select("*")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setProposals((data || []) as Proposal[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    if (statusFilter === "all") return proposals;
    return proposals.filter((p) => p.status === statusFilter);
  }, [proposals, statusFilter]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdating(id);
    const { error } = await supabase.from("sale_proposals").update({ status: newStatus }).eq("id", id);
    if (error) alert("Erro ao atualizar estado: " + error.message);
    else {
      setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));
    }
    setUpdating(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: "var(--muted)" }}>A carregar...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl uppercase tracking-wide" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>
          Propostas
        </h1>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border rounded bg-background"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            <option value="all">Todos os estados</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="text-xs" style={{ color: "var(--muted)" }}>
            {visible.length} de {proposals.length}
          </div>
        </div>
      </div>

      <div className="md:overflow-hidden md:rounded md:border" style={{ borderColor: "var(--border)" }}>
        <table className="admin-table w-full text-sm" style={{ backgroundColor: "var(--surface-mid)" }}>
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border)" }}>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>
                Cliente
              </th>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>
                NIF
              </th>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>
                Total
              </th>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>
                Estado
              </th>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>
                Data
              </th>
              <th className="px-4 py-3 text-right uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => {
              const statusOpt = STATUS_OPTIONS.find((s) => s.value === p.status) || STATUS_OPTIONS[0];
              // Total: usa o gravado ou, nas propostas antigas, soma base + extras.
              const original =
                p.total_price != null
                  ? Number(p.total_price)
                  : p.base_price != null || p.extras_total != null
                    ? Number(p.base_price || 0) + Number(p.extras_total || 0)
                    : null;
              const finalPrice = p.final_price != null ? Number(p.final_price) : original;
              const hasDiscount = p.discount != null && Number(p.discount) > 0;
              const total = finalPrice != null ? `${finalPrice.toLocaleString("pt-PT")} €` : "—";
              const date = new Date(p.created_at).toLocaleString("pt-PT");
              return (
                <tr key={p.id} className="border-b" style={{ borderColor: "var(--border)" }}>
                  <td data-label="Cliente" className="px-4 py-3">
                    <div className="max-w-[16rem] truncate" title={p.name} style={{ color: "var(--foreground)" }}>{p.name}</div>
                    <div
                      className="max-w-[16rem] truncate text-xs"
                      title={`${p.email}${p.phone ? ` • ${p.phone}` : ""}`}
                      style={{ color: "var(--muted)" }}
                    >
                      {p.email}
                      {p.phone ? ` • ${p.phone}` : ""}
                    </div>
                  </td>
                  <td data-label="NIF" className="px-4 py-3 tabular-nums" style={{ color: "var(--foreground)" }}>
                    {p.nif}
                  </td>
                  <td data-label="Total" className="px-4 py-3 tabular-nums" style={{ color: "var(--foreground)" }}>
                    {total}
                    {hasDiscount && original != null && (
                      <div className="text-xs" style={{ color: "var(--muted)" }}>
                        <span style={{ textDecoration: "line-through" }}>{`${original.toLocaleString("pt-PT")} €`}</span>
                        {` · −${Number(p.discount).toLocaleString("pt-PT")} €`}
                      </div>
                    )}
                  </td>
                  <td data-label="Estado" className="px-4 py-3">
                    <select
                      value={p.status}
                      onChange={(e) => handleStatusChange(p.id, e.target.value)}
                      disabled={updating === p.id}
                      className="min-h-11 rounded px-2 py-1 text-xs font-medium md:min-h-0"
                      style={{
                        backgroundColor: `${statusOpt.color}20`,
                        color: statusOpt.color,
                        border: `1px solid ${statusOpt.color}`,
                        cursor: updating === p.id ? "not-allowed" : "pointer",
                      }}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td data-label="Data" className="px-4 py-3 text-xs" style={{ color: "var(--muted)" }}>
                    {date}
                  </td>
                  <td data-label="Ações" className="table-actions px-4 py-3 text-right">
                    <Link
                      href={`/admin/propostas/${p.id}`}
                      className="inline-flex min-h-11 items-center text-xs transition-colors md:min-h-0"
                      style={{ color: "var(--copper-deep)" }}
                    >
                      Ver detalhes
                    </Link>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center" style={{ color: "var(--muted)" }}>
                  Nenhuma proposta encontrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
