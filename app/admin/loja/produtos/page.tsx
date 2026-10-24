import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deactivateShopProduct } from "@/app/actions/shop-admin";
import { euro } from "@/lib/shop";
import { KindBadge, ProductStatusBadge } from "@/app/admin/loja/badges";
import { PageHeader, Tabs, Table, THead, TBody, TH, TD, EmptyState } from "@/app/admin/loja/_ui";

// Lista de produtos com shell limpo e intuitivo, inspirado no Medusa.
export default async function AdminProdutosPage({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string; tipo?: string }> }) {
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
    .select("id,slug,name,price,status,kind,category_id,stock_mode,product_categories(name),product_variants(stock_quantity),product_images(url,position)")
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
    { label: "Todos", value: "", href: href({ tipo: "" }), count: total },
    { label: "Produtos", value: "product", href: href({ tipo: "product" }), count: prodCount },
    { label: "Peças", value: "part", href: href({ tipo: "part" }), count: partCount },
  ];
  const statusFilters = [
    { label: "Todos os estados", value: "" },
    { label: "Ativos", value: "active" },
    { label: "Rascunhos", value: "draft" },
    { label: "Arquivados", value: "archived" },
  ];

  return (
    <div>
      <PageHeader
        title="Produtos"
        subtitle="Artigos, peças, variantes, preços e compatibilidade para a loja."
        backHref="/admin/loja"
        breadcrumbs={[{ label: "Loja", href: "/admin/loja" }]}
        actions={[{ label: "Novo artigo", href: "/admin/loja/produtos/novo", variant: "primary" }]}
      />

      <div className="border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <Tabs tabs={tabs} active={tipoAtual} />
          <form action="/admin/loja/produtos" className="flex items-center gap-2">
            {estadoAtual && <input type="hidden" name="estado" value={estadoAtual} />}
            {tipoAtual && <input type="hidden" name="tipo" value={tipoAtual} />}
            <input
              type="search"
              name="q"
              defaultValue={term}
              placeholder="Pesquisar por nome ou referência…"
              className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground sm:w-72"
            />
            <button type="submit" className="border border-border px-3 py-2 font-display text-[10px] uppercase tracking-widest text-muted transition-colors hover:border-copper hover:text-copper">Pesquisar</button>
          </form>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-2.5 sm:px-6">
          <div className="flex flex-wrap items-center gap-1">
            {statusFilters.map((filter) => {
              const ativo = estadoAtual === filter.value;
              return (
                <Link
                  key={filter.value || "todos"}
                  href={href({ estado: filter.value })}
                  className={`px-2.5 py-1.5 text-xs transition-colors ${ativo ? "bg-copper/15 text-copper" : "text-muted hover:text-foreground"}`}
                >
                  {filter.label}
                </Link>
              );
            })}
          </div>
          <p className="text-xs text-muted">{total} artigo{total === 1 ? "" : "s"}</p>
        </div>

        {!products.length ? (
          <div className="border-t border-border p-8">
            <EmptyState
              title={term || estadoAtual || tipoAtual ? "Sem resultados" : "Ainda não há artigos"}
              description={term || estadoAtual || tipoAtual ? "Nenhum artigo corresponde aos filtros aplicados." : "Começa por criar o primeiro artigo para a loja."}
              actionLabel={term || estadoAtual || tipoAtual ? "Limpar filtros" : "Novo artigo"}
              actionHref={term || estadoAtual || tipoAtual ? "/admin/loja/produtos" : "/admin/loja/produtos/novo"}
            />
          </div>
        ) : (
          <div className="border-t border-border">
            <Table>
              <THead>
                <tr>
                  <TH>Artigo</TH>
                  <TH>Tipo</TH>
                  <TH>Categoria</TH>
                  <TH align="right">Preço</TH>
                  <TH>Stock</TH>
                  <TH>Estado</TH>
                  <TH align="right">Ações</TH>
                </tr>
              </THead>
              <TBody>
                {products.map((product) => {
                  const image = [...(product.product_images ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0];
                  const emStock = (product.product_variants ?? []).reduce((sum, variant) => sum + (variant.stock_quantity ?? 0), 0);
                  const stockLabel = product.stock_mode === "unlimited" ? "Sem limite" : product.stock_mode === "on_request" ? "Por encomenda" : `${emStock} un`;
                  const isPart = idsPecas.includes(product.category_id ?? "");
                  return (
                    <tr key={product.id} className="group transition-colors hover:bg-surface-mid/40">
                      <TD>
                        <div className="flex items-center gap-3">
                          <span className="h-10 w-10 shrink-0 overflow-hidden border border-border bg-surface-mid">
                            {image
                              ? // eslint-disable-next-line @next/next/no-img-element
                                <img src={image.url} alt="" className="h-full w-full object-cover" />
                              : <span className="flex h-full items-center justify-center text-[8px] uppercase tracking-widest text-muted">—</span>}
                          </span>
                          <div className="min-w-0">
                            <Link href={`/admin/loja/produtos/${product.id}`} className="block truncate text-foreground transition-colors hover:text-copper">{product.name}</Link>
                            <span className="block truncate text-xs text-muted">/{product.slug}</span>
                          </div>
                        </div>
                      </TD>
                      <TD><KindBadge kind={product.kind} categoryIsPart={isPart} /></TD>
                      <TD className="text-muted">{product.product_categories?.name ?? "—"}</TD>
                      <TD align="right" className="text-foreground">{euro(product.price)}</TD>
                      <TD className={product.stock_mode !== "unlimited" && product.stock_mode !== "on_request" && emStock === 0 ? "text-red-light" : "text-muted"}>{stockLabel}</TD>
                      <TD><ProductStatusBadge status={product.status} /></TD>
                      <TD align="right">
                        <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                          <Link href={`/admin/loja/produtos/${product.id}`} className="border border-border px-2.5 py-1 text-[10px] uppercase tracking-widest text-muted transition-colors hover:border-copper hover:text-copper">Editar</Link>
                          {product.status !== "archived" && (
                            <form action={deactivateShopProduct}>
                              <input type="hidden" name="id" value={product.id} />
                              <button type="submit" className="border border-border px-2.5 py-1 text-[10px] uppercase tracking-widest text-muted transition-colors hover:border-copper hover:text-copper">Arquivar</button>
                            </form>
                          )}
                        </div>
                      </TD>
                    </tr>
                  );
                })}
              </TBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
