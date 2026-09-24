"use client";

import { useEffect, useState } from "react";
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
}

const STATUS_OPTIONS = [
  { value: "available", label: "Disponível", color: "#22c55e" },
  { value: "reserved", label: "Reservada", color: "#f59e0b" },
  { value: "sold", label: "Vendida", color: "#ef4444" },
] as const;

export default function VeiculosList() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchVehicles = async () => {
    const { data } = await supabase.from("vehicles").select("*").order("created_at", { ascending: false });
    setVehicles(data || []);
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    supabase.from("vehicles").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      if (!active) return;
      setVehicles(data || []);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja apagar esta viatura?")) return;
    await supabase.from("vehicles").delete().eq("id", id);
    fetchVehicles();
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: "#9a9a94" }}>A carregar...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl uppercase tracking-wide" style={{ fontFamily: "var(--font-display)", color: "#f5f5f0" }}>
          Viaturas
        </h1>
        <Link
          href="/admin/veiculos/novo"
          className="px-4 py-2 rounded text-sm font-medium transition-colors"
          style={{ backgroundColor: "#b87333", color: "#0a0a0a" }}
        >
          + Nova Viatura
        </Link>
      </div>

      <div className="border rounded overflow-hidden" style={{ borderColor: "#2a2a2a" }}>
        <table className="w-full text-sm" style={{ backgroundColor: "#141414" }}>
          <thead>
            <tr className="border-b" style={{ borderColor: "#2a2a2a" }}>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "#9a9a94" }}>Modelo</th>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "#9a9a94" }}>Ano</th>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "#9a9a94" }}>Preço</th>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "#9a9a94" }}>Status</th>
              <th className="px-4 py-3 text-right uppercase tracking-wide text-xs" style={{ color: "#9a9a94" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => {
              const statusOpt = STATUS_OPTIONS.find((s) => s.value === v.status) || STATUS_OPTIONS[0];
              return (
                <tr key={v.id} className="border-b transition-colors" style={{ borderColor: "#2a2a2a" }}>
                  <td className="px-4 py-3" style={{ color: "#f5f5f0" }}>
                    {v.brand} {v.model} {v.trim || ""}
                  </td>
                  <td className="px-4 py-3" style={{ color: "#f5f5f0" }}>{v.registration_year}</td>
                  <td className="px-4 py-3" style={{ color: "#f5f5f0" }}>
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
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/veiculos/editar/${v.id}`}
                      className="mr-3 text-xs transition-colors"
                      style={{ color: "#b87333" }}
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
            {vehicles.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center" style={{ color: "#9a9a94" }}>
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
