"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  active: boolean;
}

export default function LojaList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from("shop_products").select("*").order("created_at", { ascending: false });
    setProducts(data || []);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja apagar este produto?")) return;
    await supabase.from("shop_products").delete().eq("id", id);
    fetchProducts();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("shop_products").update({ active: !current }).eq("id", id);
    fetchProducts();
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
          Loja
        </h1>
        <Link
          href="/admin/loja/novo"
          className="px-4 py-2 rounded text-sm font-medium transition-colors"
          style={{ backgroundColor: "#b87333", color: "#0a0a0a" }}
        >
          + Novo Produto
        </Link>
      </div>

      <div className="border rounded overflow-hidden" style={{ borderColor: "#2a2a2a" }}>
        <table className="w-full text-sm" style={{ backgroundColor: "#141414" }}>
          <thead>
            <tr className="border-b" style={{ borderColor: "#2a2a2a" }}>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "#9a9a94" }}>Nome</th>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "#9a9a94" }}>Preço</th>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "#9a9a94" }}>Categoria</th>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "#9a9a94" }}>Stock</th>
              <th className="px-4 py-3 text-left uppercase tracking-wide text-xs" style={{ color: "#9a9a94" }}>Ativo</th>
              <th className="px-4 py-3 text-right uppercase tracking-wide text-xs" style={{ color: "#9a9a94" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b" style={{ borderColor: "#2a2a2a" }}>
                <td className="px-4 py-3" style={{ color: "#f5f5f0" }}>{p.name}</td>
                <td className="px-4 py-3" style={{ color: "#f5f5f0" }}>
                  {p.price ? `${p.price.toLocaleString("pt-PT")} €` : "-"}
                </td>
                <td className="px-4 py-3" style={{ color: "#f5f5f0" }}>{p.category || "-"}</td>
                <td className="px-4 py-3" style={{ color: p.stock > 0 ? "#f5f5f0" : "#ef4444" }}>
                  {p.stock}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(p.id, p.active)}
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{
                      backgroundColor: p.active ? "#22c55e20" : "#ef444420",
                      color: p.active ? "#22c55e" : "#ef4444",
                    }}
                  >
                    {p.active ? "Sim" : "Não"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-xs transition-colors"
                    style={{ color: "#ef4444" }}
                  >
                    Apagar
                  </button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center" style={{ color: "#9a9a94" }}>
                  Nenhum produto encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}