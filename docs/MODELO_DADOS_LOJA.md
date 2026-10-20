# Modelo de dados da loja — especificação

> **Especificação em papel. Nada foi criado na base de dados.**
> Quando a implementação arrancar (depois dos layouts), isto passa para o
> `supabase/setup.sql` — o ficheiro único e idempotente do projeto.
>
> **Estado:** definido, por implementar · **Data:** 15/10/2026
> Contexto: `docs/PLANO_LOJA.md` (âmbito) e `docs/PLANO_ETAPA_1.md` (etapa 1).

---

## 1. Convenções (iguais às do esquema atual)

| Regra | Como |
|---|---|
| Nomes | `public.` + snake_case, em inglês (como `vehicles`, `contact_requests`) |
| Chaves | `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| Dinheiro | `NUMERIC`; **preço guardado com IVA incluído** + `vat_rate NUMERIC NOT NULL DEFAULT 23` |
| Estados | `TEXT` + `CHECK (coluna IN (...))` (como `vehicles.status`) |
| Datas | `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()` |
| Texto opcional | `TEXT DEFAULT ''`; booleanos `DEFAULT false` |
| Relações | `REFERENCES public.tabela(id) ON DELETE CASCADE` (ou `SET NULL` quando o histórico deve sobreviver) |
| Segurança | RLS ativa em **todas** as tabelas; nomes no padrão atual (`x_select`, `x_select_own`, `x_insert_anon`, `x_insert_admin`, `x_update_admin`, `x_delete_admin`) |
| Administração | `EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')` |
| Fotografias | Cloudflare R2, reaproveitando o binding e o bucket existentes (pasta nova, ex.: `produtos/`) |
| Implementação | `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DROP POLICY IF EXISTS` + `CREATE POLICY`, `CREATE INDEX IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION` |

**Decisão importante:** **todos os produtos têm pelo menos uma variante** (o produto simples
tem uma variante "Único"). Assim o carrinho, o stock e as linhas de encomenda apontam sempre
para uma variante, e não há dois caminhos no código.

---

## 2. Tabelas novas

### 2.1 `product_categories` — categorias e subcategorias

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID | chave primária |
| `slug` | TEXT UNIQUE NOT NULL | ex.: `extras-e-acessorios` |
| `name` | TEXT NOT NULL | ex.: "Extras e acessórios" |
| `description` | TEXT DEFAULT '' | texto de topo da categoria |
| `parent_id` | UUID → `product_categories(id)` ON DELETE SET NULL | subcategorias (nulo = categoria principal) |
| `image_url` | TEXT DEFAULT '' | imagem de capa (R2) |
| `position` | INT DEFAULT 0 | ordem na montra |
| `is_active` | BOOLEAN NOT NULL DEFAULT true | esconder sem apagar |
| `created_at` / `updated_at` | TIMESTAMPTZ | automáticos |

As 6 categorias decididas: Extras e acessórios · Detailing e limpeza · Peças e manutenção ·
Jantes e pneus · Merch e presentes · Eletrónica e som.

### 2.2 `products` — produto

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID | chave primária |
| `slug` | TEXT UNIQUE NOT NULL | URL da ficha |
| `category_id` | UUID → `product_categories(id)` ON DELETE SET NULL | categoria |
| `name` | TEXT NOT NULL | nome comercial |
| `brand_id` | UUID → `brands(id)` ON DELETE SET NULL | marca do artigo (não confundir com a marca da viatura) |
| `short_description` | TEXT DEFAULT '' | resumo na listagem |
| `description` | TEXT DEFAULT '' | descrição completa |
| `price` | NUMERIC NOT NULL DEFAULT 0 | **com IVA incluído** |
| `compare_at_price` | NUMERIC | preço antigo (para mostrar desconto) |
| `vat_rate` | NUMERIC NOT NULL DEFAULT 23 | taxa aplicada |
| `weight_grams` | INT NOT NULL DEFAULT 0 | usado nos portes |
| `length_mm` `width_mm` `height_mm` | INT | opcional (portes volumétricos) |
| `sku` | TEXT DEFAULT '' | referência interna |
| `status` | TEXT DEFAULT 'active' | `draft` · `active` · `archived` |
| `stock_mode` | TEXT DEFAULT 'managed' | `managed` · `unlimited` · `on_request` |
| `low_stock_threshold` | INT NOT NULL DEFAULT 3 | alerta de stock baixo |
| `is_featured` | BOOLEAN DEFAULT false | destaque na montra |
| `is_new` | BOOLEAN DEFAULT false | etiqueta "novo" |
| `meta_title` / `meta_description` | TEXT DEFAULT '' | SEO |
| `published_at` | TIMESTAMPTZ DEFAULT NOW() | — |
| `created_at` / `updated_at` | TIMESTAMPTZ | automáticos |

### 2.3 `product_variants` — variante (tamanho, cor, …)

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID | chave primária |
| `product_id` | UUID NOT NULL → `products(id)` ON DELETE CASCADE | pai |
| `name` | TEXT NOT NULL | ex.: "Preto / M" ou "Único" |
| `option1_name` / `option1_value` | TEXT DEFAULT '' | ex.: `Cor` / `Preto` |
| `option2_name` / `option2_value` | TEXT DEFAULT '' | ex.: `Tamanho` / `M` (máx. 2 opções) |
| `sku` | TEXT DEFAULT '' | referência |
| `price_delta` | NUMERIC NOT NULL DEFAULT 0 | diferença face ao preço do produto |
| `stock_quantity` | INT NOT NULL DEFAULT 0 | stock real |
| `weight_grams` | INT | se for diferente do produto |
| `position` | INT DEFAULT 0 | ordem |
| `is_active` | BOOLEAN NOT NULL DEFAULT true | — |
| `created_at` / `updated_at` | TIMESTAMPTZ | automáticos |

### 2.4 `product_images`

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID | chave primária |
| `product_id` | UUID NOT NULL → `products(id)` ON DELETE CASCADE | — |
| `url` | TEXT NOT NULL | ficheiro no R2 |
| `position` | INT DEFAULT 0 | ordem na galeria |
| `alt_text` | TEXT DEFAULT '' | acessibilidade/SEO |

### 2.5 `product_compatibility` — "serve nesta viatura"

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID | chave primária |
| `product_id` | UUID NOT NULL → `products(id)` ON DELETE CASCADE | — |
| `brand` | TEXT NOT NULL | marca (ex.: BMW) |
| `model` | TEXT NOT NULL | modelo (ex.: X1) |
| `year_from` / `year_to` | INT | intervalo de anos (nulos = todos) |
| `notes` | TEXT DEFAULT '' | ex.: "só versões xDrive" |
| `created_at` | TIMESTAMPTZ DEFAULT NOW() | — |

### 2.6 `carts` — carrinho de cliente com sessão

> **Só para clientes com conta.** O carrinho dos convidados fica no browser (cookie) e os
> preços/stock são sempre reconfirmados no servidor — evita expor carrinhos a quem não tem
> sessão, dado que o projeto usa apenas a chave pública (anon).

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID | chave primária |
| `user_id` | UUID NOT NULL → `auth.users(id)` ON DELETE CASCADE | dono |
| `status` | TEXT DEFAULT 'open' | `open` · `converted` · `abandoned` |
| `created_at` / `updated_at` | TIMESTAMPTZ | automáticos |
| — | — | um carrinho `open` por utilizador |

### 2.7 `cart_items`

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID | chave primária |
| `cart_id` | UUID NOT NULL → `carts(id)` ON DELETE CASCADE | — |
| `product_id` | UUID NOT NULL → `products(id)` ON DELETE CASCADE | — |
| `variant_id` | UUID NOT NULL → `product_variants(id)` ON DELETE CASCADE | — |
| `quantity` | INT NOT NULL DEFAULT 1 | `CHECK (quantity > 0)` |
| `created_at` / `updated_at` | TIMESTAMPTZ | — |
| — | — | `UNIQUE(cart_id, variant_id)` |

### 2.8 `orders` — encomenda

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID | chave primária |
| `order_number` | TEXT UNIQUE NOT NULL | ex.: `CG-2026-0001` (gerado por função/sequência) |
| `access_token` | TEXT UNIQUE NOT NULL | link seguro do comprovativo (vai no email) |
| `user_id` | UUID → `auth.users(id)` ON DELETE SET NULL | nulo em compras de convidado |
| `customer_name` / `customer_email` / `customer_phone` | TEXT | dados de contacto |
| `nif` | TEXT DEFAULT '' | para a fatura emitida fora do site |
| `shipping_name` `shipping_line1` `shipping_line2` `shipping_city` `shipping_postal_code` `shipping_country` `shipping_phone` | TEXT | cópia da morada (imutável) |
| `billing_same_as_shipping` | BOOLEAN NOT NULL DEFAULT true | — |
| `billing_*` | TEXT | mesmo conjunto, para faturação |
| `subtotal` `discount_total` `shipping_total` `vat_total` `total` | NUMERIC NOT NULL DEFAULT 0 | valores finais (com IVA) |
| `coupon_id` | UUID → `coupons(id)` ON DELETE SET NULL | — |
| `coupon_code` | TEXT DEFAULT '' | cópia do código usado |
| `shipping_zone_id` | UUID → `shipping_zones(id)` ON DELETE SET NULL | zona aplicada |
| `shipping_rate_name` | TEXT DEFAULT '' | ex.: "até 2 kg" |
| `shipping_weight_grams` | INT DEFAULT 0 | peso total usado no cálculo |
| `payment_method` | TEXT | `card` · `mb_way` · `multibanco` |
| `payment_status` | TEXT DEFAULT 'pending' | `pending` · `paid` · `failed` · `refunded` · `partially_refunded` |
| `payment_provider` / `payment_reference` | TEXT DEFAULT '' | gateway + referência |
| `paid_at` | TIMESTAMPTZ | quando foi confirmado |
| `status` | TEXT DEFAULT 'pending_payment' | `pending_payment` · `paid` · `preparing` · `shipped` · `delivered` · `cancelled` · `refunded` · `returned` |
| `tracking_number` / `tracking_url` | TEXT DEFAULT '' | envio |
| `shipped_at` / `delivered_at` | TIMESTAMPTZ | — |
| `customer_note` / `admin_note` | TEXT DEFAULT '' | notas |
| `created_at` / `updated_at` | TIMESTAMPTZ | — |

### 2.9 `order_items` — linhas da encomenda (cópia histórica)

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID | chave primária |
| `order_id` | UUID NOT NULL → `orders(id)` ON DELETE CASCADE | — |
| `product_id` | UUID → `products(id)` ON DELETE SET NULL | pode deixar de existir |
| `variant_id` | UUID → `product_variants(id)` ON DELETE SET NULL | idem |
| `product_name` / `variant_name` / `sku` | TEXT | cópia no momento da compra |
| `unit_price` | NUMERIC NOT NULL | preço unitário (com IVA) |
| `quantity` | INT NOT NULL | `CHECK (quantity > 0)` |
| `vat_rate` | NUMERIC NOT NULL DEFAULT 23 | — |
| `line_total` | NUMERIC NOT NULL | preço × quantidade |
| `weight_grams` | INT DEFAULT 0 | — |

### 2.10 `order_status_history` — auditoria de estados

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID | chave primária |
| `order_id` | UUID NOT NULL → `orders(id)` ON DELETE CASCADE | — |
| `status` | TEXT NOT NULL | estado novo |
| `note` | TEXT DEFAULT '' | motivo/observação |
| `created_by` | UUID → `auth.users(id)` ON DELETE SET NULL | quem mudou |
| `created_at` | TIMESTAMPTZ DEFAULT NOW() | — |

### 2.11 `addresses` — moradas guardadas do cliente

`id` · `user_id` (NOT NULL, CASCADE) · `label` · `name` · `phone` · `line1` · `line2` ·
`city` · `postal_code` · `country` (ISO, ex.: `PT`) · `is_default_shipping` · `is_default_billing` ·
`created_at` · `updated_at`

### 2.12 `shipping_zones` — zonas de envio

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID | chave primária |
| `name` | TEXT NOT NULL | ex.: "Portugal continental", "Ilhas", "Espanha" |
| `country_codes` | TEXT NOT NULL | lista de códigos separada por vírgulas (ex.: `PT`, `ES`, `BE,FR,DE`) |
| `postal_code_from` / `postal_code_to` | TEXT DEFAULT '' | intervalo de códigos postais (ex.: Madeira `9000`–`9499`); vazio = toda a zona. As zonas com intervalo são verificadas primeiro |
| `position` | INT DEFAULT 0 | ordem de apresentação |
| `is_active` | BOOLEAN NOT NULL DEFAULT true | — |
| `created_at` / `updated_at` | TIMESTAMPTZ | — |

### 2.13 `shipping_rates` — tabela de preços por peso

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID | chave primária |
| `zone_id` | UUID NOT NULL → `shipping_zones(id)` ON DELETE CASCADE | — |
| `name` | TEXT DEFAULT '' | ex.: "até 2 kg" |
| `weight_from_grams` | INT NOT NULL DEFAULT 0 | início da faixa |
| `weight_to_grams` | INT | fim da faixa (nulo = sem limite) |
| `price` | NUMERIC NOT NULL DEFAULT 0 | valor dos portes |
| `delivery_days_min` / `delivery_days_max` | INT | prazo estimado mostrado ao cliente |
| `is_active` | BOOLEAN NOT NULL DEFAULT true | — |
| `position` | INT DEFAULT 0 | — |

### 2.14 `coupons` — códigos de desconto

`id` · `code` (TEXT UNIQUE NOT NULL, guardado em maiúsculas) · `description` ·
`discount_type` (`percent` · `fixed` · `free_shipping`) · `discount_value` (NUMERIC NOT NULL DEFAULT 0) ·
`min_order_total` (NUMERIC DEFAULT 0) · `max_uses` (INT, nulo = ilimitado) ·
`max_uses_per_customer` (INT DEFAULT 1) · `uses_count` (INT NOT NULL DEFAULT 0) ·
`starts_at` / `ends_at` (TIMESTAMPTZ) · `applies_to` (TEXT DEFAULT 'all':
`all` · `categories` · `products` — os dois últimos ficam para a Etapa 3) ·
`is_active` (BOOLEAN NOT NULL DEFAULT true) · `created_at` / `updated_at`

### 2.15 `coupon_uses` — utilizações

`id` · `coupon_id` (NOT NULL, CASCADE) · `order_id` (NOT NULL, CASCADE) ·
`user_id` (nulo em convidados) · `email` · `discount_total` (NUMERIC) · `created_at`

### 2.16 `stock_movements` — auditoria de stock

`id` · `variant_id` (NOT NULL, CASCADE) · `delta` (INT NOT NULL; positivo = entrada) ·
`reason` (`sale` · `return` · `adjustment` · `restock` · `cancel`) · `order_id` (SET NULL) ·
`note` · `created_by` (SET NULL) · `created_at`

### 2.17 `back_in_stock_requests` — "avisar-me quando chegar"

`id` · `product_id` (NOT NULL, CASCADE) · `variant_id` (SET NULL) · `email` (NOT NULL) ·
`notified_at` (TIMESTAMPTZ) · `created_at` · `UNIQUE(email, variant_id)`

### 2.18 `email_log` — registo de emails enviados

`id` · `to_email` (NOT NULL) · `subject` · `template` · `order_id` (SET NULL) ·
`status` (`sent` · `failed`) · `error` · `provider_id` · `created_at`

---

## 3. Alterações a tabelas existentes

| Tabela | Alteração | Porquê |
|---|---|---|
| `profiles` | `ADD COLUMN IF NOT EXISTS nif TEXT DEFAULT ''` | fatura (emitida fora do site) |
| `profiles` | `ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'PT'` | morada/IVA |
| `vehicles` | `ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'used'` com `CHECK (condition IN ('new','used'))` | viaturas novas vs usadas |
| `vehicles` | `ADD COLUMN IF NOT EXISTS sale_type TEXT DEFAULT 'stock'` com `CHECK (sale_type IN ('stock','on_order'))` | stock próprio vs por encomenda |
| `vehicles` | `ADD COLUMN IF NOT EXISTS brand_warranty_months INT` | garantia da marca (novas) |
| `vehicles` | `ADD COLUMN IF NOT EXISTS delivery_estimate_days INT` | prazo de entrega (por encomenda) |
| `vehicles` | `ADD COLUMN IF NOT EXISTS config_summary TEXT DEFAULT ''` | resumo de configuração (novas) |

`favorites` fica **como está** nesta fase (guardar produtos é Etapa 3 e exige autorização,
por ser alteração de lógica).

---

## 4. Políticas de acesso (RLS)

| Tabela | Público (anon) | Cliente com conta | Administrador |
|---|---|---|---|
| `product_categories` | ler | ler | criar/editar/apagar |
| `products` (só `status = 'active'`) | ler | ler | tudo |
| `product_variants` (só `is_active`) | ler | ler | tudo |
| `product_images` | ler | ler | tudo |
| `product_compatibility` | ler | ler | tudo |
| `shipping_zones` / `shipping_rates` | ler | ler | tudo |
| `carts` / `cart_items` | — | só as suas | ler |
| `orders` / `order_items` | criar (checkout) · ler via função com `access_token` | as suas | tudo |
| `order_status_history` | — | as suas encomendas | tudo |
| `addresses` | — | só as suas | ler |
| `coupons` | — (validado por função) | — | tudo |
| `coupon_uses` | — | — | ler |
| `stock_movements` | — | — | tudo |
| `back_in_stock_requests` | criar | criar | ler/editar |
| `email_log` | — | — | ler |

**Regra de ouro do projeto (mantém-se):** as ações de servidor e as rotas revalidam sempre a
sessão e o papel de admin, mesmo que o `proxy.ts` já proteja as páginas.

---

## 5. Índices previstos

`products(category_id)`, `products(status)`, `products(slug)` (já único),
`product_variants(product_id)`, `product_images(product_id)`,
`product_compatibility(brand, model)`, `carts(user_id)`, `cart_items(cart_id)`,
`orders(user_id)`, `orders(status)`, `orders(created_at)`, `order_items(order_id)`,
`addresses(user_id)`, `shipping_rates(zone_id)`, `coupons(code)` (já único),
`stock_movements(variant_id)`, `back_in_stock_requests(email)`.

---

## 6. Funções (RPC) previstas

Seguindo o padrão do projeto (as leituras sensíveis passam por funções, não por políticas
impossíveis de verificar):

| Função | Para que serve |
|---|---|
| `next_order_number()` | gerar `CG-AAAA-NNNN` com segurança (sequência) |
| `get_order_by_token(token)` | mostrar o comprovativo a um convidado sem sessão |
| `place_order(...)` | criar a encomenda com validação de preços, stock e portes no servidor |
| `apply_stock_movement(variant_id, delta, reason)` | atualizar stock e registar o movimento |
| `validate_coupon(code, subtotal, email)` | validar cupão (validade, mínimo, utilizações) |
| `shipping_quote(country, weight_grams, subtotal)` | devolver os portes aplicáveis |
| `mark_order_paid(reference, provider)` | confirmar pagamento (chamado pelo webhook) |

---

## 7. Decisões técnicas a fechar na Etapa 1 (com o dono)

1. **Confirmação de pagamentos (webhook)** — o projeto usa **apenas a chave pública**, o que
   impede guardar segredos na base de dados. Opções: (a) funções `SECURITY DEFINER` protegidas
   por um segredo comparado com valor em tabela **sem leitura pública**; (b) usar a chave de
   serviço **só** nas rotas de webhook. A opção (b) é mais simples, mas **altera a regra do
   projeto** — exige autorização explícita tua.
2. **Carrinho de convidado no browser** (decisão proposta acima) — confirmar.
3. **Fotografias dos produtos** — reaproveitar o bucket/binding atuais (`vehicle-images`) numa
   pasta `produtos/`, ou criar um bucket novo.
4. **Gateway de MB Way** — escolher entre Ifthenpay, Easypay ou equivalente (custo por
   transação e API variam).

---

## 8. Checklist de implementação (quando for autorizado)

1. Acrescentar as tabelas novas ao `supabase/setup.sql` (todas com `IF NOT EXISTS`).
2. Acrescentar os `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` às tabelas existentes.
3. Criar o `CHECK` de `vehicles.condition` com `DROP CONSTRAINT IF EXISTS` antes.
4. Criar índices, políticas (com `DROP POLICY IF EXISTS` antes) e RPCs.
5. Conceder permissões a `anon`/`authenticated` (só o necessário: leitura da loja e criação
   de encomenda/pedidos de aviso).
6. Fortalecer o `RLS` em todas as tabelas novas.
7. **Correr à mão no SQL Editor do Supabase** (o projeto não tem CLI) — é idempotente.
8. Validar: `npx tsc --noEmit`, `npm run lint` (sem erros novos) e `npm run build`.

---

## 9. Notas

- Nada disto está criado na base de dados nem no código: é a especificação para execução.
- Qualquer desvio a esta especificação deve ser registado aqui primeiro.
- Documentos relacionados: `docs/PLANO_LOJA.md`, `docs/PLANO_ETAPA_1.md`,
  `docs/REGRAS_PARA_IA.md`.
