"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { createVehicleExtraCatalog, updateVehicleExtraCatalog, deleteVehicleExtraCatalog } from "./actions";

interface ExtraCatalog {
  id: string;
  name: string;
  description: string | null;
  price: number;
  position: number;
  is_active: boolean;
}

export default function VehicleExtrasCatalogPage() {
  const [items, setItems] = useState<ExtraCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newItem, setNewItem] = useState({ name: "", description: "", price: "0", position: "0", is_active: true });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("vehicle_extra_catalog").select("*").order("position", { ascending: true }).order("name", { ascending: true });
    setItems((data as ExtraCatalog[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("name", newItem.name);
      formData.append("description", newItem.description);
      formData.append("price", newItem.price);
      formData.append("position", newItem.position);
      if (newItem.is_active) formData.append("is_active", "on");
      await createVehicleExtraCatalog(formData);
      setNewItem({ name: "", description: "", price: "0", position: String(items.length + 1), is_active: true });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar extra.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (item: ExtraCatalog, form: HTMLFormElement) => {
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData(form);
      if ((form.elements.namedItem("is_active") as HTMLInputElement)?.checked) formData.append("is_active", "on");
      else formData.delete("is_active");
      await updateVehicleExtraCatalog(item.id, formData);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar extra.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem a certeza que deseja apagar este extra do catálogo?")) return;
    setSaving(true);
    setError(null);
    try {
      await deleteVehicleExtraCatalog(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao apagar extra.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl uppercase tracking-wide" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>
            Extras do catálogo
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Criados uma vez, podem ser usados em várias viaturas novas por encomenda
          </p>
        </div>
        <Link href="/admin/veiculos" className="px-4 py-2 rounded text-sm border" style={{ borderColor: "var(--border)", color: "var(--silver)" }}>
          ← Voltar a Viaturas
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded text-sm" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.4)" }}>
          {error}
        </div>
      )}

      <div className="mb-6 p-4 border rounded" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
        <h2 className="text-sm uppercase tracking-wide mb-3" style={{ color: "var(--foreground)" }}>Adicionar novo extra</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input required value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="Nome (ex.: Jantes 19&quot;)" className="px-3 py-2 text-sm border rounded bg-background md:col-span-2" style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
          <input value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} placeholder="Preço (€)" className="px-3 py-2 text-sm border rounded bg-background" style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
          <input value={newItem.position} onChange={(e) => setNewItem({ ...newItem, position: e.target.value })} placeholder="Ordem" className="px-3 py-2 text-sm border rounded bg-background" style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--foreground)" }}>
            <input type="checkbox" checked={newItem.is_active} onChange={(e) => setNewItem({ ...newItem, is_active: e.target.checked })} />
            Ativo
          </label>
          <input value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} placeholder="Descrição (opcional)" className="px-3 py-2 text-sm border rounded bg-background md:col-span-4" style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
          <button disabled={saving} className="px-4 py-2 rounded text-sm" style={{ backgroundColor: "var(--copper-deep)", color: "var(--background-alt)", opacity: saving ? 0.6 : 1 }}>
            {saving ? "A guardar..." : "+ Adicionar"}
          </button>
        </form>
      </div>

      <div className="border rounded overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <table className="w-full text-sm" style={{ backgroundColor: "var(--surface-mid)" }}>
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border)" }}>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>Ordem</th>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>Nome</th>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>Preço</th>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>Ativo</th>
              <th className="px-4 py-3 text-right uppercase tracking-wide text-xs" style={{ color: "var(--muted)" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center" style={{ color: "var(--muted)" }}>A carregar...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center" style={{ color: "var(--muted)" }}>Ainda sem extras no catálogo</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b" style={{ borderColor: "var(--border)" }}>
                  <form onSubmit={(e) => { e.preventDefault(); handleUpdate(item, e.currentTarget); }} className="contents">
                    <td className="px-4 py-2"><input name="position" defaultValue={item.position} className="w-16 px-2 py-1 text-xs border rounded bg-background" style={{ borderColor: "var(--border)", color: "var(--foreground)" }} /></td>
                    <td className="px-4 py-2"><input name="name" defaultValue={item.name} required className="w-full px-2 py-1 text-xs border rounded bg-background" style={{ borderColor: "var(--border)", color: "var(--foreground)" }} /></td>
                    <td className="px-4 py-2"><input name="price" defaultValue={item.price} className="w-24 px-2 py-1 text-xs border rounded bg-background" style={{ borderColor: "var(--border)", color: "var(--foreground)" }} /></td>
                    <td className="px-4 py-2"><input name="is_active" type="checkbox" defaultChecked={item.is_active} /></td>
                    <td className="px-4 py-2 text-right">
                      <button disabled={saving} className="mr-3 text-xs" style={{ color: "var(--copper-deep)" }}>{saving ? "..." : "Guardar"}</button>
                      <button type="button" onClick={() => handleDelete(item.id)} disabled={saving} className="text-xs" style={{ color: "#ef4444" }}>Apagar</button>
                    </td>
                  </form>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
