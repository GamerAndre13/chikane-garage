import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deactivateShopProduct } from "@/app/actions/shop-admin";
import { euro } from "@/lib/shop";
import { KindBadge, ProductStatusBadge } from "@/app/admin/loja/badges";

// Lista de produtos no formato Shopify: abas de tipo com contagens (Todos /
// Produtos / Peças), filtros de estado em pastilhas, pesquisa e tabela com
// miniatura, etiquetas de estado e ação rápida de arquivar.
export default async function AdminProdutosPage({ searchParams }: PageProps<"/admin/loja/produtos">) {
  const { q, estado, tipo } = await searchParams;
  const term = String(q ?? "").trim().slice(0, 80);
  const safe = term.replace(/[%,()]/g, " ");
  const estadoParam = String(estado ?? "");
  const tipoParam = String(tipo ?? "");
  const estadoAtual = ["active", "draft", "archived"].includes(estadoParam) ? estadoParam : "";
  const tipoAtual = ["product", "part"].includes(tipoParam) ? tipoParam : "";

  // Constrói a URL mantendo os filtros activos e aplicando um remendo.
  const href = (patch: Record<string, string>) => {
    const next = { q: term, estado: estadoAtual, tipo: tipoAtual, ...patch };
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.estado) params.set("estado", next.estado);
    if (next.tipo) params.set("tipo", next.tipo);
    const s = params.toString();
    return s ? `?${s}` : "/admin/loja/produtos";
  };

  const supabase = await createClient();
  // O tipo (peça/produto) considera a categoria: tudo o que esteja numa
  // categoria de peças/acessórios conta como peça, mesmo que o campo `kind`
  // ainda esteja com o valor por omissão («produto»). É a classificação usada
  // no filtro e nas contagens das abas.
  const partCategoryIds = await (async () => {
    const { data } = await supabase.from("product_categories").select("id,slug");
    const pecas = new Set(["pecas-e-manutencao", "jantes-e-pneus", "extras-e-acessorios"]);
    return (data ?? []).filter((category) => pecas.has(category.slug)).map((category) => category.id);
  })();
  const idsPecas = partCategoryIds.length ? partCategoryIds : ["00000000-0000-0000-0000-000000000000"];
  const base = () => {
    let builder = supabase.from("products").select("id", { count: "exact", head: true });
    if (safe) builder = builder.or(`name.ilike.%${safe}%,slug.ilike.%${safe}%`);
    if (estadoAtual) builder = builder.eq("status", estadoAtual);
    return builder;
  };
  const countPromise = async (builder: ReturnType<typeof base>) => {
    const { count } = await builder;
    return count ?? 0;
  };
  let query = supabase
    .from("products")
    .select("id,slug,name,price,status,kind,stock_mode,product_categories(name),product_variants(stock_quantity),product_images(url,position)")
    .order("created_at", { ascending: false })
    .limit(300);
  if (safe) query = query.or(`name.ilike.%${safe}%,slug.ilike.%${safe}%`);
  if (estadoAtual) query = query.eq("status", estadoAtual);
  if (tipoAtual === "part") query = query.in("category_id", idsPecas);
  if (tipoAtual === "product") query = query.not("category_id", "in", `(${idsPecas.join(",")})`);
  const [{ data }, total, prodCount, partCount] = await Promise.all([
    query,
    countPromise(base()),
    countPromise(base().not("category_id", "in", `(${idsPecas.join(",")})`)),
    countPromise(base().in("category_id", idsPecas)),
  ]);
  const products = (data ?? []) as unknown as { id: string; slug: string; name: string; price: number; status: string; kind?: string | null; category_id: string | null; stock_mode: string; product_categories: { name: string } | null; product_variants: { stock_quantity: number }[]; product_images: { url: string; position: number | null }[] }[];

  const tabs = [
    { label: "Todos", value: "", count: total },
    { label: "Produtos", value: "product", count: prodCount },
    { label: "Peças", value: "part", count: partCount },
  ];
  const statusFilters = [
    { label: "Todos os estados", value: "" },
    { label: "Ativos", value: "active" },
    { label: "Rascunhos", value: "draft" },
    { label: "Arquivados", value: "archived" },
  ];

  return (
    <section>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin/loja" className="font-display text-[10px] uppercase tracking-widest text-copper">← Loja</Link>
          <h1 className="mt-3 font-display text-3xl font-bold uppercase">Produtos</h1>
        </div>
        <Link href="/admin/loja/produtos/novo" className="bg-copper px-5 py-3 font-display text-xs uppercase tracking-widest text-black">Novo artigo</Link>
      </header>

      <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
        <nav className="flex gap-1 border-b border-border">
          {tabs.map((tab) => {
            const ativo = tipoAtual === tab.value;
            return (
              <Link
                key={tab.value || "todos"}
                href={href({ tipo: tab.value })}
                className={`-mb-px border-b-2 px-4 py-2.5 font-display text-xs uppercase tracking-widest transition-colors ${ativo ? "border-copper text-copper" : "border-transparent text-muted hover:text-foreground"}`}
              >
                {tab.label} <span className="ml-1 text-[10px] opacity-70">({tab.count})</span>
              </Link>
            );
          })}
        </nav>
        <form action="/admin/loja/produtos" className="flex items-center gap-2">
          {estadoAtual && <input type="hidden" name="estado" value={estadoAtual} />}
          {tipoAtual && <input type="hidden" name="tipo" value={tipoAtual} />}
          <input
            type="search"
            name="q"
            defaultValue={term}
            placeholder="Pesquisar artigos…"
            className="w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground sm:w-64"
          />
          <button type="submit" className="border border-border px-3 py-2.5 font-display text-[10px] uppercase tracking-widest text-muted hover:border-copper hover:text-copper">Pesquisar</button>
        </form>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((filter) => {
            const ativo = estadoAtual === filter.value;
            return (
              <Link
                key={filter.value || "todos"}
                href={href({ estado: filter.value })}
                className={`border px-3 py-1.5 font-display text-[10px] uppercase tracking-widest transition-colors ${ativo ? "border-copper bg-copper/10 text-copper" : "border-border text-muted hover:border-copper/50 hover:text-foreground"}`}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>
        <p className="text-xs text-muted">{total} artigo{total === 1 ? "" : "s"}</p>
      </div>

      {!products.length ? (
        <p className="mt-8 border border-border p-8 text-center text-sm text-muted">
          {term || estadoAtual || tipoAtual ? <>Nenhum artigo corresponde a estes filtros — <Link href="/admin/loja/produtos" className="text-copper underline">limpar filtros</Link>.</> : <>Ainda não há artigos. Cria o primeiro em <Link href="/admin/loja/produtos/novo" className="text-copper underline">Novo artigo</Link>.</>}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto border border-border bg-surface">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-border font-display text-[10px] uppercase tracking-widest text-muted">
                <th className="px-4 py-3 text-left font-normal">Artigo</th>
                <th className="px-4 py-3 text-left font-normal">Tipo</th>
                <th className="px-4 py-3 text-left font-normal">Categoria</th>
                <th className="px-4 py-3 text-right font-normal">Preço</th>
                <th className="px-4 py-3 text-left font-normal">Stock</th>
                <th className="px-4 py-3 text-left font-normal">Estado</th>
                <th className="px-4 py-3 text-right font-normal">Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const image = [...(product.product_images ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0];
                const emStock = (product.product_variants ?? []).reduce((sum, variant) => sum + (variant.stock_quantity ?? 0), 0);
                const stockLabel = product.stock_mode === "unlimited" ? "Sem limite" : product.stock_mode === "on_request" ? "Por encomenda" : `${emStock} un`;
                return (
                  <tr key={product.id} className="border-b border-border/50 last:border-b-0 hover:bg-surface-mid/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="h-11 w-11 shrink-0 overflow-hidden border border-border bg-surface-mid">
                          {image
                            // eslint-disable-next-line @next/next/no-img-element -- miniatura do artigo (R2/SVG local) sem dimensões conhecidas
                            ? <img src={image.url} alt="" className="h-full w-full object-cover" />
                            : <span className="flex h-full items-center justify-center font-display text-[8px] uppercase tracking-widest text-muted">—</span>}
                        </span>
                        <span className="min-w-0">
                          <Link href={`/admin/loja/produtos/${product.id}`} className="block truncate font-medium text-foreground hover:text-copper">{product.name}</Link>
                          <span className="block truncate text-xs text-muted">/{product.slug}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><KindBadge kind={product.kind} categoryIsPart={idsPecas.includes(product.category_id ?? "")} /></td>
                    <td className="px-4 py-3 text-muted">{product.product_categories?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-foreground">{euro(product.price)}</td>
                    <td className={`px-4 py-3 ${product.stock_mode !== "unlimited" && product.stock_mode !== "on_request" && emStock === 0 ? "text-red-light" : "text-muted"}`}>{stockLabel}</td>
                    <td className="px-4 py-3"><ProductStatusBadge status={product.status} /></td>
                    <td className="px-4 py-3 text-right">
                      {product.status !== "archived" && (
                        <form action={deactivateShopProduct} className="inline">
                          <input type="hidden" name="id" value={product.id} />
                          <button type="submit" className="border border-border px-2.5 py-1.5 font-display text-[10px] uppercase tracking-widest text-muted hover:border-copper hover:text-copper">Arquivar</button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
