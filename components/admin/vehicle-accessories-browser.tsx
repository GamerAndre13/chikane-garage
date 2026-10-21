"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type CompatibleProduct = {
  id: string;
  name: string;
  price: number;
  status: string;
  stock_mode: string | null;
  category: string | null;
  match: string;
};

// "Acessórios & peças compatíveis" no form admin de viaturas novas 0 km:
// consulta a tabela de produtos (product_compatibility + marca + categorias
// de peças) e lista o que vai aparecer no configurador público desta viatura.
// É informativo — para gerir preços e compatibilidades vai-se a loja.
export function VehicleAccessoriesBrowser({ brand, model, registrationYear }: { brand: string; model: string; registrationYear: string }) {
  const [products, setProducts] = useState<CompatibleProduct[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cleanBrand = brand.trim().toLowerCase();
    const cleanModel = model.trim().toLowerCase();
    let cancelled = false;
    (async () => {
      if (!cleanBrand || !cleanModel) { setProducts([]); setLoading(false); return; }
      setLoading(true);
      try {
        const year = parseInt(registrationYear) || null;
        const { data } = await supabase
          .from("products")
          .select("id, name, price, status, stock_mode, product_categories(name, slug), product_compatibility(brand, model, year_from, year_to)")
          .eq("status", "active")
          .order("published_at", { ascending: false })
          .limit(150);
        if (cancelled) return;
        const partCategories = new Set(["pecas-e-manutencao", "jantes-e-pneus", "extras-e-acessorios"]);
        const matches = ((data ?? []) as unknown as { id: string; name: string; price: number; status: string; stock_mode: string | null; product_categories?: { name: string; slug: string } | null; product_compatibility?: { brand?: string | null; model?: string | null; year_from?: number | null; year_to?: number | null }[] }[])
          .map((product) => {
            const compatible = (product.product_compatibility ?? []).some((entry) =>
              (entry.brand ?? "").trim().toLowerCase() === cleanBrand &&
              (!(entry.model ?? "").trim() || (entry.model ?? "").trim().toLowerCase() === cleanModel) &&
              (year == null || ((entry.year_from ?? 0) <= year && (entry.year_to ?? 9999) >= year)));
            const brandMatch = (product.product_categories?.slug && partCategories.has(product.product_categories.slug)) || false;
            if (compatible) return { ...product, category: product.product_categories?.name ?? null, match: "compatibilidade declarada" };
            if (brandMatch) return { ...product, category: product.product_categories?.name ?? null, match: "categoria de peças" };
            return null;
          })
          .filter((item): item is CompatibleProduct => item !== null)
          .slice(0, 24);
        setProducts(matches);
      } catch { if (!cancelled) setProducts([]); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [brand, model, registrationYear]);

  if (!brand.trim() || !model.trim()) return null;

  return (
    <div style={{ marginTop: "1rem", border: "1px solid var(--border)", borderRadius: "0.5rem", padding: "1rem", backgroundColor: "var(--background-alt)" }}>
      <p className="text-xs uppercase tracking-widest" style={{ color: "var(--copper-deep)" }}>Acessórios & peças compatíveis (loja)</p>
      <p className="mt-1" style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
        Procurados na tabela de produtos para <strong style={{ color: "var(--foreground)" }}>{brand} {model}</strong>{registrationYear ? ` (${registrationYear})` : ""} — é o que o cliente verá no configurador público desta viatura. Para alterar preços ou compatibilidades, vai à <Link href="/admin/loja/produtos" style={{ color: "var(--copper-deep)", textDecoration: "underline" }}>loja › produtos</Link>.
      </p>
      {loading && <p className="mt-3" style={{ fontSize: "0.75rem", color: "var(--muted)" }}>A procurar artigos compatíveis…</p>}
      {!loading && products.length === 0 && <p className="mt-3" style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Sem artigos compatíveis para este modelo. Cria peças na loja e declara a compatibilidade (marca/modelo/ano) na ficha de cada produto.</p>}
      {!loading && products.length > 0 && (
        <ul className="mt-3 divide-y" style={{ borderColor: "var(--border)" }}>
          {products.map((product) => (
            <li key={product.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2" style={{ borderColor: "var(--border)" }}>
              <span style={{ fontSize: "0.8125rem", color: "var(--foreground)" }}>{product.name}</span>
              <span className="flex items-baseline gap-3">
                <span style={{ fontSize: "0.6875rem", color: "var(--muted)" }}>{product.category ?? "loja"}{product.stock_mode === "on_request" ? " · só por encomenda" : ""}</span>
                <span style={{ fontSize: "0.6875rem", color: "var(--copper-deep)" }}>{product.match}</span>
                <span style={{ fontSize: "0.8125rem", color: "var(--foreground)" }}>{Number(product.price).toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
