# Guia de layouts

Onde está cada ecrã, onde se mexe **só** no visual e como confirmar que não se
partiu nada.

> ⚠️ **Antes de mexer:** lê as [regras para IA/programadores](REGRAS_PARA_IA.md).
> A regra nº 1 é: **não se altera a lógica**, só layouts, estilo e textos visuais.
> Se é a primeira vez neste projeto, começa por
> [as instruções para IA](INSTRUCOES_PARA_IA.md).

---

## 1. Onde está cada ecrã

| Ecrã (no site) | Ficheiro |
|---|---|
| Estrutura global (fontes, metadados, cabeçalho/rodapé) | `app/layout.tsx` |
| Estilos globais, cores e utilitários | `app/globals.css` |
| **Home** (hero, spotlight, catálogo, garagem, processo) | `app/page.tsx` |
| **Catálogo** (filtros + grelha) | `app/catalogo/page.tsx` |
| **Ficha da viatura** | `app/catalogo/[slug]/page.tsx` (pedidos de test-drive e de informação num painel inline no local — `components/ui/vehicle-request-panel.tsx`, sem sair da ficha) |
| ↳ Compra online / configurador (viatura nova 0 km + extras → pedido de encomenda) | `app/catalogo/[slug]/configurar/page.tsx` (+ `components/shop/vehicle-configurator.tsx` — checkout dark estilo BMW: «1 · Extras incluídos na compra» por secções da categoria com escolha única (jantes: máx. 4 modelos, variantes = tamanhos), «2 · Entrega» (stand grátis / casa +350 €) e «3 · Os seus dados»; painel lateral com fotografia, ano · km · Novo, custos e «Confirmar compra») |
| **Sobre** | `app/sobre/page.tsx` |
| **Contacto** | `app/contacto/page.tsx` |
| **Conta** (entrar / registar) | `app/conta/page.tsx` |
| **Perfil** (dados, favoritos, pedidos) | `app/conta/perfil/page.tsx` |
| Termos e condições | `app/termos-e-condicoes/page.tsx` |
| Política de privacidade | `app/politica-de-privacidade/page.tsx` |
| Envios e devoluções | `app/envios-e-devolucoes/page.tsx` |
| Perguntas frequentes | `app/faq/page.tsx` |
| Livro de Reclamações | `app/livro-reclamacoes/page.tsx` |
| **Viaturas novas** | `app/novos/page.tsx` (+ `components/ui/vehicle-condition-catalog.tsx`) |
| **Viaturas usadas** | `app/usados/page.tsx` (idem) |
| **Loja (catálogo)** | `app/loja/page.tsx` |
| ↳ Categoria da loja | `app/loja/[categoria]/page.tsx` |
| ↳ Ficha de artigo | `app/produto/[slug]/page.tsx` (artigos "só por encomenda" → `components/shop/product-quote-request.tsx`, pedido de compra sem pagamento) |
| **Campanhas** (promosções ativas) | `app/campanhas/page.tsx` (cartões de `campaigns` ativas e dentro das datas — secção 25 do `supabase/setup.sql`) |
| **Carrinho** (só artigos da loja — viaturas não entram no carrinho) | `app/carrinho/page.tsx` (+ `components/shop/cart-view.tsx`) |
| **Checkout** | `app/checkout/page.tsx` (+ `components/shop/checkout-form.tsx` — nome/contacto vêm da morada e do perfil; cliente com sessão tem os campos pré-preenchidos; cupão debaixo do total; pagamento só abre com todos os campos completos) |
| ↳ Comprovativo / acompanhamento de pedido (percurso + histórico) | `app/encomenda/[token]/page.tsx` |
| Conta — encomendas | `app/conta/encomendas/page.tsx` |
| Página 404 | `app/not-found.tsx` |
| Imagem de partilha (redes sociais) | `app/opengraph-image.tsx` |
| **Backoffice** | `app/admin/` (layout em `app/admin/layout.tsx`, menu em `app/admin/AdminSidebar.tsx` — agrupado por secções no formato Shopify: Painel · Vendas · Catálogo · Conteúdo · Gestão) |
| ↳ Painel inicial | `app/admin/page.tsx` |
| ↳ Viaturas | `app/admin/veiculos/page.tsx` (+ `novo/`, `editar/[id]/` — forms novos/editar incluem painel `components/admin/vehicle-accessories-browser.tsx` com as peças compatíveis da loja) |
| ↳ Conteúdo do site (CMS de textos) | `app/admin/conteudo/page.tsx` (client; edita `site_content`) |
| ↳ Pedidos | `app/admin/pedidos/page.tsx` |
| ↳ Contas | `app/admin/contas/page.tsx` |
| ↳ Estatísticas | `app/admin/analytics/page.tsx` |
| ↳ Definições | `app/admin/definicoes/page.tsx` (contactos, redes, fotos — `site_settings`) |
| ↳ Loja (hub) | `app/admin/loja/page.tsx` — índice de todas as secções abaixo |
| ↳↳ Produtos | `app/admin/loja/produtos/` — lista em formato Shopify (abas Todos/Produtos/Peças com contagens, filtros de estado, miniatura e etiquetas de `app/admin/loja/badges.tsx`); `novo/` e `[id]/` com o formulário em rail (`product-form.tsx` — campo Tipo: Produto/Peça → compatibilidade só aparece para peças; marca/categoria em combobox escrever+selecionar, criando a que faltar; variantes por eixos ilimitados → tabela de combinações SKU/stock/ajuste) + `product-images-manager.tsx` (fotos com setas ↑↓ e pôr em primeiro); no criar, fotografias multi com pré-visualização |
| ↳↳ Categorias | `app/admin/loja/categorias/page.tsx` |
| ↳↳ Marcas | `app/admin/loja/marcas/page.tsx` (criar, editar, ativar, apagar) |
| ↳↳ Stock | `app/admin/loja/stock/page.tsx` |
| ↳↳ Encomendas | `app/admin/loja/encomendas/` — lista em formato Shopify (abas Todas/Por entregar/Por pagar/Fechadas, pesquisa + CSV, etiquetas de pagamento/entrega); `[id]/` detalhe com artigos, histórico em timeline e rail de atualização/pagamento/cliente/entrega |
| ↳↳ Devoluções | `app/admin/loja/devolucoes/page.tsx` (estados, reembolso, notas) |
| ↳↳ Cupões | `app/admin/loja/cupoes/page.tsx` (criar, editar, ativar, apagar) |
| ↳↳ Portes | `app/admin/loja/portes/page.tsx` (zonas + escalões por peso) |
| ↳↳ Clientes | `app/admin/loja/clientes/page.tsx` |
| ↳↳ Newsletter | `app/admin/loja/newsletter/page.tsx` (subscritores + CSV) |
| ↳↳ Campanhas | `app/admin/loja/campanhas/page.tsx` (criar/editar campanhas com foto, datas de início/fim e estado calculado — tabela `campaigns`) |
| ↳↳ Definições da loja | `app/admin/loja/definicoes/page.tsx` (`shop_settings`) |

### Componentes reutilizáveis

| Componente | Ficheiro | O que é |
|---|---|---|
| Cabeçalho / menu | `components/layout/header.tsx` | Barra superior e menu móvel |
| Rodapé | `components/layout/footer.tsx` | Contactos, redes, newsletter |
| Botão de cookies | `components/layout/cookie-settings-button.tsx` | Reabrir preferências |
| Grelha do catálogo | `components/ui/catalog-browser.tsx` | Cartões + filtros |
| Cartão de viatura (galeria) | `components/ui/vehicle-card-gallery.tsx` | Fotografia em cartão |
| Galeria da ficha | `components/ui/vehicle-detail-gallery.tsx` | Galeria grande |
| Galeria (genérica) | `components/ui/vehicle-gallery.tsx` | Lista de fotos |
| Especificações | `components/ui/vehicle-specifications.tsx` | Ficha técnica |
| Botão de favorito | `components/ui/favorite-button.tsx` | Coração nos cartões |
| Lista de favoritos | `components/ui/favorites-list.tsx` | Favoritos no perfil |
| Meus pedidos | `components/ui/my-requests.tsx` | Pedidos no perfil |
| Escolher fotografias | `components/ui/vehicle-photo-picker.tsx` | Upload no backoffice (aceita `label` para o rótulo — viatura ou artigo) |
| Pedido inline na ficha | `components/ui/vehicle-request-panel.tsx` | Test-drive e pedidos de informação sem sair da ficha |
| Animação ao aparecer | `components/ui/reveal.tsx` | Efeito de entrada |
| Linhas decorativas | `components/ui/vgpu-speed-lines.tsx` | Detalhe gráfico |
| Formulário de newsletter | `components/newsletter-form.tsx` | Rodapé |
| Aviso de cookies | `components/cookie-consent.tsx` | Banner + Analytics |
| Etiquetas de estado (loja) | `app/admin/loja/badges.tsx` | Pastilhas de pagamento/entrega/estado/tipo no backoffice |

---

## 2. Cores e tipografia (o "tema")

Tudo é definido em `app/globals.css`. **Nunca escrevas cores diretas** (como
`#f47724` ou `text-white`) — usa sempre o nome do token, para o site ficar
coerente.

### Cores

| Token | Valor | Uso típico | Classe Tailwind |
|---|---|---|---|
| `--background` | `#090909` | Fundo principal | `bg-background` |
| `--background-alt` | `#0a0a0a` | Fundo alternativo | `bg-background-alt` |
| `--surface` | `#121110` | Caixas e cartões | `bg-surface` |
| `--surface-mid` | `#141414` | Cartões (tom médio) | `bg-surface-mid` |
| `--surface-raised` | `#1a1917` | Elementos elevados | `bg-surface-raised` |
| `--foreground` | `#f1efed` | Texto principal | `text-foreground` |
| `--muted` | `#99938d` | Texto secundário | `text-muted` |
| `--border` | `#302d2a` | Contornos | `border-border` |
| `--copper` | `#f47724` | **Cor de destaque** (botões, títulos) | `text-copper` / `bg-copper` |
| `--copper-light` | `#ff9145` | Destaque (hover) | `text-copper-light` |
| `--red` | `#a32020` | Avisos, "vendido" | `text-red` |
| `--success` | `#22c55e` | Confirmações | `text-success` |
| `--warning` | `#f59e0b` | Avisos suaves | `text-warning` |

### Tipografia

- **Títulos:** `font-display` (tipo *Oswald*), normalmente com
  `uppercase tracking-[0.2em]` para o ar "premium".
- **Texto corrido:** `font-sans` (tipo *Inter*) — é o tipo predefinido.

### Utilitários próprios

- `clip-chicane` — recorta o canto superior direito (o "notch" de 26px que o
  spotlight e os destaques usam).
- `clip-notch` — recorte mais pequeno (18px), para cartões.

---

## 3. Responsividade

O projeto é **mobile-first**: escreve-se o estilo do telemóvel primeiro e
acrescentam-se adaptações para ecrãs maiores com prefixos.

| Prefixo | Aplica-se a | Nós chamamos-lhe |
|---|---|---|
| *(sem prefixo)* | telemóvel (< 640px) | mobile |
| `sm:` | ≥ 640px | telemóvel grande / tablet |
| `md:` | ≥ 768px | tablet |
| `lg:` | ≥ 1024px | **PC** |

> **Convenção importante:** neste projeto, "PC" começa nos 640px (`sm:`), não nos
> 1024px. O hero e o spotlight foram afinados assim. Ao alterar algo só para
> telemóvel, **não uses `sm:`** (usar `sm:` muda o PC também).

---

## 4. Como alterar com segurança

1. **Identifica o ficheiro** na tabela da secção 1.
2. **Muda só o que é visual:** classes Tailwind (`className`), texto entre tags,
   ordem dos elementos, `div`/`span` de estrutura, ícones.
3. **Não mexas** em nada que leia ou escreva dados (ver secção 5).
4. **Confirma que compila:**
   ```bash
   npx tsc --noEmit
   npx eslint app/page.tsx        # põe o caminho do ficheiro que mexeste
   ```
   Para ver o resultado no ecrã: `npm run dev` → <http://localhost:3000>.
5. Se for uma alteração grande, corre também `npm run build` antes de publicar.

### Publicar

```bash
git add .
git commit -m "Ajuste de layout: <descricao curta>"
git push
```

O Cloudflare republica o site em 5 a 9 minutos. **Não** commites o `.env.local`
nem as notas `.txt`/`.md` da raiz (não fazem parte do site).

---

## 5. O que **não** é layout (não mexer)

Estes ficheiros e linhas fazem o site funcionar. Uma alteração aqui pode apagar
dados, deixar entrar quem não deve, ou partir o pagamento/emails:

| Ficheiro / pasta | Porquê |
|---|---|
| `proxy.ts` | Redirecionamento HTTPS, sessão e a **única** proteção do `/admin` |
| `app/actions/*` | Ações de servidor (autenticação, upload de fotografias) |
| `app/api/**/route.ts` | Endpoints (newsletter, decisões de pedidos) |
| `lib/*` | Lógica: Supabase, R2, visibilidade de viaturas, validações |
| `supabase/setup.sql` | Schema, segurança (RLS), funções e permissões da base de dados (ficheiro único) |
| `app/auth/callback/route.ts` | Confirmação de conta |
| `app/robots.ts`, `app/sitemap.ts` | SEO técnico |
| `next.config.ts`, `wrangler.toml`, `package.json` | Configuração do site |

**Dentro das páginas** (`app/**/page.tsx`) há visual **e** lógica no mesmo
ficheiro. Só podes mexer no `return (...)` (o que se vê). Não mexas em nada
parecido com:

```ts
supabase.from("vehicles").select("*")     // consultas à base de dados
const { data: { user } } = await supabase.auth.getUser()   // sessão
if (!profile || profile.role !== "admin") redirect("/conta")  // controlo de acesso
revalidatePath("/catalogo")               // atualização de cache
createClient()                            // ligação à base de dados
```

Em caso de dúvida: **pergunta antes de mexer**.

---

Voltar ao [README](../README.md) · Ver [pôr o site no ar](COLOCAR_NO_AR.md) ·
Ver [variáveis de ambiente](VARIAVEIS_AMBIENTE.md) ·
Ver [regras para IA](REGRAS_PARA_IA.md)

*Última atualização: 2026-10-14.*
