"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  trim?: string;
  registration_year: number;
  price: number;
  status: string;
  sale_type?: string | null;
  spotlight?: boolean;
}

const STATUS_OPTIONS = [
  { value: "available", label: "Disponível", color: "#22c55e" },
  { value: "reserved", label: "Reservada", color: "#f59e0b" },
  { value: "sold", label: "Vendida", color: "#ef4444" },
  { value: "archived", label: "Arquivada", color: "#6b7280" },
] as const;

export default function VeiculosList() {
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchVehicles = useCallback(async () => {
    const { data } = await supabase.from("vehicles").select("*").order("created_at", { ascending: false });
    const v = data || [];
    setAllVehicles(v);
    setLoading(false);
  }, []);

  // Carga inicial — IIFE com flag de cancelamento para evitar setState
  // depois de desmontar (evita o aviso react-hooks/set-state-in-effect).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("vehicles").select("*").order("created_at", { ascending: false });
      if (cancelled) return;
      setAllVehicles(data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja apagar esta viatura?")) return;
    await supabase.from("vehicles").delete().eq("id", id);
    fetchVehicles();
  };

  // Filtro local (pesquisa + estado) derivado por memo — evita setState em efeito
  const visibleVehicles = useMemo(() => {
    let filtered = [...allVehicles];
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      filtered = filtered.filter((v) => {
        return (
          `${v.brand || ""} ${v.model || ""} ${v.trim || ""}`.toLowerCase().includes(term) ||
          String(v.registration_year || "").includes(term) ||
          String(v.price || "").includes(term)
        );
      });
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((v) => v.status === statusFilter);
    }
    return filtered;
  }, [allVehicles, search, statusFilter]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdating(id);
    const { error } = await supabase.from("vehicles").update({
      status: newStatus,
      sold_at: newStatus === "sold" ? new Date().toISOString() : null,
    }).eq("id", id);
    if (error) alert("Erro ao atualizar status: " + error.message);
    else fetchVehicles();
    setUpdating(null);
  };

  // Marca/limpa o destaque da semana (só pode existir um)
  const handleSpotlight = async (id: string, current: boolean) => {
    setUpdating(id);
    // Tenta o RPC (011); se falhar (RPC antigo/ausente), usa update direto
    // com WHERE — assim "remover destaque" funciona sempre.
    const { error } = await supabase.rpc("admin_set_spotlight", {
      p_vehicle_id: current ? null : id,
    });
    if (!error) {
      fetchVehicles();
      setUpdating(null);
      return;
    }

    // Limpa qualquer destaque existente (true ou null → false)
    const clearRes = await supabase
      .from("vehicles")
      .update({ spotlight: false })
      .or("spotlight.eq.true,spotlight.is.null");
    if (clearRes.error) {
      alert("Erro ao atualizar destaque: " + clearRes.error.message);
      setUpdating(null);
      return;
    }
    if (!current) {
      const setRes = await supabase.from("vehicles").update({ spotlight: true }).eq("id", id);
      if (setRes.error) {
        alert("Erro ao atualizar destaque: " + setRes.error.message);
        setUpdating(null);
        return;
      }
    }
    fetchVehicles();
    setUpdating(null);
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
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
          Viaturas
        </h1>
        <Link
          href="/admin/veiculos/novo"
          className="px-4 py-2 rounded text-sm font-medium transition-colors"
          style={{ backgroundColor: "var(--copper-deep)", color: "var(--background-alt)" }}
        >
          + Nova Viatura
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar (marca, modelo, ano, preço)"
          className="px-3 py-2 text-sm border rounded bg-background"
          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border rounded bg-background"
          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
        >
          <option value="all">Todos os estados</option>
          <option value="available">Disponível</option>
          <option value="reserved">Reservada</option>
          <option value="sold">Vendida</option>
          <option value="archived">Arquivada</option>
        </select>
        {(search || statusFilter !== "all") && (
          <button onClick={clearFilters} className="px-3 py-2 text-xs border rounded" style={{ borderColor: "var(--border)", color: "var(--silver)" }}>
            Limpar filtros
          </button>
        )}
        <div className="ml-auto text-xs" style={{ color: "var(--muted)" }}>
          {visibleVehicles.length} de {allVehicles.length} viaturas
        </div>
      </div>

      <div className="border rounded overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <table className="w-full text-sm" style={{ backgroundColor: "var(--surface-mid)" }}>
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border)" }}>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>Modelo</th>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>Ano</th>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>Preço</th>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>Status</th>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>Destaque</th>
              <th className="px-4 py-3 text-right uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {visibleVehicles.map((v) => {
              const statusOpt = STATUS_OPTIONS.find((s) => s.value === v.status) || STATUS_OPTIONS[0];
              return (
                <tr key={v.id} className="border-b transition-colors" style={{ borderColor: "var(--border)" }}>
                  <td className="px-4 py-3" style={{ color: "var(--foreground)" }}>
                    {v.brand} {v.model} {v.trim || ""}
                    {v.sale_type === "new" && (
                      <span className="ml-2 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide" style={{ backgroundColor: "rgba(244,119,36,0.15)", color: "var(--copper-deep)", border: "1px solid rgba(244,119,36,0.4)" }}>
                        Novo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--foreground)" }}>{v.registration_year}</td>
                  <td className="px-4 py-3" style={{ color: "var(--foreground)" }}>
                    {v.price ? `${v.price.toLocaleString("pt-PT")} €` : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={v.status}
                      onChange={(e) => handleStatusChange(v.id, e.target.value)}
                      disabled={updating === v.id}
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{
                        backgroundColor: `${statusOpt.color}20`,
                        color: statusOpt.color,
                        border: `1px solid ${statusOpt.color}`,
                        cursor: updating === v.id ? "not-allowed" : "pointer",
                      }}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleSpotlight(v.id, !!v.spotlight)}
                      disabled={updating === v.id}
                      title={v.spotlight ? "Remover destaque da semana" : "Definir como destaque da semana"}
                      className="px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer"
                      style={{
                        backgroundColor: v.spotlight ? "color-mix(in srgb, var(--copper) 12%, transparent)" : "transparent",
                        color: v.spotlight ? "var(--copper)" : "var(--muted)",
                        border: `1px solid ${v.spotlight ? "var(--copper)" : "var(--border)"}`,
                      }}
                    >
                      {v.spotlight ? "★ Destaque" : "☆ Destaque"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/veiculos/editar/${v.id}`}
                      className="mr-3 text-xs transition-colors"
                      style={{ color: "var(--copper-deep)" }}
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => handleDelete(v.id)}
                      className="text-xs transition-colors"
                      style={{ color: "#ef4444" }}
                    >
                      Apagar
                    </button>
                  </td>
                </tr>
              );
            })}
            {visibleVehicles.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center" style={{ color: "var(--muted)" }}>
                  Nenhuma viatura encontrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
