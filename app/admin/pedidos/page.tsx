"use client";

import { useCallback, useEffect, useState } from "react";
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
  vehicle?: { id: string; brand: string; model: string } | null;
  preferred_date: string;
  preferred_time?: string | null;
  confirmed_date?: string | null;
  status: string;
  admin_notes?: string | null;
  created_at: string;
}

export default function PedidosPage() {
  const [contacts, setContacts] = useState<ContactRequest[]>([]);
  const [testDrives, setTestDrives] = useState<TestDrive[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"contactos" | "testdrives">("contactos");

  const fetchData = useCallback(async () => {
    const [contactsRes, drivesRes] = await Promise.all([
      supabase.from("contact_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("test_drives").select("*, vehicle:vehicles(id, brand, model)").order("created_at", { ascending: false }),
    ]);
    setContacts(contactsRes.data || []);
    setTestDrives(drivesRes.data || []);
    setLoading(false);
  }, []);

  // Carga inicial — IIFE com flag de cancelamento (evita setState em efeito
  // e setState depois de desmontar o componente).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [contactsRes, drivesRes] = await Promise.all([
        supabase.from("contact_requests").select("*").order("created_at", { ascending: false }),
        supabase.from("test_drives").select("*, vehicle:vehicles(id, brand, model)").order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      setContacts(contactsRes.data || []);
      setTestDrives(drivesRes.data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const updateContactStatus = async (id: string, status: string) => {
    await supabase.from("contact_requests").update({ status }).eq("id", id);
    fetchData();
  };

  const updateTestDriveStatus = async (id: string, status: string) => {
    await supabase.from("test_drives").update({ status }).eq("id", id);
    fetchData();
  };

  const formatVehicle = (td: TestDrive) => {
    if (td.vehicle?.brand && td.vehicle?.model) {
      return `${td.vehicle.brand} ${td.vehicle.model}`;
    }
    return "-";
  };

  const sendTestDriveEmail = async (td: TestDrive, confirmedDate: string, type: "confirm" | "update") => {
    try {
      const vehicleName = formatVehicle(td);
      await fetch(`/api/admin/test-drive/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: td.email,
          name: td.name,
          vehicle: vehicleName !== "-" ? vehicleName : undefined,
          confirmedDate,
        }),
      });
    } catch (e) {
      console.error("Erro ao enviar email:", e);
    }
  };

  const confirmTestDrive = async (td: TestDrive) => {
    // Usa a data/hora escolhida no campo se houver; senão combina
    // preferred_date + preferred_time (sempre em UTC ISO para a BD).
    const input = document.getElementById(`confirmed-date-${td.id}`) as HTMLInputElement | null;
    let isoDate: string;
    if (input?.value) {
      isoDate = new Date(input.value).toISOString();
    } else if (td.preferred_date) {
      const time = td.preferred_time || "10:00";
      isoDate = new Date(`${td.preferred_date}T${time}`).toISOString();
    } else {
      alert("Seleciona uma data e hora para confirmar.");
      return;
    }

    try {
      const { error } = await supabase.from("test_drives").update({ status: "confirmed", confirmed_date: isoDate, confirmed_at: isoDate }).eq("id", td.id);
      if (error) {
        alert(error.message);
        return;
      }
      await sendTestDriveEmail(td, isoDate, "confirm");
      fetchData();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro");
    }
  };

  const rejectTestDrive = async (id: string) => {
    try {
      const { error } = await supabase.from("test_drives").update({ status: "rejected" }).eq("id", id);
      if (error) {
        alert(error.message);
        return;
      }
      fetchData();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro");
    }
  };

  const updateTestDriveConfirmedDate = async (td: TestDrive) => {
    const input = document.getElementById(`confirmed-date-${td.id}`) as HTMLInputElement | null;
    if (!input || !input.value) {
      alert("Seleciona uma data e hora para confirmar/alterar.");
      return;
    }
    const isoDate = new Date(input.value).toISOString();
    if (Number.isNaN(new Date(input.value).getTime())) {
      alert("Data/hora inválida.");
      return;
    }
    try {
      const { error } = await supabase.from("test_drives").update({ status: "confirmed", confirmed_date: isoDate, confirmed_at: isoDate }).eq("id", td.id);
      if (error) {
        alert(error.message);
        return;
      }
      await sendTestDriveEmail(td, isoDate, "update");
      fetchData();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro");
    }
  };

  // Converte uma data ISO (UTC) para o valor local do input datetime-local
  const toLocalInputValue = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Limites do datetime-local (hoje a +30 dias, em hora local)
  const todayLocal30 = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T00:00`;
  };
  const maxDateLocal30 = () => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T23:59`;
  };

  const formatDate = (dateStr: string, includeTime = false) => {
    const d = new Date(dateStr);
    if (includeTime) {
      return d.toLocaleString("pt-PT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return d.toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Mostra a data preferida (DATE) + hora preferida (TEXT) sem saltos de fuso
  const formatPreferred = (td: TestDrive) => {
    if (!td.preferred_date) return "-";
    const [y, m, day] = td.preferred_date.split("-");
    let out = `${day}/${m}/${y}`;
    if (td.preferred_time) out += ` · ${td.preferred_time}`;
    else out += " · —";
    return out;
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
        <p style={{ color: "var(--muted)" }}>A carregar...</p>
      </div>
    );
  }

  const newContactsCount = contacts.filter((c) => c.status === "new").length;
  const newDrivesCount = testDrives.filter((d) => d.status === "pending").length;

  return (
    <div>
      <h1 className="text-2xl uppercase tracking-wide mb-6" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>
        Pedidos
      </h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("contactos")}
          className="px-4 py-2 rounded text-sm font-medium transition-colors"
          style={{
            backgroundColor: activeTab === "contactos" ? "var(--copper-deep)" : "var(--surface-raised)",
            color: activeTab === "contactos" ? "var(--background-alt)" : "var(--muted)",
          }}
        >
          Contactos {newContactsCount > 0 && `(${newContactsCount})`}
        </button>
        <button
          onClick={() => setActiveTab("testdrives")}
          className="px-4 py-2 rounded text-sm font-medium transition-colors"
          style={{
            backgroundColor: activeTab === "testdrives" ? "var(--copper-deep)" : "var(--surface-raised)",
            color: activeTab === "testdrives" ? "var(--background-alt)" : "var(--muted)",
          }}
        >
          Test Drives {newDrivesCount > 0 && `(${newDrivesCount})`}
        </button>
      </div>

      {/* Contact Requests Table */}
      {activeTab === "contactos" && (
        <div className="border rounded overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <table className="w-full text-sm" style={{ backgroundColor: "var(--surface-mid)" }}>
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>Nome</th>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>Email</th>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>Telefone</th>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>Mensagem</th>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>Status</th>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>Data</th>
                <th className="px-4 py-3 text-right uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b" style={{ borderColor: "var(--border)" }}>
                  <td className="px-4 py-3" style={{ color: "var(--foreground)" }}>{c.name}</td>
                  <td className="px-4 py-3" style={{ color: "var(--foreground)" }}>{c.email}</td>
                  <td className="px-4 py-3" style={{ color: "var(--foreground)" }}>{c.phone || "-"}</td>
                  <td className="px-4 py-3" style={{ color: "var(--muted)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.message || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${statusColors[c.status] || "var(--muted)"} 12%, transparent)`,
                        color: statusColors[c.status] || "var(--muted)",
                      }}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--muted)" }}>{formatDate(c.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {c.status === "new" && (
                      <button
                        onClick={() => updateContactStatus(c.id, "read")}
                        className="text-xs mr-2 hover:opacity-80 cursor-pointer"
                        style={{ color: "#3b82f6" }}
                      >
                        Marcar Lido
                      </button>
                    )}
                    {c.status === "read" && (
                      <button
                        onClick={() => updateContactStatus(c.id, "confirmed")}
                        className="text-xs mr-2 hover:opacity-80 cursor-pointer"
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
                  <td colSpan={7} className="px-4 py-8 text-center" style={{ color: "var(--muted)" }}>
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
        <div className="border rounded overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <table className="w-full text-sm" style={{ backgroundColor: "var(--surface-mid)" }}>
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>Nome</th>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>Email</th>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>Telefone</th>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>Viatura</th>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>Data Preferida</th>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>Data Confirmada</th>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>Status</th>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>Data</th>
                <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {testDrives.map((d) => (
                <tr key={d.id} className="border-b" style={{ borderColor: "var(--border)" }}>
                  <td className="px-4 py-3" style={{ color: "var(--foreground)" }}>{d.name}</td>
                  <td className="px-4 py-3" style={{ color: "var(--foreground)" }}>{d.email}</td>
                  <td className="px-4 py-3" style={{ color: "var(--foreground)" }}>{d.phone || "-"}</td>
                  <td className="px-4 py-3" style={{ color: "var(--silver)" }}>{formatVehicle(d)}</td>
                  <td className="px-4 py-3" style={{ color: "var(--foreground)" }}>{formatPreferred(d)}</td>
                  <td className="px-4 py-3" style={{ color: "var(--silver)" }}>{d.confirmed_date ? formatDate(d.confirmed_date, true) : "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${statusColors[d.status] || "var(--muted)"} 12%, transparent)`,
                        color: statusColors[d.status] || "var(--muted)",
                      }}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--muted)" }}>{formatDate(d.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2 flex-wrap">
                        {d.status !== "completed" && (
                          <>
                            <button onClick={() => confirmTestDrive(d)} className="text-xs hover:opacity-80 cursor-pointer" style={{ color: "#22c55e" }}>
                              Confirmar
                            </button>
                            <button onClick={() => rejectTestDrive(d.id)} className="text-xs hover:opacity-80 cursor-pointer" style={{ color: "#ef4444" }}>
                              Rejeitar
                            </button>
                            {d.status === "confirmed" && (
                              <button
                                onClick={() => updateTestDriveStatus(d.id, "completed")}
                                className="text-xs hover:opacity-80 cursor-pointer"
                                style={{ color: "#3b82f6" }}
                              >
                                Concluir
                              </button>
                            )}
                          </>
                        )}
                        {d.status === "completed" && (
                          <button
                            onClick={() => {
                              const notes = prompt("Notas do test-drive (ex.: efetuado, alterado, cliente comprou...)", d.admin_notes || "");
                              if (notes !== null) {
                                supabase.from("test_drives").update({ admin_notes: notes }).eq("id", d.id).then(() => fetchData());
                              }
                            }}
                            className="text-xs hover:opacity-80 cursor-pointer"
                            style={{ color: "var(--silver)" }}
                          >
                            Editar info
                          </button>
                        )}
                      </div>
                      {d.status !== "completed" && (
                        <div className="flex gap-2 items-center">
                          <input
                            type="datetime-local"
                            id={`confirmed-date-${d.id}`}
                            defaultValue={
                              d.confirmed_date
                                ? toLocalInputValue(d.confirmed_date)
                                : d.preferred_date
                                ? `${d.preferred_date}T${d.preferred_time || "10:00"}`
                                : ""
                            }
                            min={todayLocal30()}
                            max={maxDateLocal30()}
                            step={1800}
                            className="px-2 py-1 text-xs border rounded bg-transparent"
                            style={{ borderColor: "var(--border)", color: "var(--silver)" }}
                          />
                          <button onClick={() => updateTestDriveConfirmedDate(d)} className="text-xs hover:opacity-80 cursor-pointer" style={{ color: "var(--silver)" }}>
                            Alterar
                          </button>
                        </div>
                      )}
                      {d.status === "completed" && d.admin_notes && (
                        <div className="text-[11px] text-muted max-w-[200px]" style={{ color: "var(--muted)", wordBreak: "break-word" }}>
                          {d.admin_notes}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {testDrives.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center" style={{ color: "var(--muted)" }}>
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