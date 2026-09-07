import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const metadata = {
  title: "Loja | Chikane Garage",
  description: "Produtos e acessórios para a tua viatura BMW — selecionados pela Chikane Garage.",
};

type ShopProduct = {
  id: string;
  name?: string | null;
  description?: string | null;
  price?: number | null;
  image_url?: string | null;
};

export default async function LojaPage() {
  let products: ShopProduct[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("shop_products").select("*").eq("active", true).order("created_at", { ascending: false });
    products = (data || []) as ShopProduct[];
  } catch { products = []; }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" style={{ backgroundColor: "#0a0a0a" }}>
      <div className="max-w-2xl">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-copper">Acessórios &amp; Produtos</p>
        <h1 className="mt-3 font-display text-5xl font-bold uppercase tracking-wide text-foreground">Loja</h1>
        <p className="mt-4 text-base leading-relaxed text-muted">Peças, acessórios e produtos selecionados para o teu BMW.</p>
      </div>

      {products.length === 0 ? (
        <div className="mt-16 rounded border border-border p-16 text-center" style={{ backgroundColor: "#141414" }}>
          <p className="font-display text-2xl font-bold uppercase tracking-wide text-foreground">Em breve</p>
          <p className="mt-2 text-sm text-muted">Estamos a preparar a loja.</p>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <div key={p.id} className="group overflow-hidden rounded border border-border transition-shadow hover:shadow-lg hover:shadow-copper/5" style={{ backgroundColor: "#141414" }}>
              <div className="relative aspect-square overflow-hidden" style={{ backgroundColor: "#1c1c1c" }}>
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt={p.name ?? ""} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center"><span className="text-4xl">📦</span></div>
                )}
              </div>
              <div className="p-5">
                <h3 className="font-display text-base font-semibold uppercase tracking-wide text-foreground">{p.name || "Produto"}</h3>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <span className="font-display text-lg font-bold text-foreground">
                    {p.price != null ? `${p.price.toLocaleString("pt-PT")} €` : "Sob consulta"}
                  </span>
                  <Link href="/contacto" className="border border-border px-4 py-2 font-display text-xs font-semibold uppercase tracking-widest text-muted transition-colors hover:border-copper hover:text-copper">
                    Contactar
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
