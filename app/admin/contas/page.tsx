"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface PendingDeletion {
  id: string;
  email: string | null;
  full_name: string | null;
  deletion_requested_at: string | null;
}

// Mensagem clara quando as RPCs/colunas ainda não foram criadas na BD.
function friendlyDbError(msg: string): string {
  const low = (msg || "").toLowerCase();
  if (
    low.includes("admin_pending_deletions") ||
    low.includes("admin_delete_user") ||
    low.includes("admin_clear_deletion_request") ||
    low.includes("does not exist") ||
    low.includes("sem permissão")
  ) {
    return "Funcionalidade ainda não ativa na base de dados. Corre o ficheiro supabase/setup.sql no SQL Editor do Supabase (é idempotente, não apaga dados) e volta a tentar.";
  }
  return msg || "Erro ao carregar";
}

export default function ContasPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PendingDeletion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc("admin_pending_deletions");
      if (error) {
        setError(friendlyDbError(error.message));
        setItems([]);
      } else {
        setItems((data as PendingDeletion[]) || []);
      }
    } catch (e) {
      setError(e instanceof Error ? friendlyDbError(e.message) : "Erro ao carregar");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      if (!active) return;
      await fetchData();
    })();
    return () => {
      active = false;
    };
  }, []);

  const approveDelete = async (id: string) => {
    setActingId(id);
    setError(null);
    try {
      const { error } = await supabase.rpc("admin_delete_user", { target_id: id });
      if (error) {
        setError(friendlyDbError(error.message));
        return;
      }
      await fetchData();
    } catch (e) {
      setError(e instanceof Error ? friendlyDbError(e.message) : "Erro ao eliminar");
    } finally {
      setActingId(null);
    }
  };

  const rejectDelete = async (id: string) => {
    setActingId(id);
    setError(null);
    try {
      const { error } = await supabase.rpc("admin_clear_deletion_request", { target_id: id });
      if (error) {
        setError(friendlyDbError(error.message));
        return;
      }
      await fetchData();
    } catch (e) {
      setError(e instanceof Error ? friendlyDbError(e.message) : "Erro ao recusar");
    } finally {
      setActingId(null);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleString("pt-PT");
    } catch {
      return "-";
    }
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
      <h1 className="text-2xl uppercase tracking-wide mb-6" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>
        Contas — Pedidos de eliminação
      </h1>

      {error && (
        <div className="mb-4 border-l-4 p-4 text-sm" style={{ borderColor: "#ef4444", backgroundColor: "rgba(239,68,68,0.1)", color: "#f87171" }}>
          {error}
        </div>
      )}

      <div className="md:overflow-hidden md:rounded md:border" style={{ borderColor: "var(--border)" }}>
        <table className="admin-table w-full text-sm" style={{ backgroundColor: "var(--surface-mid)" }}>
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border)" }}>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>Utilizador</th>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>Email</th>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>Pedido em</th>
              <th className="px-4 py-3 text-right uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b" style={{ borderColor: "var(--border)" }}>
                <td data-label="Utilizador" className="px-4 py-3" style={{ color: "var(--foreground)" }}>{item.full_name || "-"}</td>
                <td data-label="Email" className="px-4 py-3 break-all" style={{ color: "var(--foreground)" }}>{item.email || "-"}</td>
                <td data-label="Pedido em" className="px-4 py-3" style={{ color: "var(--muted)" }}>{formatDate(item.deletion_requested_at)}</td>
                <td className="px-4 py-3 text-right flex gap-2 justify-end">
                  <button
                    onClick={() => approveDelete(item.id)}
                    disabled={actingId === item.id}
                    className="min-h-11 rounded px-2 py-1 text-xs md:min-h-0"
                    style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "#22c55e" }}
                  >
                    {actingId === item.id ? "A eliminar..." : "Eliminar definitivamente"}
                  </button>
                  <button
                    onClick={() => rejectDelete(item.id)}
                    disabled={actingId === item.id}
                    className="min-h-11 rounded px-2 py-1 text-xs md:min-h-0"
                    style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
                  >
                    {actingId === item.id ? "A recusar..." : "Recusar"}
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center" style={{ color: "var(--muted)" }}>
                  Sem pedidos de eliminação pendentes
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
