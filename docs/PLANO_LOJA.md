# Plano da Loja e das Viaturas — Chikane Garage

> **Documento de definições e planeamento.** Nada aqui está implementado.
> Serve para fechar decisões antes de se mexer em código.
> **Estado:** em definição · **Última atualização:** 15/10/2026

**Documentos deste pacote**

| Documento | Para que serve |
|---|---|
| `docs/INSTRUCOES_PARA_IA.md` | **ponto de entrada**: visão do dono e onde está tudo |
| `docs/PLANO_LOJA.md` (este) | decisões e fases |
| `docs/FASES.md` | **todas as fases (0 a 5): o que se faz e como** |
| `docs/PLANO_ETAPA_1.md` | plano detalhado da Etapa 1 |
| `docs/MODELO_DADOS_LOJA.md` | modelo de dados (tabelas, RLS, RPC, conteúdo) |
| `docs/rascunho/ETAPA_1_LOJA.sql` | rascunho do SQL (não correr; validado) |
| `docs/PRODUTO_E_MARCA.md` | produto, marca e comercialização |
| `docs/TEXTOS_LOJA.md` | emails da loja e páginas legais |
| `docs/COMPATIBILIDADE_STANDS.md` | a mesma base para carros e motos |
| `docs/rascunho/ETAPA_2_TIPOS_E_LOCAIS.sql` | rascunho: tipos de veículo e lojas |

**Como ler este documento**

| Secção | Estado |
|---|---|
| 2. Decisões fechadas | ✅ confirmado pelo dono |
| 3–8. Estrutura (páginas, dados, fluxos) | 🟡 rascunho, a fechar |
| 9. Fases de execução | 🟡 proposta |
| 10. Em aberto | ❓ perguntas por responder |

**Regra que não muda:** não se altera lógica sem autorização explícita do dono
(ver `docs/REGRAS_PARA_IA.md`). Este documento é só papel — decisões, não código.

**Compromisso permanente:** tudo tem de ficar **completo e profissional**, **rápido**
(sem abdicar de desempenho) e **simples** (fácil de explicar e de manter). Em cada
decisão nova: isto é completo? serve a quem? custa velocidade? traz complicação?
Ver a secção 11 de `docs/PLANO_ETAPA_1.md`.

---

## 1. Objetivo

Vender três coisas, **todas dentro do site atual** (sem plataforma externa tipo Shopify;
a Shopify serve apenas como referência de estrutura):

1. **Viaturas novas** (0 km).
2. **Viaturas usadas** (o que já existe hoje).
3. **Loja de extras, acessórios e merchandising** (produtos com stock e envio).

Com **backoffice completo** e **área de cliente** atualizada. Referência visual de layouts:
a definir com o Lovable.

---

## 2. Decisões já fechadas ✅

| # | Tema | Decisão |
|---|---|---|
| 1 | **Pagamentos da loja** | Cartão online **+** MB Way / Multibanco |
| 2 | **Viaturas novas** | **Stock próprio** *e* **por encomenda** (etiqueta a distinguir na ficha) |
| 3 | **Envios** | Portugal (continente + ilhas) **+ Europa** |
| 4 | **Faturação** | O site emite apenas **comprovativo de encomenda**; a fatura legal é emitida **fora do site** |
| 5 | **Âmbito do v1** | Loja com carrinho e checkout · backoffice da loja · área de cliente com encomendas · viaturas novas no catálogo · cupões, portes e variantes |
| 6 | **Loja** | Integrada no próprio site (não é Shopify nem plataforma externa) |
| 7 | **Fotografias** | Cloudflare R2 (já em uso no site) |
| 8 | **IVA** | Preços **com IVA incluído** (23% no continente), discriminado no comprovativo |
| 9 | **Idiomas** | **Só português** por agora (site preparado para inglês mais tarde) |
| 10 | **Comprar** | **Convidado + conta opcional** (compra sem registo obrigatório) |
| 11 | **Compatibilidade** | Produtos **ligados ao catálogo de viaturas** (marca/modelo/ano) + filtro "serve na minha viatura" |
| 12 | **Stock** | **Controlado com alertas** (esgota sozinho e avisa quando fica baixo) |
| 13 | **Entrega do projeto** | **3 etapas** dentro do v1: 1) loja a vender · 2) viaturas novas · 3) remate |
| 14 | **Categorias** | Extras e acessórios · Detailing e limpeza · Peças e manutenção · Jantes e pneus · Merch e presentes · Eletrónica e som |
| 15 | **Portes** | **Por peso e zona** (continente, ilhas, países da UE) |
| 16 | **Devoluções** | Se for erro/defeito nosso, a garagem paga o porte; caso contrário, paga o cliente |
| 17 | **Marca da loja** | Tudo com a marca **Chikane Garage** (sem marca separada para a loja) |
| 18 | **Financiamento (novas)** | **Pedido de proposta** (sem simulador automático de prestações) |
| 19 | **Prazos** | **Sem pressa** — fazer bem, etapa a etapa |

---

## 3. Consequências a ter em conta ⚠️

1. **Vender para a Europa** obriga a regras de IVA por país (OSS): no continente o preço
   mostra IVA a 23%, mas numa venda para outro país da UE o IVA passa a ser o do cliente.
   O site fica preparado para isso (zona de envio por país, IVA por zona), mas **tem de ser
   validado com o contabilista**.
2. **Faturação fora do site:** o site tem de guardar e permitir exportar (CSV/PDF) os dados
   de cada encomenda: nome, NIF, morada, país, artigos, portes, IVA e forma de pagamento.
   Sem isso, emitir a fatura depois é um pesadelo.
3. **Devoluções (14 dias):** direito de livre resolução obrigatório em vendas à distância.
   Precisamos de: página de política, fluxo de pedido de devolução na conta do cliente,
   e estados no backoffice (pedido → recebido → reembolsado).
4. **Livro de reclamações eletrónico:** obrigatório; a página deve ficar ligada no rodapé.
5. **Devoluções e envios para a Europa:** quem paga o porte de devolução tem de ficar escrito
   (recomendação: cliente paga, salvo defeito).
6. **RGPD:** passam a ser recolhidos dados novos (moradas, telefone, NIF, histórico de
   compras) — a política de privacidade e os prazos de conservação têm de ser atualizados.

---

## 4. Mapa do site (rascunho) 🟡

### 4.1 Loja (novo)

| Página | O que faz |
|---|---|
| `/loja` | Montra: categorias, destaques, promoções |
| `/loja/[categoria]` | Listagem por categoria com filtros (preço, marca, tamanho, disponibilidade) |
| `/produto/[slug]` | Ficha do produto: imagens, variantes, stock, compatibilidade com viaturas, avaliações |
| `/carrinho` | Carrinho (convidado e com sessão) |
| `/checkout` | Dados de faturação/envio, portes, cupão, pagamento |
| `/encomenda/[numero]` | Confirmação + estado da encomenda (link público seguro por email) |
| `/envios-e-devolucoes` | Portes, prazos e política de devolução |
| `/faq` | Perguntas frequentes |

### 4.2 Viaturas (alterações)

| Página | O que muda |
|---|---|
| `/catalogo` | Filtro principal **Novos / Usados** (e manter os atuais) |
| `/catalogo/novos` · `/catalogo/usados` | Listagens próprias |
| `/catalogo/[slug]` | Ficha adaptada: usados (km, ano, matrícula, estado) / novos (garantia da marca, prazo de entrega, configuração) |
| *(futuro)* `/financiamento` | Simulador / pedido de proposta |

### 4.3 Área de cliente (atualizar)

| Página | O que faz |
|---|---|
| `/conta` | Resumo: encomendas recentes, reservas, test drives, favoritos |
| `/conta/encomendas` (+ `/[id]`) | Histórico, estado, rastreio, comprovativo, pedido de devolução |
| `/conta/favoritos` | Viaturas (e, a decidir, produtos) |
| `/conta/reservas` · `/conta/test-drives` | O que já existe, reorganizado |
| `/conta/dados` | Dados pessoais + dados fiscais (NIF) |
| `/conta/enderecos` | Moradas de envio/faturação |

### 4.4 Backoffice (novo + existente)

| Página | O que faz |
|---|---|
| `/admin/loja/produtos` (+ novo/editar) | Produtos, variantes, imagens, stock, compatibilidade |
| `/admin/loja/categorias` | Categorias/subcategorias e ordem na montra |
| `/admin/loja/stock` | Entradas/saídas e alertas de rutura |
| `/admin/loja/encomendas` (+ detalhe) | Estados, pagamento, envio, rastreio, notas, reembolsos |
| `/admin/loja/devolucoes` | Pedidos de devolução e reembolsos |
| `/admin/loja/cupoes` | Códigos de desconto (%, valor, mínimo, validade, limites) |
| `/admin/loja/portes` | Zonas (PT continente, ilhas, países da UE) e tabelas por peso/valor |
| `/admin/loja/clientes` | Clientes, histórico e exportação (para faturação externa) |
| `/admin/relatorios` | Vendas, produtos mais vendidos, IVA por período |
| `/admin/veiculos` | Passa a ter **Novo / Usado** e campos próprios de cada tipo |

---

## 5. Modelo de dados (rascunho) 🟡

> Segue o padrão atual: nomes em inglês, RLS em todas as tabelas, tudo acrescentado ao
> `supabase/setup.sql` (idempotente). Nada é aplicado sem autorização.

**Tabelas novas (loja):** `product_categories`, `products`, `product_variants`,
`product_images`, `product_compatibility`, `carts`, `cart_items`, `orders`, `order_items`,
`order_status_history`, `addresses`, `shipping_zones`, `shipping_rates`, `coupons`,
`coupon_uses`, `return_requests`, `return_items`.

**Tabelas novas (área de cliente / apoio):** `customer_profiles` (se não bastar `profiles`),
`email_log`.

**Alterações a tabelas existentes:**
- `vehicles` → acrescentar `condition` (`new` / `used`) + campos dos novos
  (garantia da marca, prazo de entrega, tipo de venda: stock/encomenda).
- `profiles` → NIF, telefone, dados fiscais opcionais.
- `favorites` → hoje aponta só a viaturas; estender a produtos é **alteração de lógica**
  (precisa de autorização própria).

**Decisão de base (recomendada):** uma só tabela de viaturas com `condition`, em vez de duas
tabelas separadas — evita duplicar catálogo, backoffice e listagens.

**Especificação completa das tabelas** (colunas, políticas RLS, índices e funções):
**`docs/MODELO_DADOS_LOJA.md`**.

---

## 6. Fluxos principais 🟡

1. **Compra na loja** — produto → carrinho → checkout (dados, portes, cupão) → pagamento
   (cartão / MB Way) → encomenda registada → email ao cliente e à garagem → preparação →
   envio + rastreio → entrega → (opcional) devolução em 14 dias. O checkout **não obriga a
   registo**; quem cria conta vê o histórico na área de cliente.
2. **Viatura nova em stock** — como uma usada: pedido de contacto, reserva ou test drive.
3. **Viatura nova por encomenda** — pedido de proposta → proposta → sinal → encomenda ao
   importador → prazo de entrega acompanhado na área de cliente.
4. **Viatura usada** — mantém o que existe (favoritos, pedido, reserva, test drive).
5. **Rutura de stock** — o stock é controlado por variante: ao esgotar, o produto deixa de
   poder ser comprado e a garagem recebe um aviso (stock baixo/rutura). O cliente pode pedir
   "avisar-me quando chegar".
6. **Compatibilidade** — nos produtos ligados ao catálogo, o cliente pode filtrar a loja por
   viatura (marca/modelo/ano) e ver logo se o artigo serve.

---

## 7. Fases de execução propostas (v1 em 3 etapas) 🟡

> O v1 inclui tudo o que escolheste; sugiro entregar em 3 etapas para teres a loja a vender
> mais cedo. Cada etapa é utilizável e pode ficar no ar sozinha.

| Etapa | Conteúdo | Resultado |
|---|---|---|
| **1. Loja a vender** | Categorias, produtos, variantes, stock, carrinho, checkout, pagamentos, encomendas + backoffice, cupões, portes (PT/UE), emails, área de cliente com encomendas | Já vendes extras/merch |
| **2. Viaturas novas** | Tipo novo/usado, fichas próprias, filtros Novos/Usados, stock vs encomenda, pedido de proposta | Catálogo completo |
| **3. Remate** | Devoluções, relatórios e IVA por período, SEO estruturado (schema.org), wishlist de produtos, avaliações, campanhas | Loja madura |

O **plano detalhado da Etapa 1** (tarefas, tabelas, critérios de aceitação) está em
**`docs/PLANO_ETAPA_1.md`**.

As **fases completas (0 a 5)**, com o que cada uma faz e como, estão em
**`docs/FASES.md`** — é o documento que manda na ordem da obra.

---

## 8. Regras para a execução (técnico)

- **Nova lógica exige autorização explícita do dono** (regra nº 1 do projeto).
- Tudo o que é base de dados vai para o **`supabase/setup.sql`** (ficheiro único e
  idempotente): `CREATE TABLE IF NOT EXISTS`, `DROP POLICY` + `CREATE POLICY`, RLS ativa.
- Server actions/rotas **revalidam sempre** a sessão e o papel de admin.
- Segredos só no worker/binding (nunca no código): chaves de pagamento, etc.
- Emails transacionais pelo **Resend** (já em uso).
- GA continua a carregar **só após consentimento** (`components/cookie-consent.tsx`).
- Não há testes automáticos no projeto: a validação é `npx tsc --noEmit`, `npm run lint`
  (com erros antigos conhecidos) e `npm run build`.
- Alterações de esquema são executadas **à mão no SQL Editor do Supabase**.

---

## 9. Definições fechadas e pendentes de execução

A estrutura, as regras e os fluxos estão **fechados** (secções 2 a 8). O que falta não são
decisões de estrutura, mas coisas que se resolvem durante o trabalho:

- [ ] Escolher os fornecedores de pagamento (cartão + MB Way) e criar as contas → **dono**.
- [ ] Textos legais da loja (termos de venda, envios e devoluções) → **dono**.
- [ ] Pesos e preços dos portes por zona (depende dos produtos reais).
- [ ] Subcategorias dentro das 6 categorias escolhidas.
- [ ] Conteúdo dos produtos (fotos, descrições, preços, stock) → **dono**.

---

## 10. Ações que só o dono pode fazer

- **Contas de pagamento** — cartão (Stripe ou equivalente) **+** MB Way/Multibanco (gateway
  português: Ifthenpay, Easypay, …). Exigem dados fiscais e conta bancária; a aprovação leva
  alguns dias, por isso vale a pena começar cedo.
- **Contabilista** — confirmar o IVA incluído, as regras de venda para a Europa (OSS) e o
  formato da fatura emitida fora do site (o que o site tem de exportar).
- **Textos legais** — termos de venda da loja, política de envios e devoluções (14 dias) e
  o livro de reclamações eletrónico (link no rodapé).
- **Conteúdo dos produtos** — fotografias, descrições, preços e stocks iniciais.
- **Identidade da loja** — nome/logótipo, caso seja diferente da garagem.

---

## 11. Notas

- A versão antiga deste projeto **já teve loja** (`shop_products`, `/loja`, `/admin/loja`,
  carrinho e `NEXT_PUBLIC_SHOP_ENABLED`) — está descrita no `DOCUMENTO_PROJETO.txt` e serve
  de referência histórica (não é para copiar tal e qual).
- Documentação relacionada: `docs/REGRAS_PARA_IA.md`, `docs/GUIA_LAYOUTS.md`,
  `docs/VARIAVEIS_AMBIENTE.md`, `docs/COLOCAR_NO_AR.md`.
