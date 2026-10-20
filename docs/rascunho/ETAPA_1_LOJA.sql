-- ============================================================================
--  RASCUNHO - LOJA (ETAPA 1) - **NAO CORRER**
-- ============================================================================
--  O que e isto:
--    Especificacao executavel da loja, ja no estilo do `supabase/setup.sql`,
--    para o dia em que o dono autorizar. NAO faz parte do site e NAO deve ser
--    corrido a partir daqui: foi criado em `docs/rascunho/` de proposito.
--
--  Como sera usado (quando for autorizado):
--    1. Copiar o conteudo para o fim do `supabase/setup.sql` (ficheiro unico).
--    2. Correr a mao no SQL Editor do Supabase (o projeto nao tem CLI).
--    3. Apagar este rascunho.
--
--  Garantias:
--    - So usa CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / DROP IF EXISTS.
--    - Nao apaga nem altera dados existentes.
--    - RLS ativa em todas as tabelas novas, com politicas explicitas.
--
--  Situacao: rascunho de 15/10/2026. Sintaxe validada com libpg_query.
--  A logica de `place_order` TEM DE SER TESTADA antes de entrar em producao.
--
--  Referencias: docs/MODELO_DADOS_LOJA.md · docs/PLANO_ETAPA_1.md
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Marcas (filtro da loja)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT DEFAULT '',
  position INT DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. Categorias de produto (com subcategorias)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  parent_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  image_url TEXT DEFAULT '',
  position INT DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. Produtos (preco COM IVA incluido)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  short_description TEXT DEFAULT '',
  description TEXT DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  compare_at_price NUMERIC,
  vat_rate NUMERIC NOT NULL DEFAULT 23,
  weight_grams INT NOT NULL DEFAULT 0,
  length_mm INT,
  width_mm INT,
  height_mm INT,
  sku TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  stock_mode TEXT DEFAULT 'managed',
  low_stock_threshold INT NOT NULL DEFAULT 3,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_new BOOLEAN NOT NULL DEFAULT false,
  meta_title TEXT DEFAULT '',
  meta_description TEXT DEFAULT '',
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT products_status_check CHECK (status IN ('draft','active','archived')),
  CONSTRAINT products_stock_mode_check CHECK (stock_mode IN ('managed','unlimited','on_request'))
);

-- ----------------------------------------------------------------------------
-- 4. Variantes (cor e/ou tamanho; todos os produtos tem pelo menos uma)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  option1_name TEXT DEFAULT '',
  option1_value TEXT DEFAULT '',
  option2_name TEXT DEFAULT '',
  option2_value TEXT DEFAULT '',
  sku TEXT DEFAULT '',
  price_delta NUMERIC NOT NULL DEFAULT 0,
  stock_quantity INT NOT NULL DEFAULT 0,
  weight_grams INT,
  position INT DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. Fotografias dos produtos (ficheiros no Cloudflare R2)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INT DEFAULT 0,
  alt_text TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 6. Compatibilidade com viaturas ("serve nesta viatura")
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_compatibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year_from INT,
  year_to INT,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 7. Carrinho (apenas clientes com conta; convidados usam carrinho no browser)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT carts_status_check CHECK (status IN ('open','converted','abandoned'))
);

CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT cart_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT cart_items_unique UNIQUE (cart_id, variant_id)
);

-- ----------------------------------------------------------------------------
-- 8. Encomendas
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  access_token TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT DEFAULT '',
  nif TEXT DEFAULT '',
  shipping_name TEXT DEFAULT '',
  shipping_line1 TEXT DEFAULT '',
  shipping_line2 TEXT DEFAULT '',
  shipping_city TEXT DEFAULT '',
  shipping_postal_code TEXT DEFAULT '',
  shipping_country TEXT DEFAULT 'PT',
  shipping_phone TEXT DEFAULT '',
  billing_same_as_shipping BOOLEAN NOT NULL DEFAULT true,
  billing_name TEXT DEFAULT '',
  billing_line1 TEXT DEFAULT '',
  billing_line2 TEXT DEFAULT '',
  billing_city TEXT DEFAULT '',
  billing_postal_code TEXT DEFAULT '',
  billing_country TEXT DEFAULT 'PT',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount_total NUMERIC NOT NULL DEFAULT 0,
  shipping_total NUMERIC NOT NULL DEFAULT 0,
  vat_total NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  coupon_code TEXT DEFAULT '',
  shipping_zone_id UUID REFERENCES public.shipping_zones(id) ON DELETE SET NULL,
  shipping_rate_name TEXT DEFAULT '',
  shipping_weight_grams INT DEFAULT 0,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  payment_provider TEXT DEFAULT '',
  payment_reference TEXT DEFAULT '',
  paid_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending_payment',
  tracking_number TEXT DEFAULT '',
  tracking_url TEXT DEFAULT '',
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  customer_note TEXT DEFAULT '',
  admin_note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT orders_payment_method_check CHECK (payment_method IS NULL OR payment_method IN ('card','mb_way','multibanco')),
  CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('pending','paid','failed','refunded','partially_refunded')),
  CONSTRAINT orders_status_check CHECK (status IN ('pending_payment','paid','preparing','shipped','delivered','cancelled','refunded','returned'))
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  variant_name TEXT DEFAULT '',
  sku TEXT DEFAULT '',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  quantity INT NOT NULL DEFAULT 1,
  vat_rate NUMERIC NOT NULL DEFAULT 23,
  line_total NUMERIC NOT NULL DEFAULT 0,
  weight_grams INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT order_items_quantity_check CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 9. Moradas do cliente
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT DEFAULT '',
  name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  line1 TEXT DEFAULT '',
  line2 TEXT DEFAULT '',
  city TEXT DEFAULT '',
  postal_code TEXT DEFAULT '',
  country TEXT DEFAULT 'PT',
  is_default_shipping BOOLEAN NOT NULL DEFAULT false,
  is_default_billing BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 10. Portes - zonas e tabelas por peso
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shipping_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country_codes TEXT NOT NULL,
  postal_code_from TEXT DEFAULT '',
  postal_code_to TEXT DEFAULT '',
  position INT DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shipping_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES public.shipping_zones(id) ON DELETE CASCADE,
  name TEXT DEFAULT '',
  weight_from_grams INT NOT NULL DEFAULT 0,
  weight_to_grams INT,
  price NUMERIC NOT NULL DEFAULT 0,
  delivery_days_min INT,
  delivery_days_max INT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 11. Cupoes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  discount_type TEXT NOT NULL DEFAULT 'percent',
  discount_value NUMERIC NOT NULL DEFAULT 0,
  min_order_total NUMERIC DEFAULT 0,
  max_uses INT,
  max_uses_per_customer INT DEFAULT 1,
  uses_count INT NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  applies_to TEXT DEFAULT 'all',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT coupons_discount_type_check CHECK (discount_type IN ('percent','fixed','free_shipping')),
  CONSTRAINT coupons_applies_to_check CHECK (applies_to IN ('all','categories','products'))
);

CREATE TABLE IF NOT EXISTS public.coupon_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT DEFAULT '',
  discount_total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 12. Stock - movimentos e reservas durante o pagamento
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  delta INT NOT NULL,
  reason TEXT NOT NULL DEFAULT 'adjustment',
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  note TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT stock_movements_reason_check CHECK (reason IN ('sale','return','adjustment','restock','cancel'))
);

CREATE TABLE IF NOT EXISTS public.stock_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  reference TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT stock_holds_quantity_check CHECK (quantity > 0)
);

-- ----------------------------------------------------------------------------
-- 13. "Avisar-me quando chegar" e registo de emails
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.back_in_stock_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT back_in_stock_unique UNIQUE (email, variant_id)
);

CREATE TABLE IF NOT EXISTS public.email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email TEXT NOT NULL,
  subject TEXT DEFAULT '',
  template TEXT DEFAULT '',
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'sent',
  error TEXT DEFAULT '',
  provider_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT email_log_status_check CHECK (status IN ('sent','failed'))
);

-- ----------------------------------------------------------------------------
-- 14. Devolucoes (Etapa 3 - ja especificado)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.return_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  reason TEXT DEFAULT '',
  fault TEXT DEFAULT 'customer',
  status TEXT DEFAULT 'requested',
  refund_total NUMERIC NOT NULL DEFAULT 0,
  return_tracking TEXT DEFAULT '',
  admin_note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT return_requests_fault_check CHECK (fault IN ('customer','shop')),
  CONSTRAINT return_requests_status_check CHECK (status IN ('requested','approved','received','refunded','rejected'))
);

CREATE TABLE IF NOT EXISTS public.return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES public.return_requests(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  condition TEXT DEFAULT '',
  restock BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT return_items_quantity_check CHECK (quantity > 0)
);

-- ----------------------------------------------------------------------------
-- 15. Definicoes da loja (uma unica linha, editavel no backoffice)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shop_settings (
  id INT PRIMARY KEY DEFAULT 1,
  free_shipping_above NUMERIC NOT NULL DEFAULT 0,
  stock_hold_minutes INT NOT NULL DEFAULT 15,
  low_stock_default INT NOT NULL DEFAULT 3,
  returns_days INT NOT NULL DEFAULT 14,
  support_email TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT shop_settings_single_row CHECK (id = 1)
);

-- ============================================================================
-- 16. Alteracoes a tabelas existentes
-- ============================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nif TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'PT';

ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'used';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS sale_type TEXT DEFAULT 'stock';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS brand_warranty_months INT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS delivery_estimate_days INT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS config_summary TEXT DEFAULT '';

ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_condition_check;
ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_condition_check CHECK (condition IN ('new','used'));
ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_sale_type_check;
ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_sale_type_check CHECK (sale_type IN ('stock','on_order'));


-- ============================================================================
-- 17. Indices
-- ============================================================================
-- Regra: um indice por "consulta quente" (as que correm em cada visita),
-- composto quando a consulta filtra e ordena pelo mesmo caminho.

-- Montra da loja (leitura publica, corre sempre)
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_status_published ON public.products(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants(product_id, is_active);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id, position);
CREATE INDEX IF NOT EXISTS idx_product_compatibility_model ON public.product_compatibility(brand, model);
CREATE INDEX IF NOT EXISTS idx_product_compatibility_product ON public.product_compatibility(product_id);

-- Carrinho e conta
CREATE INDEX IF NOT EXISTS idx_carts_user ON public.carts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON public.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON public.addresses(user_id);

-- Encomendas (area de cliente e backoffice)
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_reference ON public.orders(payment_reference);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_history_order ON public.order_status_history(order_id);

-- Portes, cupoes e stock
CREATE INDEX IF NOT EXISTS idx_shipping_rates_zone ON public.shipping_rates(zone_id, weight_from_grams);
CREATE INDEX IF NOT EXISTS idx_coupon_uses_coupon ON public.coupon_uses(coupon_id, email);
CREATE INDEX IF NOT EXISTS idx_stock_movements_variant ON public.stock_movements(variant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_holds_variant ON public.stock_holds(variant_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_stock_holds_expires ON public.stock_holds(expires_at);
CREATE INDEX IF NOT EXISTS idx_back_in_stock_email ON public.back_in_stock_requests(email);
CREATE INDEX IF NOT EXISTS idx_return_requests_order ON public.return_requests(order_id);


-- ============================================================================
-- 18. RLS - ativar em todas as tabelas novas
-- ============================================================================
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_compatibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.back_in_stock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 19. Politicas
-- ============================================================================
-- Nota: o servidor escreve com a chave publica (anon) e as acoes de servidor
-- revalidam sempre a sessao/papel - e o padrao do resto do projeto.
-- O comprovativo de convidado e lido pela funcao `get_order_by_token`,
-- para nunca se expor a tabela `orders` ao publico.

-- 19.1 Leitura publica (catalogo e definicoes)
DROP POLICY IF EXISTS "brands_select_public" ON public.brands;
CREATE POLICY "brands_select_public" ON public.brands FOR SELECT USING (is_active);

DROP POLICY IF EXISTS "product_categories_select_public" ON public.product_categories;
CREATE POLICY "product_categories_select_public" ON public.product_categories FOR SELECT USING (is_active);

DROP POLICY IF EXISTS "products_select_public" ON public.products;
CREATE POLICY "products_select_public" ON public.products FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "product_variants_select_public" ON public.product_variants;
CREATE POLICY "product_variants_select_public" ON public.product_variants FOR SELECT USING (is_active);

DROP POLICY IF EXISTS "product_images_select_public" ON public.product_images;
CREATE POLICY "product_images_select_public" ON public.product_images FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.status = 'active'));

DROP POLICY IF EXISTS "product_compatibility_select_public" ON public.product_compatibility;
CREATE POLICY "product_compatibility_select_public" ON public.product_compatibility FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.status = 'active'));

DROP POLICY IF EXISTS "shipping_zones_select_public" ON public.shipping_zones;
CREATE POLICY "shipping_zones_select_public" ON public.shipping_zones FOR SELECT USING (is_active);

DROP POLICY IF EXISTS "shipping_rates_select_public" ON public.shipping_rates;
CREATE POLICY "shipping_rates_select_public" ON public.shipping_rates FOR SELECT USING (is_active);

DROP POLICY IF EXISTS "shop_settings_select_public" ON public.shop_settings;
CREATE POLICY "shop_settings_select_public" ON public.shop_settings FOR SELECT USING (true);

-- 19.2 Administracao
DROP POLICY IF EXISTS "brands_admin_all" ON public.brands;
CREATE POLICY "brands_admin_all" ON public.brands FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "product_categories_admin_all" ON public.product_categories;
CREATE POLICY "product_categories_admin_all" ON public.product_categories FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "products_admin_all" ON public.products;
CREATE POLICY "products_admin_all" ON public.products FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "product_variants_admin_all" ON public.product_variants;
CREATE POLICY "product_variants_admin_all" ON public.product_variants FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "product_images_admin_all" ON public.product_images;
CREATE POLICY "product_images_admin_all" ON public.product_images FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "product_compatibility_admin_all" ON public.product_compatibility;
CREATE POLICY "product_compatibility_admin_all" ON public.product_compatibility FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "shipping_zones_admin_all" ON public.shipping_zones;
CREATE POLICY "shipping_zones_admin_all" ON public.shipping_zones FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "shipping_rates_admin_all" ON public.shipping_rates;
CREATE POLICY "shipping_rates_admin_all" ON public.shipping_rates FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "coupons_admin_all" ON public.coupons;
CREATE POLICY "coupons_admin_all" ON public.coupons FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "coupon_uses_admin_all" ON public.coupon_uses;
CREATE POLICY "coupon_uses_admin_all" ON public.coupon_uses FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "stock_movements_admin_all" ON public.stock_movements;
CREATE POLICY "stock_movements_admin_all" ON public.stock_movements FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "stock_holds_admin_all" ON public.stock_holds;
CREATE POLICY "stock_holds_admin_all" ON public.stock_holds FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "back_in_stock_admin_all" ON public.back_in_stock_requests;
CREATE POLICY "back_in_stock_admin_all" ON public.back_in_stock_requests FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "email_log_admin_all" ON public.email_log;
CREATE POLICY "email_log_admin_all" ON public.email_log FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "orders_admin_all" ON public.orders;
CREATE POLICY "orders_admin_all" ON public.orders FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "order_items_admin_all" ON public.order_items;
CREATE POLICY "order_items_admin_all" ON public.order_items FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "order_history_admin_all" ON public.order_status_history;
CREATE POLICY "order_history_admin_all" ON public.order_status_history FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "addresses_admin_all" ON public.addresses;
CREATE POLICY "addresses_admin_all" ON public.addresses FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "return_requests_admin_all" ON public.return_requests;
CREATE POLICY "return_requests_admin_all" ON public.return_requests FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "return_items_admin_all" ON public.return_items;
CREATE POLICY "return_items_admin_all" ON public.return_items FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "shop_settings_admin_all" ON public.shop_settings;
CREATE POLICY "shop_settings_admin_all" ON public.shop_settings FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 19.3 Carrinho e moradas (apenas o proprio)
DROP POLICY IF EXISTS "carts_select_own" ON public.carts;
CREATE POLICY "carts_select_own" ON public.carts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "carts_insert_own" ON public.carts;
CREATE POLICY "carts_insert_own" ON public.carts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "carts_update_own" ON public.carts;
CREATE POLICY "carts_update_own" ON public.carts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "carts_delete_own" ON public.carts;
CREATE POLICY "carts_delete_own" ON public.carts FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "cart_items_select_own" ON public.cart_items;
CREATE POLICY "cart_items_select_own" ON public.cart_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_id AND c.user_id = auth.uid()));
DROP POLICY IF EXISTS "cart_items_insert_own" ON public.cart_items;
CREATE POLICY "cart_items_insert_own" ON public.cart_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_id AND c.user_id = auth.uid()));
DROP POLICY IF EXISTS "cart_items_update_own" ON public.cart_items;
CREATE POLICY "cart_items_update_own" ON public.cart_items FOR UPDATE USING (EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_id AND c.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_id AND c.user_id = auth.uid()));
DROP POLICY IF EXISTS "cart_items_delete_own" ON public.cart_items;
CREATE POLICY "cart_items_delete_own" ON public.cart_items FOR DELETE USING (EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_id AND c.user_id = auth.uid()));

DROP POLICY IF EXISTS "addresses_select_own" ON public.addresses;
CREATE POLICY "addresses_select_own" ON public.addresses FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "addresses_insert_own" ON public.addresses;
CREATE POLICY "addresses_insert_own" ON public.addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "addresses_update_own" ON public.addresses;
CREATE POLICY "addresses_update_own" ON public.addresses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "addresses_delete_own" ON public.addresses;
CREATE POLICY "addresses_delete_own" ON public.addresses FOR DELETE USING (auth.uid() = user_id);

-- 19.4 Encomendas
-- Criadas pelo servidor (que usa a chave publica), por isso o INSERT e aberto.
-- O risco e o mesmo que ja existe com `contact_requests`/`test_drives`, e
-- mitiga-se porque a encomenda so fica "paga" com confirmacao de pagamento.
DROP POLICY IF EXISTS "orders_insert_public" ON public.orders;
CREATE POLICY "orders_insert_public" ON public.orders FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
CREATE POLICY "orders_select_own" ON public.orders FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "order_items_insert_public" ON public.order_items;
CREATE POLICY "order_items_insert_public" ON public.order_items FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "order_items_select_own" ON public.order_items;
CREATE POLICY "order_items_select_own" ON public.order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

DROP POLICY IF EXISTS "order_history_insert_public" ON public.order_status_history;
CREATE POLICY "order_history_insert_public" ON public.order_status_history FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "order_history_select_own" ON public.order_status_history;
CREATE POLICY "order_history_select_own" ON public.order_status_history FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

DROP POLICY IF EXISTS "coupon_uses_insert_public" ON public.coupon_uses;
CREATE POLICY "coupon_uses_insert_public" ON public.coupon_uses FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "coupon_uses_select_own" ON public.coupon_uses;
CREATE POLICY "coupon_uses_select_own" ON public.coupon_uses FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "stock_movements_insert_public" ON public.stock_movements;
CREATE POLICY "stock_movements_insert_public" ON public.stock_movements FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "stock_holds_insert_public" ON public.stock_holds;
CREATE POLICY "stock_holds_insert_public" ON public.stock_holds FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "back_in_stock_insert_public" ON public.back_in_stock_requests;
CREATE POLICY "back_in_stock_insert_public" ON public.back_in_stock_requests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "email_log_insert_public" ON public.email_log;
CREATE POLICY "email_log_insert_public" ON public.email_log FOR INSERT WITH CHECK (true);

-- 19.5 Devolucoes (cliente ve as suas; escrita pelo servidor)
DROP POLICY IF EXISTS "return_requests_insert_public" ON public.return_requests;
CREATE POLICY "return_requests_insert_public" ON public.return_requests FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "return_requests_select_own" ON public.return_requests;
CREATE POLICY "return_requests_select_own" ON public.return_requests FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "return_items_insert_public" ON public.return_items;
CREATE POLICY "return_items_insert_public" ON public.return_items FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "return_items_select_own" ON public.return_items;
CREATE POLICY "return_items_select_own" ON public.return_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.return_requests r WHERE r.id = return_id AND r.user_id = auth.uid()));

-- ============================================================================
-- 20. Permissoes (RLS continua a mandar; isto so abre a porta)
-- ============================================================================
GRANT SELECT ON public.brands, public.product_categories, public.products, public.product_variants, public.product_images, public.product_compatibility, public.shipping_zones, public.shipping_rates, public.shop_settings TO anon, authenticated;

GRANT INSERT ON public.orders, public.order_items, public.order_status_history, public.stock_movements, public.stock_holds, public.coupon_uses, public.back_in_stock_requests, public.email_log, public.return_requests, public.return_items TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.carts, public.cart_items, public.addresses TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brands, public.product_categories, public.products, public.product_variants, public.product_images, public.product_compatibility, public.shipping_zones, public.shipping_rates, public.coupons, public.coupon_uses, public.stock_movements, public.stock_holds, public.back_in_stock_requests, public.email_log, public.return_requests, public.return_items, public.shop_settings, public.orders, public.order_items, public.order_status_history TO authenticated;


-- ============================================================================
-- 21. Trigger de `updated_at`
-- ============================================================================
-- Se o `setup.sql` ja tiver uma funcao equivalente, usa-se essa e este bloco sai.
CREATE OR REPLACE FUNCTION public.shop_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['brands','product_categories','products','product_variants','carts','cart_items','orders','addresses','shipping_zones','shipping_rates','coupons','return_requests','shop_settings']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'trg_' || t || '_updated_at', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.shop_touch_updated_at()', 'trg_' || t || '_updated_at', t);
  END LOOP;
END $$;


-- ============================================================================
-- 22. Funcoes e RPC
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1;

-- Numero da encomenda: CG-AAAA-0001 (a sequencia continua entre anos,
-- para nao repetir numeros).
CREATE OR REPLACE FUNCTION public.next_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq BIGINT;
  v_ano TEXT;
BEGIN
  v_seq := nextval('public.order_number_seq');
  v_ano := to_char(NOW(), 'YYYY');
  RETURN 'CG-' || v_ano || '-' || lpad(v_seq::text, 4, '0');
END;
$$;

-- Definições da loja numa só chamada.
CREATE OR REPLACE FUNCTION public.get_shop_settings()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(s) FROM public.shop_settings s WHERE s.id = 1;
$$;

-- Comprovativo de encomenda por link seguro (convidados incluídos).
CREATE OR REPLACE FUNCTION public.get_order_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE access_token = p_token;
  IF v_order.id IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'order', to_jsonb(v_order),
    'items', COALESCE((
      SELECT jsonb_agg(to_jsonb(i) ORDER BY i.created_at)
      FROM public.order_items i
      WHERE i.order_id = v_order.id
    ), '[]'::jsonb)
  );
END;
$$;

-- Stock disponivel = stock - reservas ativas.
CREATE OR REPLACE FUNCTION public.available_stock(p_variant_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(0,
    COALESCE((SELECT stock_quantity FROM public.product_variants WHERE id = p_variant_id), 0)
    - COALESCE((SELECT SUM(quantity) FROM public.stock_holds WHERE variant_id = p_variant_id AND expires_at > NOW()), 0)
  )::int;
$$;

-- Reserva temporaria durante o pagamento (minutos vem das definicoes da loja).
CREATE OR REPLACE FUNCTION public.create_stock_hold(p_variant_id UUID, p_quantity INT, p_reference TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_minutes INT := 15;
  v_qty INT;
  v_avail INT;
  v_id UUID;
BEGIN
  v_qty := GREATEST(1, COALESCE(p_quantity, 1));
  SELECT COALESCE(stock_hold_minutes, 15) INTO v_minutes FROM public.shop_settings WHERE id = 1;
  v_avail := public.available_stock(p_variant_id);
  IF v_avail < v_qty THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Sem stock suficiente', 'available', v_avail);
  END IF;
  INSERT INTO public.stock_holds (variant_id, quantity, reference, expires_at)
  VALUES (p_variant_id, v_qty, p_reference, NOW() + (v_minutes || ' minutes')::interval)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok', true, 'hold_id', v_id, 'expires_in_minutes', v_minutes);
END;
$$;

-- Limpeza de reservas expiradas (chamar ao abrir o checkout ou por cron).
CREATE OR REPLACE FUNCTION public.release_expired_stock_holds()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n INT;
BEGIN
  DELETE FROM public.stock_holds WHERE expires_at < NOW() - INTERVAL '1 day';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

-- Validacao de cupao (devolve sempre um objeto, nunca rebenta).
CREATE OR REPLACE FUNCTION public.validate_coupon(p_code TEXT, p_subtotal NUMERIC, p_email TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.coupons;
  v_uses INT;
  v_my_uses INT;
  v_discount NUMERIC := 0;
  v_free BOOLEAN := false;
BEGIN
  SELECT * INTO c FROM public.coupons WHERE upper(code) = upper(trim(p_code)) AND is_active;
  IF c.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Cupao nao encontrado ou inativo');
  END IF;
  IF c.starts_at IS NOT NULL AND NOW() < c.starts_at THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Cupao ainda nao esta valido');
  END IF;
  IF c.ends_at IS NOT NULL AND NOW() > c.ends_at THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Cupao expirado');
  END IF;
  IF COALESCE(p_subtotal, 0) < COALESCE(c.min_order_total, 0) THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Valor minimo nao atingido');
  END IF;
  IF c.max_uses IS NOT NULL THEN
    SELECT COUNT(*) INTO v_uses FROM public.coupon_uses WHERE coupon_id = c.id;
    IF v_uses >= c.max_uses THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'Cupao esgotado');
    END IF;
  END IF;
  IF p_email IS NOT NULL AND c.max_uses_per_customer IS NOT NULL THEN
    SELECT COUNT(*) INTO v_my_uses FROM public.coupon_uses WHERE coupon_id = c.id AND lower(email) = lower(p_email);
    IF v_my_uses >= c.max_uses_per_customer THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'Ja usaste este cupao');
    END IF;
  END IF;
  IF c.discount_type = 'percent' THEN
    v_discount := round(COALESCE(p_subtotal, 0) * c.discount_value / 100, 2);
  ELSIF c.discount_type = 'fixed' THEN
    v_discount := LEAST(c.discount_value, COALESCE(p_subtotal, 0));
  ELSE
    v_free := true;
  END IF;
  RETURN jsonb_build_object('valid', true, 'coupon_id', c.id, 'code', c.code, 'discount', v_discount, 'free_shipping', v_free);
END;
$$;

-- Portes por zona e peso. Devolve sempre um objeto:
--   { found, on_request, zone_id, zone, rate, price, delivery_days_min, delivery_days_max }
-- `on_request = true` quando o peso passa a ultima faixa: a app pede orcamento.
CREATE OR REPLACE FUNCTION public.shipping_quote(p_country TEXT, p_postal TEXT, p_weight_grams INT, p_subtotal NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  z public.shipping_zones;
  r public.shipping_rates;
  v_price NUMERIC;
  v_free NUMERIC := 0;
  v_peso INT;
BEGIN
  v_peso := GREATEST(0, COALESCE(p_weight_grams, 0));

  SELECT * INTO z
  FROM public.shipping_zones sz
  WHERE sz.is_active
    AND (',' || replace(upper(sz.country_codes), ' ', '') || ',') LIKE '%,' || upper(COALESCE(p_country, 'PT')) || ',%'
    AND (
      COALESCE(sz.postal_code_from, '') = ''
      OR (COALESCE(p_postal, '') <> '' AND p_postal >= sz.postal_code_from AND p_postal <= sz.postal_code_to)
    )
  ORDER BY (COALESCE(sz.postal_code_from, '') <> '') DESC, sz.position
  LIMIT 1;

  IF z.id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'on_request', true, 'price', 0);
  END IF;

  SELECT * INTO r
  FROM public.shipping_rates sr
  WHERE sr.zone_id = z.id
    AND sr.is_active
    AND v_peso >= sr.weight_from_grams
    AND (sr.weight_to_grams IS NULL OR v_peso <= sr.weight_to_grams)
  ORDER BY sr.weight_from_grams
  LIMIT 1;

  IF r.id IS NULL THEN
    RETURN jsonb_build_object('found', true, 'on_request', true, 'zone_id', z.id, 'zone', z.name, 'price', 0);
  END IF;

  v_price := r.price;

  SELECT COALESCE(free_shipping_above, 0) INTO v_free FROM public.shop_settings WHERE id = 1;
  IF COALESCE(v_free, 0) > 0 AND COALESCE(p_subtotal, 0) >= v_free THEN
    v_price := 0;
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'on_request', false,
    'zone_id', z.id,
    'zone', z.name,
    'rate', r.name,
    'price', v_price,
    'delivery_days_min', r.delivery_days_min,
    'delivery_days_max', r.delivery_days_max
  );
END;
$$;

-- Confirmacao de pagamento (webhook). A rota que a chama TEM DE SER protegida
-- por segredo do fornecedor antes de ir a producao - ver docs/PLANO_ETAPA_1.md.
CREATE OR REPLACE FUNCTION public.mark_order_paid(p_reference TEXT, p_provider TEXT DEFAULT '')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  UPDATE public.orders
  SET payment_status = 'paid',
      status = 'paid',
      paid_at = NOW(),
      payment_provider = COALESCE(NULLIF(p_provider, ''), payment_provider),
      updated_at = NOW()
  WHERE payment_reference = p_reference
    AND payment_status <> 'paid'
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.order_status_history (order_id, status, note)
  VALUES (v_id, 'paid', 'Pagamento confirmado');

  RETURN true;
END;
$$;

-- ============================================================================
-- CRIACAO DA ENCOMENDA (a peca central)
-- ============================================================================
-- Entradas:
--   p_items          JSONB  -> [{"variant_id":"...","quantity":2}, ...]
--   p_customer       JSONB  -> dados do cliente + morada + hold_reference
--   p_payment_method TEXT   -> 'card' | 'mb_way' | 'multibanco'
--   p_coupon_code    TEXT   -> opcional
--
-- O preco NUNCA vem do browser: e lido da base de dados linha a linha.
-- Devolve: { order_id, order_number, access_token, subtotal, discount_total,
--            shipping_total, vat_total, total, on_request_shipping }
--
-- TODO antes de producao: testar com carrinho misto, stock a 0, cupao expirado
-- e peso acima da ultima faixa (portes a orcamento).
CREATE OR REPLACE FUNCTION public.place_order(
  p_items JSONB,
  p_customer JSONB,
  p_payment_method TEXT,
  p_coupon_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line JSONB;
  v_v RECORD;
  v_qty INT;
  v_unit NUMERIC;
  v_line_total NUMERIC;
  v_subtotal NUMERIC := 0;
  v_vat NUMERIC := 0;
  v_weight INT := 0;
  v_items JSONB := '[]'::jsonb;
  v_quote JSONB;
  v_shipping NUMERIC := 0;
  v_on_request BOOLEAN := false;
  v_coupon JSONB;
  v_discount NUMERIC := 0;
  v_coupon_id UUID := NULL;
  v_total NUMERIC;
  v_order_id UUID := gen_random_uuid();
  v_number TEXT;
  v_token TEXT;
  v_avail INT;
  v_country TEXT;
  v_postal TEXT;
  v_email TEXT;
  v_ref TEXT;
  v_hist_item JSONB;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Carrinho vazio';
  END IF;

  v_country := COALESCE(NULLIF(p_customer->>'shipping_country', ''), 'PT');
  v_postal := COALESCE(p_customer->>'shipping_postal_code', '');
  v_email := lower(COALESCE(p_customer->>'customer_email', ''));
  v_ref := COALESCE(p_customer->>'hold_reference', '');

  -- 1) Recolher linhas com precos vindos da base de dados
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := GREATEST(1, COALESCE((v_line->>'quantity')::int, 1));

    SELECT pv.id AS variant_id,
           pv.name AS variant_name,
           pv.price_delta,
           pv.weight_grams AS variant_weight,
           p.id AS prod_id,
           p.name AS product_name,
           p.price,
           p.vat_rate,
           p.weight_grams AS product_weight,
           p.sku,
           p.stock_mode
    INTO v_v
    FROM public.product_variants pv
    JOIN public.products p ON p.id = pv.product_id
    WHERE pv.id = (v_line->>'variant_id')::uuid
      AND pv.is_active
      AND p.status = 'active';

    IF v_v.variant_id IS NULL THEN
      RAISE EXCEPTION 'Artigo indisponivel';
    END IF;

    IF v_v.stock_mode = 'managed' THEN
      v_avail := public.available_stock(v_v.variant_id);
      IF v_avail < v_qty THEN
        RAISE EXCEPTION 'Stock insuficiente para %', v_v.product_name;
      END IF;
    END IF;

    v_unit := v_v.price + COALESCE(v_v.price_delta, 0);
    v_line_total := v_unit * v_qty;
    v_subtotal := v_subtotal + v_line_total;
    v_vat := v_vat + (v_line_total - (v_line_total / (1 + v_v.vat_rate / 100)));
    v_weight := v_weight + COALESCE(NULLIF(v_v.variant_weight, 0), v_v.product_weight, 0) * v_qty;

    v_items := v_items || jsonb_build_object(
      'variant_id', v_v.variant_id,
      'product_id', v_v.prod_id,
      'product_name', v_v.product_name,
      'variant_name', v_v.variant_name,
      'sku', v_v.sku,
      'unit_price', v_unit,
      'quantity', v_qty,
      'vat_rate', v_v.vat_rate,
      'line_total', v_line_total,
      'weight_grams', COALESCE(NULLIF(v_v.variant_weight, 0), v_v.product_weight, 0),
      'stock_mode', v_v.stock_mode
    );
  END LOOP;

  -- 2) Portes
  v_quote := public.shipping_quote(v_country, v_postal, v_weight, v_subtotal);
  v_shipping := COALESCE((v_quote->>'price')::numeric, 0);
  v_on_request := COALESCE((v_quote->>'on_request')::boolean, false) OR NOT COALESCE((v_quote->>'found')::boolean, false);
  IF v_on_request THEN
    v_shipping := 0;
  END IF;

  -- 3) Cupao
  IF p_coupon_code IS NOT NULL AND length(trim(p_coupon_code)) > 0 THEN
    v_coupon := public.validate_coupon(p_coupon_code, v_subtotal, v_email);
    IF COALESCE((v_coupon->>'valid')::boolean, false) THEN
      v_discount := COALESCE((v_coupon->>'discount')::numeric, 0);
      v_coupon_id := NULLIF(v_coupon->>'coupon_id', '')::uuid;
      IF COALESCE((v_coupon->>'free_shipping')::boolean, false) THEN
        v_shipping := 0;
      END IF;
    END IF;
  END IF;

  v_total := GREATEST(0, v_subtotal - v_discount) + v_shipping;
  v_number := public.next_order_number();
  v_token := md5(gen_random_uuid()::text || clock_timestamp()::text || v_number);

  -- 4) Encomenda
  INSERT INTO public.orders (
    id, order_number, access_token, user_id,
    customer_name, customer_email, customer_phone, nif,
    shipping_name, shipping_line1, shipping_line2, shipping_city, shipping_postal_code, shipping_country, shipping_phone,
    billing_same_as_shipping, billing_name, billing_line1, billing_line2, billing_city, billing_postal_code, billing_country,
    subtotal, discount_total, shipping_total, vat_total, total,
    coupon_id, coupon_code, shipping_zone_id, shipping_rate_name, shipping_weight_grams,
    payment_method, payment_status, status, customer_note
  ) VALUES (
    v_order_id, v_number, v_token, auth.uid(),
    COALESCE(p_customer->>'customer_name', ''), COALESCE(p_customer->>'customer_email', ''), COALESCE(p_customer->>'customer_phone', ''), COALESCE(p_customer->>'nif', ''),
    COALESCE(p_customer->>'shipping_name', ''), COALESCE(p_customer->>'shipping_line1', ''), COALESCE(p_customer->>'shipping_line2', ''), COALESCE(p_customer->>'shipping_city', ''), COALESCE(p_customer->>'shipping_postal_code', ''), v_country, COALESCE(p_customer->>'shipping_phone', ''),
    COALESCE((p_customer->>'billing_same_as_shipping')::boolean, true),
    COALESCE(p_customer->>'billing_name', ''), COALESCE(p_customer->>'billing_line1', ''), COALESCE(p_customer->>'billing_line2', ''), COALESCE(p_customer->>'billing_city', ''), COALESCE(p_customer->>'billing_postal_code', ''), COALESCE(NULLIF(p_customer->>'billing_country', ''), 'PT'),
    round(v_subtotal, 2), round(v_discount, 2), round(v_shipping, 2), round(v_vat, 2), round(v_total, 2),
    v_coupon_id, COALESCE(p_coupon_code, ''), NULLIF(v_quote->>'zone_id', '')::uuid, COALESCE(v_quote->>'rate', ''), v_weight,
    p_payment_method, 'pending', 'pending_payment', COALESCE(p_customer->>'customer_note', '')
  );

  -- 5) Linhas + stock
  FOR v_hist_item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
    INSERT INTO public.order_items (
      order_id, product_id, variant_id, product_name, variant_name, sku,
      unit_price, quantity, vat_rate, line_total, weight_grams
    ) VALUES (
      v_order_id,
      (v_hist_item->>'product_id')::uuid,
      (v_hist_item->>'variant_id')::uuid,
      v_hist_item->>'product_name',
      v_hist_item->>'variant_name',
      v_hist_item->>'sku',
      (v_hist_item->>'unit_price')::numeric,
      (v_hist_item->>'quantity')::int,
      (v_hist_item->>'vat_rate')::numeric,
      (v_hist_item->>'line_total')::numeric,
      (v_hist_item->>'weight_grams')::int
    );

    IF v_hist_item->>'stock_mode' = 'managed' THEN
      UPDATE public.product_variants
      SET stock_quantity = GREATEST(0, stock_quantity - (v_hist_item->>'quantity')::int),
          updated_at = NOW()
      WHERE id = (v_hist_item->>'variant_id')::uuid;

      INSERT INTO public.stock_movements (variant_id, delta, reason, order_id, note)
      VALUES ((v_hist_item->>'variant_id')::uuid, -((v_hist_item->>'quantity')::int), 'sale', v_order_id, v_number);
    END IF;
  END LOOP;

  -- 6) Reservas consumidas por esta compra
  IF v_ref <> '' THEN
    DELETE FROM public.stock_holds WHERE reference = v_ref;
  END IF;

  -- 7) Historico
  INSERT INTO public.order_status_history (order_id, status, note)
  VALUES (v_order_id, 'pending_payment', 'Encomenda criada');

  IF v_coupon_id IS NOT NULL THEN
    INSERT INTO public.coupon_uses (coupon_id, order_id, user_id, email, discount_total)
    VALUES (v_coupon_id, v_order_id, auth.uid(), v_email, round(v_discount, 2));

    UPDATE public.coupons SET uses_count = uses_count + 1, updated_at = NOW() WHERE id = v_coupon_id;
  END IF;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_number,
    'access_token', v_token,
    'subtotal', round(v_subtotal, 2),
    'discount_total', round(v_discount, 2),
    'shipping_total', round(v_shipping, 2),
    'vat_total', round(v_vat, 2),
    'total', round(v_total, 2),
    'on_request_shipping', v_on_request
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_order_number() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_shop_settings() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.available_stock(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_stock_hold(UUID, INT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_expired_stock_holds() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_coupon(TEXT, NUMERIC, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shipping_quote(TEXT, TEXT, INT, NUMERIC) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_order_paid(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_order(JSONB, JSONB, TEXT, TEXT) TO anon, authenticated;

-- ============================================================================
-- 23. Conteudo inicial (idempotente)
-- ============================================================================
-- Estas linhas sao so ponto de partida: o dono edita tudo no backoffice.
-- Os valores dos portes sao a base combinada; podem ser afinados a qualquer altura.

-- 23.1 Definicoes da loja (linha unica)
INSERT INTO public.shop_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 23.2 Categorias principais (as 6 decididas)
INSERT INTO public.product_categories (slug, name, position) VALUES
  ('extras-e-acessorios', 'Extras e acessórios', 1),
  ('detailing-e-limpeza', 'Detailing e limpeza', 2),
  ('pecas-e-manutencao', 'Peças e manutenção', 3),
  ('jantes-e-pneus', 'Jantes e pneus', 4),
  ('merch-e-presentes', 'Merch e presentes', 5),
  ('eletronica-e-som', 'Eletrónica e som', 6)
ON CONFLICT (slug) DO NOTHING;

-- 23.3 Subcategorias (exemplos; acrescentar/remover no backoffice)
INSERT INTO public.product_categories (slug, name, parent_id, position)
SELECT v.slug, v.name, (SELECT id FROM public.product_categories WHERE slug = v.parent), v.position
FROM (VALUES
  ('tapetes', 'Tapetes', 'extras-e-acessorios', 1),
  ('capas-e-protecoes', 'Capas e proteções', 'extras-e-acessorios', 2),
  ('organizacao', 'Organização', 'extras-e-acessorios', 3),
  ('iluminacao', 'Iluminação', 'extras-e-acessorios', 4),
  ('lavagem', 'Lavagem', 'detailing-e-limpeza', 1),
  ('ceras-e-polidores', 'Ceras e polidores', 'detailing-e-limpeza', 2),
  ('interior', 'Interior', 'detailing-e-limpeza', 3),
  ('panos-e-acessorios', 'Panos e acessórios', 'detailing-e-limpeza', 4),
  ('filtros', 'Filtros', 'pecas-e-manutencao', 1),
  ('oleos-e-fluidos', 'Óleos e fluidos', 'pecas-e-manutencao', 2),
  ('travoes', 'Travões', 'pecas-e-manutencao', 3),
  ('escovas-limpa-para-brisas', 'Escovas limpa-para-brisas', 'pecas-e-manutencao', 4),
  ('jantes', 'Jantes', 'jantes-e-pneus', 1),
  ('pneus', 'Pneus', 'jantes-e-pneus', 2),
  ('tampoes-e-valvulas', 'Tampões e válvulas', 'jantes-e-pneus', 3),
  ('t-shirts', 'T-shirts', 'merch-e-presentes', 1),
  ('bones', 'Bonés', 'merch-e-presentes', 2),
  ('canecas', 'Canecas', 'merch-e-presentes', 3),
  ('cartoes-presente', 'Cartões-presente', 'merch-e-presentes', 4),
  ('autoradios', 'Autorrádios', 'eletronica-e-som', 1),
  ('colunas', 'Colunas', 'eletronica-e-som', 2),
  ('dashcams', 'Dashcams', 'eletronica-e-som', 3),
  ('suportes-e-carregadores', 'Suportes e carregadores', 'eletronica-e-som', 4)
) AS v(slug, name, parent, position)
ON CONFLICT (slug) DO NOTHING;

-- 23.4 Marcas (exemplos - apagar as que nao interessarem)
INSERT INTO public.brands (slug, name, position) VALUES
  ('chikane', 'Chikane Garage', 1),
  ('bosch', 'Bosch', 2),
  ('castrol', 'Castrol', 3),
  ('sparco', 'Sparco', 4),
  ('momo', 'Momo', 5)
ON CONFLICT (slug) DO NOTHING;

-- 23.5 Zonas de envio
--    Portugal continental: 1000-8999 · Madeira: 9000-9499 · Açores: 9500-9999
INSERT INTO public.shipping_zones (name, country_codes, postal_code_from, postal_code_to, position)
SELECT v.name, v.cc, v.pf, v.pt, v.pos
FROM (VALUES
  ('Portugal continental', 'PT', '1000', '8999', 1),
  ('Madeira', 'PT', '9000', '9499', 2),
  ('Açores', 'PT', '9500', '9999', 3),
  ('Espanha', 'ES', '', '', 4),
  ('Europa', 'AT,BE,BG,CH,CY,CZ,DE,DK,EE,FI,FR,GB,GR,HR,HU,IE,IS,IT,LI,LU,LV,LT,MT,NL,NO,PL,RO,SE,SI,SK', '', '', 5)
) AS v(name, cc, pf, pt, pos)
WHERE NOT EXISTS (SELECT 1 FROM public.shipping_zones z WHERE z.name = v.name);

-- 23.6 Portes por peso (valores base; afinam-se no backoffice)
INSERT INTO public.shipping_rates (zone_id, name, weight_from_grams, weight_to_grams, price, delivery_days_min, delivery_days_max, position)
SELECT z.id, v.name, v.wf, v.wt, v.price, v.dmin, v.dmax, v.pos
FROM (VALUES
  -- Portugal continental
  ('Portugal continental', 'até 1 kg', 0, 1000, 5.50, 2, 4, 1),
  ('Portugal continental', '1 a 5 kg', 1001, 5000, 7.50, 2, 4, 2),
  ('Portugal continental', '5 a 10 kg', 5001, 10000, 10.50, 2, 5, 3),
  ('Portugal continental', '10 a 20 kg', 10001, 20000, 14.50, 3, 6, 4),
  ('Portugal continental', '20 a 30 kg', 20001, 30000, 19.50, 3, 6, 5),
  -- Madeira
  ('Madeira', 'até 1 kg', 0, 1000, 9.50, 4, 8, 1),
  ('Madeira', '1 a 5 kg', 1001, 5000, 14.50, 4, 8, 2),
  ('Madeira', '5 a 10 kg', 5001, 10000, 19.50, 5, 10, 3),
  ('Madeira', '10 a 20 kg', 10001, 20000, 27.50, 5, 10, 4),
  ('Madeira', '20 a 30 kg', 20001, 30000, 35.00, 6, 12, 5),
  -- Acores
  ('Açores', 'até 1 kg', 0, 1000, 9.50, 4, 8, 1),
  ('Açores', '1 a 5 kg', 1001, 5000, 14.50, 4, 8, 2),
  ('Açores', '5 a 10 kg', 5001, 10000, 19.50, 5, 10, 3),
  ('Açores', '10 a 20 kg', 10001, 20000, 27.50, 5, 10, 4),
  ('Açores', '20 a 30 kg', 20001, 30000, 35.00, 6, 12, 5),
  -- Espanha
  ('Espanha', 'até 1 kg', 0, 1000, 9.90, 4, 7, 1),
  ('Espanha', '1 a 5 kg', 1001, 5000, 13.90, 4, 7, 2),
  ('Espanha', '5 a 10 kg', 5001, 10000, 18.90, 5, 9, 3),
  ('Espanha', '10 a 20 kg', 10001, 20000, 26.90, 5, 9, 4),
  ('Espanha', '20 a 30 kg', 20001, 30000, 34.90, 6, 11, 5),
  -- Europa
  ('Europa', 'até 1 kg', 0, 1000, 14.90, 5, 10, 1),
  ('Europa', '1 a 5 kg', 1001, 5000, 19.90, 5, 10, 2),
  ('Europa', '5 a 10 kg', 5001, 10000, 27.00, 6, 12, 3),
  ('Europa', '10 a 20 kg', 10001, 20000, 38.00, 6, 12, 4),
  ('Europa', '20 a 30 kg', 20001, 30000, 49.00, 7, 14, 5)
) AS v(zone_name, name, wf, wt, price, dmin, dmax, pos)
JOIN public.shipping_zones z ON z.name = v.zone_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.shipping_rates r WHERE r.zone_id = z.id AND r.name = v.name
);

-- 23.7 Produto de exemplo (opcional; apagar depois de criar os verdadeiros)
-- INSERT INTO public.products (slug, category_id, brand_id, name, short_description, price, weight_grams, sku)
-- VALUES ('tapete-borracha-universal', (SELECT id FROM public.product_categories WHERE slug = 'tapetes'), (SELECT id FROM public.brands WHERE slug = 'chikane'), 'Tapete de borracha universal', 'Tapete recortavel em borracha.', 24.90, 1200, 'CG-TAP-001')
-- ON CONFLICT (slug) DO NOTHING;


-- ============================================================================
-- 24. Revisao deste rascunho vs. `docs/MODELO_DADOS_LOJA.md`
-- ============================================================================
-- Divergencias pequenas, feitas de proposito (o documento foi atualizado):
--   a) `shipping_zones.country_codes` (o doc dizia `countries`) e ganhou
--      `postal_code_from` / `postal_code_to`, para separar continente de ilhas.
--   b) `products.brand_id` -> tabela `brands` (o doc ainda tinha `brand` em texto).
--   c) `shipping_rates.free_above` REMOVIDO por simplicidade: os portes gratis
--      tem um unico valor, em `shop_settings.free_shipping_above` (backoffice).
--   d) `stock_holds.order_id` acrescentado, para ligar a reserva a encomenda.
--   e) `email_log.provider_id` acrescentado, para guardar o id do fornecedor.
--
-- Checklist antes de correr isto (quando o dono autorizar):
--   [ ] Rever nomes de politicas com o padrao atual do `setup.sql`.
--   [ ] Reutilizar a funcao de `updated_at` existente, se houver.
--   [ ] Testar `place_order` com: carrinho misto, stock a 0, cupao expirado,
--       peso > 30 kg (portes a orcamento) e convidado sem conta.
--   [ ] Confirmar que as permissoes nao abrem mais do que o necessario.
--   [ ] Copiar para o fim de `supabase/setup.sql` e apagar esta pasta.
-- ============================================================================
--  FIM DO RASCUNHO
-- ============================================================================
