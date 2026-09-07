"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function NovoProduto() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    image_url: "",
    category: "",
    stock: "",
    active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from("shop_products").insert({
      name: form.name,
      description: form.description,
      price: form.price ? parseFloat(form.price) : null,
      image_url: form.image_url,
      category: form.category,
      stock: form.stock ? parseInt(form.stock) : 0,
      active: form.active,
    });

    setSaving(false);

    if (!error) {
      router.push("/admin/loja");
    } else {
      alert("Erro ao guardar: " + error.message);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "0.5rem 0.75rem",
    borderRadius: "0.375rem",
    border: "1px solid #2a2a2a",
    backgroundColor: "#0a0a0a",
    color: "#f5f5f0",
    fontSize: "0.875rem",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "0.25rem",
    fontSize: "0.75rem",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "#9a9a94",
  };

  return (
    <div>
      <h1 className="text-2xl uppercase tracking-wide mb-6" style={{ fontFamily: "var(--font-display)", color: "#f5f5f0" }}>
        Novo Produto
      </h1>

      <form onSubmit={handleSubmit} style={{ backgroundColor: "#141414", border: "1px solid #2a2a2a", borderRadius: "0.5rem", padding: "1.5rem", maxWidth: "600px" }}>
        <div style={{ marginBottom: "1rem" }}>
          <label style={labelStyle}>Nome *</label>
          <input required style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={labelStyle}>Descrição</label>
          <textarea
            rows={4}
            style={{ ...inputStyle, resize: "vertical" as const }}
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <label style={labelStyle}>Preço (€) *</label>
            <input required type="number" min="0" step="0.01" style={inputStyle} value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Stock *</label>
            <input required type="number" min="0" style={inputStyle} value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
          </div>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={labelStyle}>Categoria</label>
          <input style={inputStyle} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={labelStyle}>URL Imagem</label>
          <input style={inputStyle} value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} />
        </div>

        <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            id="active"
            checked={form.active}
            onChange={e => setForm({ ...form, active: e.target.checked })}
          />
          <label htmlFor="active" style={{ color: "#f5f5f0", fontSize: "0.875rem" }}>
            Ativo
          </label>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded text-sm font-medium transition-opacity"
            style={{ backgroundColor: "#b87333", color: "#0a0a0a", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "A guardar..." : "Criar Produto"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/loja")}
            className="px-4 py-2 rounded text-sm transition-colors"
            style={{ border: "1px solid #2a2a2a", color: "#9a9a94" }}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}