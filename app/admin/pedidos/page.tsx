"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface ContactRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  vehicle_id: string | null;
  status: string;
  created_at: string;
}

interface TestDrive {
  id: string;
  name: string;
  email: string;
  phone: string;
  vehicle_id: string | null;
  preferred_date: string;
  status: string;
  created_at: string;
}

export default function PedidosPage() {
  const [contacts, setContacts] = useState<ContactRequest[]>([]);
  const [testDrives, setTestDrives] = useState<TestDrive[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"contactos" | "testdrives">("contactos");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [contactsRes, drivesRes] = await Promise.all([
      supabase.from("contact_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("test_drives").select("*").order("created_at", { ascending: false }),
    ]);
    setContacts(contactsRes.data || []);
    setTestDrives(drivesRes.data || []);
    setLoading(false);
  };

  const updateContactStatus = async (id: string, status: string) => {
    await supabase.from("contact_requests").update({ status }).eq("id", id);
    fetchData();
  };

  const updateTestDriveStatus = async (id: string, status: string) => {
    await supabase.from("test_drives").update({ status }).eq("id", id);
    fetchData();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const statusColors: Record<string, string> = {
    new: "#ec4899",
    read: "#3b82f6",
    confirmed: "#22c55e",
    pending: "#f59e0b",
    completed: "#22c55e",
    cancelled: "#ef4444",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: "#9a9a94" }}>A carregar...</p>
      </div>
    );
  }

  const newContactsCount = contacts.filter((c) => c.status === "new").length;
  const newDrivesCount = testDrives.filter((d) => d.status === "pending").length;

  return (
    <div>
      <h1 className="text-2xl uppercase tracking-wide mb-6" style={{ fontFamily: "var(--font-display)", color: "#f5f5f0" }}>
        Pedidos
      </h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("contactos")}
          className="px-4 py-2 rounded text-sm font-medium transition-colors"
          style={{
            backgroundColor: activeTab === "contactos" ? "#b87333" : "#1c1c1c",
            color: activeTab === "contactos" ? "#0a0a0a" : "#9a9a94",
          }}
        >
          Contactos {newContactsCount > 0 && `(${newContactsCount})`}
        </button>
        <button
          onClick={() => setActiveTab("testdrives")}
          className="px-4 py-2 rounded text-sm font-medium transition-colors"
          style={{
            backgroundColor: activeTab === "testdrives" ? "#b87333" : "#1c1c1c",
            color: activeTab === "testdrives" ? "#0a0a0a" : "#9a9a94",
          }}
        >
          Test Drives {newDrivesCount > 0 && `(${newDrivesCount})`}
        </button>
      </div>

      {/* Contact Requests Table */}
      {activeTab === "contactos" && (
        <div className="border rounded overflow-hidden" style={{ borderColor: "#2a2a2a" }}>
          <table className="w-full text-sm" style={{ backgroundColor: "#141414" }}>
            <thead>
              <tr className="border-b" style={{ borderColor: "#2a2a2a" }}>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "#9a9a94" }}>Nome</th>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "#9a9a94" }}>Email</th>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "#9a9a94" }}>Telefone</th>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "#9a9a94" }}>Mensagem</th>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "#9a9a94" }}>Status</th>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "#9a9a94" }}>Data</th>
                <th className="px-4 py-3 text-right uppercase tracking-wide text-xs" style={{ color: "#9a9a94" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b" style={{ borderColor: "#2a2a2a" }}>
                  <td className="px-4 py-3" style={{ color: "#f5f5f0" }}>{c.name}</td>
                  <td className="px-4 py-3" style={{ color: "#f5f5f0" }}>{c.email}</td>
                  <td className="px-4 py-3" style={{ color: "#f5f5f0" }}>{c.phone || "-"}</td>
                  <td className="px-4 py-3" style={{ color: "#9a9a94", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.message || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{
                        backgroundColor: `${statusColors[c.status] || "#9a9a94"}20`,
                        color: statusColors[c.status] || "#9a9a94",
                      }}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: "#9a9a94" }}>{formatDate(c.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {c.status === "new" && (
                      <button
                        onClick={() => updateContactStatus(c.id, "read")}
                        className="text-xs mr-2"
                        style={{ color: "#3b82f6" }}
                      >
                        Marcar Lido
                      </button>
                    )}
                    {c.status === "read" && (
                      <button
                        onClick={() => updateContactStatus(c.id, "confirmed")}
                        className="text-xs mr-2"
                        style={{ color: "#22c55e" }}
                      >
                        Confirmar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {contacts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center" style={{ color: "#9a9a94" }}>
                    Nenhum contacto encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Test Drives Table */}
      {activeTab === "testdrives" && (
        <div className="border rounded overflow-hidden" style={{ borderColor: "#2a2a2a" }}>
          <table className="w-full text-sm" style={{ backgroundColor: "#141414" }}>
            <thead>
              <tr className="border-b" style={{ borderColor: "#2a2a2a" }}>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "#9a9a94" }}>Nome</th>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "#9a9a94" }}>Email</th>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "#9a9a94" }}>Telefone</th>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "#9a9a94" }}>Data Preferida</th>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "#9a9a94" }}>Status</th>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "#9a9a94" }}>Data</th>
                <th className="px-4 py-3 text-right uppercase tracking-wide text-xs" style={{ color: "#9a9a94" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {testDrives.map((d) => (
                <tr key={d.id} className="border-b" style={{ borderColor: "#2a2a2a" }}>
                  <td className="px-4 py-3" style={{ color: "#f5f5f0" }}>{d.name}</td>
                  <td className="px-4 py-3" style={{ color: "#f5f5f0" }}>{d.email}</td>
                  <td className="px-4 py-3" style={{ color: "#f5f5f0" }}>{d.phone || "-"}</td>
                  <td className="px-4 py-3" style={{ color: "#f5f5f0" }}>{d.preferred_date ? formatDate(d.preferred_date) : "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{
                        backgroundColor: `${statusColors[d.status] || "#9a9a94"}20`,
                        color: statusColors[d.status] || "#9a9a94",
                      }}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: "#9a9a94" }}>{formatDate(d.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {d.status === "pending" && (
                      <button
                        onClick={() => updateTestDriveStatus(d.id, "confirmed")}
                        className="text-xs"
                        style={{ color: "#22c55e" }}
                      >
                        Confirmar
                      </button>
                    )}
                    {d.status === "confirmed" && (
                      <button
                        onClick={() => updateTestDriveStatus(d.id, "completed")}
                        className="text-xs"
                        style={{ color: "#22c55e" }}
                      >
                        Concluir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {testDrives.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center" style={{ color: "#9a9a94" }}>
                    Nenhum pedido de test drive encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}