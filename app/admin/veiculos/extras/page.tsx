"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  createVehicleExtraCatalog,
  updateVehicleExtraCatalog,
  deleteVehicleExtraCatalog,
  createVehicleExtraVariant,
  updateVehicleExtraVariant,
  deleteVehicleExtraVariant,
} from "./actions";

interface ExtraCatalog {
  id: string;
  name: string;
  description: string | null;
  price: number;
  position: number;
  is_active: boolean;
}

interface ExtraVariant {
  id: string;
  extra_id: string;
  name: string;
  price: number;
  position: number;
  is_active: boolean;
}

export default function VehicleExtrasCatalogPage() {
  const [items, setItems] = useState<ExtraCatalog[]>([]);
  const [variants, setVariants] = useState<ExtraVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newVariant, setNewVariant] = useState({ name: "", price: "0", position: "0" });

  const [newItem, setNewItem] = useState({ name: "", description: "", price: "0", position: "0", is_active: true });

  const load = useCallback(async () => {
    const [catalogRes, variantsRes] = await Promise.all([
      supabase.from("vehicle_extra_catalog").select("*").order("position", { ascending: true }).order("name", { ascending: true }),
      supabase.from("vehicle_extra_variants").select("*").order("position", { ascending: true }).order("name", { ascending: true }),
    ]);
    setItems((catalogRes.data as ExtraCatalog[]) || []);
    setVariants((variantsRes.data as ExtraVariant[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [catalogRes, variantsRes] = await Promise.all([
        supabase.from("vehicle_extra_catalog").select("*").order("position", { ascending: true }).order("name", { ascending: true }),
        supabase.from("vehicle_extra_variants").select("*").order("position", { ascending: true }).order("name", { ascending: true }),
      ]);
      if (cancelled) return;
      setItems((catalogRes.data as ExtraCatalog[]) || []);
      setVariants((variantsRes.data as ExtraVariant[]) || []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
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

  const handleCreateVariant = async (extraId: string, e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("name", newVariant.name);
      formData.append("price", newVariant.price);
      formData.append("position", newVariant.position);
      await createVehicleExtraVariant(extraId, formData);
      setNewVariant({ name: "", price: "0", position: "0" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar variante.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateVariant = async (variant: ExtraVariant, form: HTMLFormElement) => {
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData(form);
      if ((form.elements.namedItem("is_active") as HTMLInputElement)?.checked) formData.append("is_active", "on");
      else formData.append("is_active", "off");
      await updateVehicleExtraVariant(variant.id, formData);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar variante.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVariant = async (id: string) => {
    if (!confirm("Apagar esta variante?")) return;
    setSaving(true);
    try {
      await deleteVehicleExtraVariant(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao apagar variante.");
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
            Criados uma vez e reutilizados nas viaturas novas. Cada extra pode ter variantes com preço próprio.
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
          <input required value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder='Nome (ex.: Jantes 19")' className="px-3 py-2 text-sm border rounded bg-background md:col-span-2" style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
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

      <div className="space-y-3">
        {loading ? (
          <div className="border rounded px-4 py-6 text-center text-sm" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)", color: "var(--muted)" }}>A carregar...</div>
        ) : items.length === 0 ? (
          <div className="border rounded px-4 py-6 text-center text-sm" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)", color: "var(--muted)" }}>Ainda sem extras no catálogo</div>
        ) : (
          items.map((item) => {
            const itemVariants = variants.filter((v) => v.extra_id === item.id);
            const open = expanded === item.id;
            return (
              <div key={item.id} className="border rounded" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
                <form
                  onSubmit={(e) => { e.preventDefault(); handleUpdate(item, e.currentTarget); }}
                  className="grid grid-cols-1 items-start gap-2 p-3 sm:grid-cols-[70px_1fr_110px_80px_auto]"
                >
                  <input name="position" defaultValue={item.position} aria-label="Ordem" className="w-full px-2 py-1 text-xs border rounded bg-background" style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
                  <div className="space-y-1">
                    <input name="name" defaultValue={item.name} required aria-label="Nome do extra" className="w-full px-2 py-1 text-xs border rounded bg-background" style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
                    <input name="description" defaultValue={item.description || ""} placeholder="Descrição" aria-label="Descrição" className="w-full px-2 py-1 text-xs border rounded bg-background" style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
                  </div>
                  <input name="price" defaultValue={item.price} aria-label="Preço" className="w-full px-2 py-1 text-xs border rounded bg-background" style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
                  <label className="flex items-center gap-2 text-xs" style={{ color: "var(--foreground)" }}>
                    <input name="is_active" type="checkbox" defaultChecked={item.is_active} />
                    Ativo
                  </label>
                  <div className="whitespace-nowrap text-right">
                    <button type="button" onClick={() => setExpanded(open ? null : item.id)} className="mr-3 text-xs" style={{ color: "var(--silver)" }}>
                      {open ? "Fechar" : `Variantes (${itemVariants.length})`}
                    </button>
                    <button disabled={saving} className="mr-3 text-xs" style={{ color: "var(--copper-deep)" }}>{saving ? "..." : "Guardar"}</button>
                    <button type="button" onClick={() => handleDelete(item.id)} disabled={saving} className="text-xs" style={{ color: "#ef4444" }}>Apagar</button>
                  </div>
                </form>

                {open && (
                  <div className="border-t p-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--background-alt)" }}>
                    <p className="mb-3 text-xs uppercase tracking-widest" style={{ color: "var(--copper-deep)" }}>Variantes de {item.name}</p>
                    <div className="space-y-2">
                      {itemVariants.length === 0 && <p className="text-xs" style={{ color: "var(--muted)" }}>Sem variantes — o cliente escolhe apenas o extra.</p>}
                      {itemVariants.map((variant) => (
                        <form key={variant.id} onSubmit={(e) => { e.preventDefault(); handleUpdateVariant(variant, e.currentTarget); }} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px_90px_80px_auto]">
                          <input name="name" defaultValue={variant.name} required aria-label="Nome da variante" className="px-2 py-1 text-xs border rounded bg-background" style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
                          <input name="price" defaultValue={variant.price} aria-label="Preço da variante" className="px-2 py-1 text-xs border rounded bg-background" style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
                          <input name="position" defaultValue={variant.position} aria-label="Ordem da variante" className="px-2 py-1 text-xs border rounded bg-background" style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
                          <label className="flex items-center gap-2 text-xs" style={{ color: "var(--foreground)" }}>
                            <input name="is_active" type="checkbox" defaultChecked={variant.is_active} />
                            Ativa
                          </label>
                          <div className="whitespace-nowrap text-right">
                            <button disabled={saving} className="mr-3 text-xs" style={{ color: "var(--copper-deep)" }}>Guardar</button>
                            <button type="button" onClick={() => handleDeleteVariant(variant.id)} className="text-xs" style={{ color: "#ef4444" }}>Apagar</button>
                          </div>
                        </form>
                      ))}
                    </div>

                    <form onSubmit={(e) => handleCreateVariant(item.id, e)} className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px_90px_auto]">
                      <input required value={newVariant.name} onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })} placeholder="Nova variante (ex.: 20 polegadas)" aria-label="Nova variante" className="px-2 py-1 text-xs border rounded bg-background" style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
                      <input value={newVariant.price} onChange={(e) => setNewVariant({ ...newVariant, price: e.target.value })} placeholder="Preço (€)" aria-label="Preço da nova variante" className="px-2 py-1 text-xs border rounded bg-background" style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
                      <input value={newVariant.position} onChange={(e) => setNewVariant({ ...newVariant, position: e.target.value })} placeholder="Ordem" aria-label="Ordem da nova variante" className="px-2 py-1 text-xs border rounded bg-background" style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
                      <button disabled={saving} className="px-3 py-1 rounded text-xs" style={{ backgroundColor: "var(--copper-deep)", color: "var(--background-alt)" }}>+ Variante</button>
                    </form>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
