"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface ContentRow {
  id: string;
  section_key: string;
  title: string;
  subtitle: string;
  body: string;
  image_url: string;
  link_url: string;
  link_text: string;
}

export default function ConteudoCMS() {
  const [contents, setContents] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ContentRow>>({});

  const fetchContents = useCallback(async () => {
    const { data } = await supabase.from("site_content").select("*").order("section_key");
    setContents(data || []);
    setLoading(false);
  }, []);

  // Carga inicial — IIFE com flag de cancelamento (evita setState em efeito
  // e setState depois de desmontar o componente).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("site_content").select("*").order("section_key");
      if (cancelled) return;
      setContents(data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleEdit = (item: ContentRow) => {
    setEditingId(item.id);
    setEditForm({
      title: item.title || "",
      subtitle: item.subtitle || "",
      body: item.body || "",
      image_url: item.image_url || "",
      link_url: item.link_url || "",
      link_text: item.link_text || "",
    });
  };

  const handleSave = async () => {
    if (!editingId) return;

    const { error } = await supabase
      .from("site_content")
      .update({
        title: editForm.title,
        subtitle: editForm.subtitle,
        body: editForm.body,
        image_url: editForm.image_url,
        link_url: editForm.link_url,
        link_text: editForm.link_text,
      })
      .eq("id", editingId);

    if (!error) {
      setEditingId(null);
      fetchContents();
    } else {
      alert("Erro ao guardar: " + error.message);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: "var(--muted)" }}>A carregar...</p>
      </div>
    );
  }

  const inputStyle = {
    width: "100%",
    padding: "0.5rem 0.75rem",
    borderRadius: "0.375rem",
    border: "1px solid var(--border)",
    backgroundColor: "var(--background-alt)",
    color: "var(--foreground)",
    fontSize: "0.875rem",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "0.25rem",
    fontSize: "0.75rem",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "var(--muted)",
  };

  return (
    <div>
      <h1 className="text-2xl uppercase tracking-wide mb-6" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>
        Conteúdo do Site (CMS)
      </h1>
      <p className="mb-6" style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
        Edite os textos e conteúdos do site. Cada linha representa uma secção.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {contents.map((item) => (
          <div
            key={item.id}
            style={{
              backgroundColor: "var(--surface-mid)",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              padding: "1rem",
            }}
          >
            {editingId === item.id ? (
              <div>
                <div style={{ marginBottom: "0.5rem", fontSize: "0.75rem", color: "var(--copper-deep)" }}>
                  A editar: {item.section_key}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <div>
                    <label style={labelStyle}>Título</label>
                    <input
                      style={inputStyle}
                      value={editForm.title || ""}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Subtítulo</label>
                    <input
                      style={inputStyle}
                      value={editForm.subtitle || ""}
                      onChange={(e) => setEditForm({ ...editForm, subtitle: e.target.value })}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: "0.75rem" }}>
                  <label style={labelStyle}>Corpo de Texto</label>
                  <textarea
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical" as const }}
                    value={editForm.body || ""}
                    onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={labelStyle}>URL Imagem</label>
                    <input
                      style={inputStyle}
                      value={editForm.image_url || ""}
                      onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Link URL</label>
                    <input
                      style={inputStyle}
                      value={editForm.link_url || ""}
                      onChange={(e) => setEditForm({ ...editForm, link_url: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Texto do Link</label>
                    <input
                      style={inputStyle}
                      value={editForm.link_text || ""}
                      onChange={(e) => setEditForm({ ...editForm, link_text: e.target.value })}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={handleSave}
                    className="px-3 py-1.5 rounded text-xs font-medium"
                    style={{ backgroundColor: "var(--copper-deep)", color: "var(--background-alt)" }}
                  >
                    Guardar
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1.5 rounded text-xs"
                    style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start">
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--copper-deep)", marginBottom: "0.25rem" }}>
                    {item.section_key}
                  </div>
                  <div style={{ color: "var(--foreground)", fontWeight: 500 }}>{item.title}</div>
                  {item.subtitle && (
                    <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>{item.subtitle}</div>
                  )}
                </div>
                <button
                  onClick={() => handleEdit(item)}
                  className="px-3 py-1.5 rounded text-xs transition-colors"
                  style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
                >
                  Editar
                </button>
              </div>
            )}
          </div>
        ))}
        {contents.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>
            Nenhum conteúdo encontrado. Crie tabelas no Supabase.
          </div>
        )}
      </div>
    </div>
  );
}