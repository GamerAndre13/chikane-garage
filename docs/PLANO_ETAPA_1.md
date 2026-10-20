# Plano detalhado — Etapa 1: Loja a vender

> **Etapa 1 de 3.** Objetivo: pôr a loja (extras, acessórios e merchandising) a vender,
> com backoffice e área de cliente, sem tocar no que já funciona (viaturas, reservas,
> test drives, newsletter, CMS).
>
> **Estado:** proposta, à espera de aprovação do dono.
> **Data:** 15/10/2026 · **Depende de:** autorização explícita para alterar lógica
> (ver `docs/REGRAS_PARA_IA.md`) e das contas de pagamento.
> Definições e âmbito completo: `docs/PLANO_LOJA.md`.

---

## 1. O que fica a funcionar no fim da etapa

1. Navegar a loja por **categoria**, pesquisar e filtrar (preço, disponibilidade e
   **"compatível com a minha viatura"**).
2. **Ficha de produto** com várias imagens, **variantes** (tamanho/cor), stock real e
   produtos relacionados.
3. **Carrinho** (convidado ou com conta) que se mantém ao navegar.
4. **Checkout** com dados de faturação e envio, **portes por zona e peso**, **cupão** e
   **pagamento (cartão + MB Way)**.
5. **Encomenda registada** com emails automáticos, comprovativo e link seguro para acompanhar.
6. **Área de cliente** com histórico, estado e rastreio das encomendas.
7. **Backoffice**: produtos, categorias, variantes, stock, encomendas (estados, notas,
   envio/rastreio), cupões, portes, clientes e **exportação para faturação**.
8. **Stock controlado** com alertas de rutura e "avisar-me quando chegar".
9. **Páginas legais da loja** (envios e devoluções) ligadas no rodapé.
10. **SEO** básico (títulos, descrições, `sitemap.xml`) e GA apenas com consentimento.

---

## 2. Base de dados (novas tabelas)

Tudo acrescentado ao **`supabase/setup.sql`** (ficheiro único e idempotente), com RLS ativa,
`DROP POLICY IF EXISTS` + `CREATE POLICY` e índices onde faz falta.

| Tabela | Para que serve |
|---|---|
| `product_categories` | Categorias e subcategorias, ordem na montra, ativo |
| `products` | Produto: nome, slug, marca, descrição, preço, taxa de IVA, ativo, destaque |
| `product_variants` | Variante (tamanho, cor…), SKU, preço próprio opcional, stock |
| `product_images` | Fotografias no Cloudflare R2 (ordem, texto alternativo) |
| `product_compatibility` | Ligação produto ↔ marca/modelo/anos (catálogo de viaturas) |
| `carts` / `cart_items` | Carrinho por sessão de convidado ou por utilizador |
| `orders` / `order_items` | Encomenda, artigos, totais, IVA, portes, cupão, estado |
| `order_status_history` | Histórico de estados (auditoria) |
| `addresses` | Moradas de envio e faturação |
| `shipping_zones` / `shipping_rates` | Zonas (continente, ilhas, UE) e tabelas por peso |
| `coupons` / `coupon_uses` | Códigos de desconto e controlo de utilizações |
| `stock_movements` | Entradas e saídas de stock (auditoria) |
| `back_in_stock_requests` | Pedidos "avisar-me quando chegar" |
| `email_log` | Registo de emails enviados (apoio e diagnóstico) |

**Alterações a tabelas existentes:** `profiles` ganha NIF, telefone e país (dados de
faturação opcionais). Nada mais é alterado.

**Regra de preços:** preço guardado com IVA incluído + taxa de IVA por produto (23% no
continente), para o comprovativo discriminar o valor. Nas vendas para a Europa o IVA pode ser
o do país do cliente (OSS) — fica preparado, a validar com o contabilista.

**Detalhe completo das tabelas** (colunas, tipos, políticas RLS, índices e funções):
**`docs/MODELO_DADOS_LOJA.md`**.

---

## 3. Páginas e componentes

**Público**

| Rota | Conteúdo |
|---|---|
| `/loja` | Montra: categorias, destaques, promoções |
| `/loja/[categoria]` | Listagem com filtros e ordenação |
| `/produto/[slug]` | Ficha: galeria, variantes, stock, compatibilidade, relacionados |
| `/carrinho` | Carrinho completo (o header tem versão resumida) |
| `/checkout` | Passos: dados → envio → pagamento → confirmação |
| `/encomenda/[token]` | Comprovativo e estado (link seguro enviado por email) |
| `/envios-e-devolucoes` | Portes, prazos e política de devolução (14 dias) |
| `/faq` | Perguntas frequentes |

**Área de cliente:** `/conta/encomendas`, `/conta/encomendas/[id]`, `/conta/enderecos`,
`/conta/dados` (e o resumo em `/conta`).

**Backoffice:** `/admin/loja/produtos` (+ novo/editar), `/admin/loja/categorias`,
`/admin/loja/stock`, `/admin/loja/encomendas` (+ detalhe), `/admin/loja/cupoes`,
`/admin/loja/portes`, `/admin/loja/clientes`, `/admin/relatorios`.

**Componentes novos:** cartão de produto, galeria, seletor de variante, filtro de
compatibilidade, carrinho lateral, passos de checkout, estado de encomenda, campo de cupão,
etiqueta de stock. Reaproveita-se o estilo e as classes que já existem (`clip-chicane`,
tokens de cor, Oswald/Inter).

---

## 4. Pagamentos (cartão + MB Way)

- Uma **camada de pagamento no servidor** com um "fornecedor" por método, para se poder
  trocar de gateway sem reescrever o checkout.
- **Cartão:** Stripe (Checkout ou Payment Intents).
- **MB Way / Multibanco:** gateway português (Ifthenpay, Easypay ou equivalente).
- A encomenda **só passa a "paga" depois do webhook assinado** confirmar o valor (nunca por
  confiança no que vem do browser). Webhooks idempotentes.
- Chaves e segredos apenas no worker (nunca no código); primeiro em **modo de teste**.
- Estados da encomenda: pendente de pagamento → paga → em preparação → enviada → entregue;
  e ainda cancelada, reembolsada e devolvida.

---

## 5. Emails automáticos (Resend, já em uso)

Confirmação de encomenda (cliente) e aviso interno (garagem) · pagamento confirmado ou
falhado · encomenda enviada com rastreio · reembolso/devolução recebida · "está disponível
novamente". Com a identidade do site; a pasta `supabase/email-templates/` já serve de base.

---

## 6. Tarefas por ordem

1. **Esquema SQL** — tabelas, políticas RLS, índices e permissões no `supabase/setup.sql`.
2. **Camada de dados no servidor** — produtos, variantes, stock, carrinho, encomendas,
   cupões, portes (sempre a revalidar permissões).
3. **Loja pública** — montra, categoria, ficha de produto e filtros.
4. **Carrinho e checkout** — convidado e com conta.
5. **Pagamentos** — cartão e MB Way, com webhooks e modo de teste.
6. **Emails automáticos** — confirmações, envios e reembolsos.
7. **Backoffice da loja** — produtos, stock, encomendas, cupões, portes, clientes.
8. **Área de cliente** — encomendas, endereços e dados.
9. **Cupões e portes** — regras, validações e limites de utilização.
10. **Páginas legais da loja, SEO e `sitemap.xml`**.
11. **Revisão final** — `npx tsc --noEmit`, `npm run lint` (sem novos erros) e `npm run build`.

Regra interna: cada tarefa só avança quando a anterior estiver validada — sem deixar o site
a meio. Nada fora da loja é alterado nesta etapa.

---

## 7. O que preciso de ti (dono)

| # | Preciso de | Para quê |
|---|---|---|
| 1 | **Autorização explícita** para alterar lógica (SQL, ações de servidor, rotas) | Regra nº 1 do projeto |
| 2 | **Contas de pagamento** criadas (cartão + MB Way), chaves em modo de teste | Checkout e testes reais |
| 3 | **Textos legais da loja** (ou autorização para eu redigir uma versão-base para revisão) | Termos, envios e devoluções |
| 4 | **5 a 10 produtos** com fotos, preços e stock | Testar o fluxo com dados reais |
| 5 | Confirmação das **zonas e valores de portes** | Tabelas de envio |

---

## 8. Riscos e cuidados

- **Pagamentos:** só se ligam depois de validados em modo de teste; webhooks assinados e
  idempotentes; nenhum dado de cartão passa pelo nosso servidor.
- **IVA nas vendas para a Europa:** confirmar com o contabilista antes de publicar.
- **Sem testes automáticos** no projeto: a validação é manual (cenários da secção 9) mais
  `npx tsc --noEmit` e `npm run build`.
- **Imagens e desempenho:** produtos com muitas fotos pesam; otimizar antes de publicar.
- **Escopo:** qualquer coisa fora desta etapa (viaturas novas, devoluções completas,
  relatórios) fica para a Etapa 2 ou 3 — não se mistura.

---

## 9. Como se valida (cenários de teste)

1. Comprar **duas variantes** diferentes no mesmo carrinho, **com** e **sem** conta.
2. **Cupão** aplicado e recusado (mínimo não atingido, expirado, já usado).
3. **Portes** corretos para continente, ilhas e um país da UE, em duas faixas de peso.
4. **Pagamento** em modo de teste (cartão e MB Way); a encomenda só fica "paga" com
   confirmação; simular pagamento falhado ou cancelado.
5. **Stock**: desce ao pagar, bloqueia ao esgotar, alerta no backoffice, "avisar-me" funciona.
6. **Emails** recebidos nos momentos certos, com link seguro para a encomenda.
7. **Cliente** vê a encomenda na conta; **garagem** muda o estado e adiciona rastreio.
8. **Exportação** das encomendas (CSV) com todos os dados necessários à fatura externa.
9. Ficha de produto com **filtro de compatibilidade** por viatura.
10. Após tudo: `npx tsc --noEmit` sem erros e `npm run build` a passar.

---

## 10. Notas

- Esta etapa **não** mexe em viaturas, reservas, test drives, CMS nem newsletter — só acrescenta.
- Quando estiver aprovada e publicada, seguimos para a **Etapa 2** (viaturas novas e usadas).
- O visual será afinado com os layouts do Lovable quando estiverem disponíveis: a estrutura
  das páginas é esta; a pele pode mudar.

---

## 11. Regra permanente: completo, profissional, rápido e simples

Triplo compromisso a respeitar em cada escolha desta obra.

### 11.1 Na base de dados (o que já está definido)

- **Um índice por consulta quente**, composto quando a consulta filtra e ordena
  pelo mesmo caminho. Já definido: montra (`products` por estado + data),
  variantes ativas, imagens por ordem, compatibilidade por marca/modelo,
  carrinho por cliente + estado, encomendas por cliente + data, linhas de
  encomenda, reservas de pagamento (stock), cupões e movimentos de stock.
- **Nada de contagens caras na montra**: mostrar "esgotado" pelo campo de stock,
  não por varredura de tabelas.
- **Filtros simples** (categoria, marca, preço, disponibilidade) que usam índices;
  busca por texto fica para a Etapa 3, quando houver conteúdo real.
- **Sem colunas "a mais"**: tudo o que se acrescenta tem de ser usado na Etapa 1.
  (Já cortei uma: `shipping_rates.free_above` — os portes grátis são um só valor
  em `shop_settings`.)
- **RLS enxuta**: as políticas públicas são comparações simples
  (`status = 'active'`, `is_active`); a tabela não se abre ao público.
- `place_order` faz **tudo numa só chamada** (preços, stock, portes, cupão e
  gravação), em vez de conversas entre o site e a base de dados.

### 11.2 No site (a implementar)

- Páginas de loja servidas pelo **servidor** (o padrão do Next aqui) e o catálogo
  revalidado por tempo/rota; nunca uma lista a pedir dados a cada tecla.
- **Sem `SELECT *`** nas listas: só as colunas que a página mostra.
- **Uma consulta por relação**, não uma por artigo: variantes, imagens e
  compatibilidades vêm ligadas (evita o clássico N+1).
- **Paginação ou "carregar mais"** a partir de 24 artigos.
- **Imagens**: no R2, com largura/altura e `loading="lazy"`; a primeira de cada
  ficha é a única a carregar de imediato.
- **Sem bibliotecas novas** para aquilo que o Next já faz (formulários, estado,
  animações simples). Cada dependência nova custa tempo de carregamento.
- Carrinho: no browser para convidados, na base de dados para clientes com sessão
  — uma só verdade por situação.

### 11.3 Simplicidade (o que nos protege)

- O visível é simples: catálogo, ficha, carrinho, checkout, conta, backoffice.
- O invisível é feito em camadas: primeiro a loja a vender (Etapa 1), depois as
  viaturas novas/usadas (Etapa 2), e só no fim devoluções e relatórios (Etapa 3).
- Uma decisão nova só entra se responder a "quem é que usa isto e quando?".
- Cada etapa tem de deixar o site **mais rápido ou igual**, nunca mais lento.

### 11.4 Como isto se verifica

- `npx tsc --noEmit`, `npm run lint` (sem erros novos) e `npm run build`.
- Primeira carga da loja medida em produção (visitante novo, rede móvel) e
  acompanhada ao longo da obra.
- Nenhuma consulta da montra acima do que um índice serve.
- Revisão final: se algo exigir SQL novo para mudar de cliente, está errado.

