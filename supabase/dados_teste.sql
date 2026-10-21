-- ============================================================================
-- DADOS DE TESTE — Chikane Garage
-- ----------------------------------------------------------------------------
-- O que é:  não é uma migração nem mexe no esquema. São só linhas de teste
--           para percorrer o site de ponta a ponta (loja + viaturas +
--           configurador + pedidos de encomenda + backoffice).
-- Onde corre: Supabase → SQL Editor → New query → colar → Run (o mesmo sítio
--           onde corres o supabase/setup.sql).
-- É idempotente: podes correr 2, 3, 10 vezes — nunca duplica linhas.
-- NÃO envia emails: emails só são enviados pelas ações do site, nunca por SQL.
--
-- ⚠ AVISO: o Supabase é o de produção — estes dados ficam VISÍVEIS no site
--   até correres o bloco de LIMPEZA no fim deste ficheiro.
--
-- ----------------------------------------------------------------------------
-- CHECKLIST DO TESTE (o que cada bloco alimenta)
-- ----------------------------------------------------------------------------
--  1. /catalogo                        → viatura nova 0 km "BMW M240i… (Teste)"
--  2. Ficha /catalogo/teste-bmw-m240i-xdrive-0km
--                                       → secção "Peças e acessórios" +
--                                         botão "Configurar e pedir"
--  3. /catalogo/teste-bmw-m240i-xdrive-0km/configurar
--                                       → configurador com os 4 acessórios
--                                         (variantes de jantes, preços)
--  4. Envia um pedido de encomenda aí   → email ao cliente + página
--                                         /encomenda/<token> com percurso
--  5. /loja e /produto/...             → tag "Só por encomenda" no Kit Lip e
--                                         botão "Pedir por encomenda"
--  6. /produto/teste-pastilhas-travao  → carrinho + checkout normal (stock 8)
--  7. /produto/teste-escape-esportivo  → "Esgotado" (stock 0)
--  8. Checkout com o cupão TESTE10      → 10% de desconto
--  9. /encomenda/teste-acompanhar-2026  → pedido de exemplo já "em preparação"
--                                         (3º passo do percurso ativo)
-- 10. Backoffice › Loja › Encomendas    → pedido "TESTE-0001" com histórico
-- 11. Backoffice › Veículos › editar a viatura teste
--                                       → painel "Acessórios & peças
--                                         compatíveis (loja)"
-- ⚠ O checkout de artigos usa as passarelas de pagamento REAIS (cartão/MB WAY):
--   testa até ao botão de pagamento e não convides a cobrança.
-- ⚠ O pedido de exemplo não está associado a nenhuma conta — o histórico
--   detalhado ("Atualizações") só aparece a clientes registados: para o ver,
--   envia tu mesmo um pedido pelo configurador com a tua conta iniciada.
-- ============================================================================


-- ============================================================================
-- 1. CATEGORIAS DE PEÇAS (as 3 que o configurador considera compatíveis)
--     Se já existem (setup.sql), estas linhas não fazem nada.
-- ============================================================================
INSERT INTO public.product_categories (slug, name, position) VALUES
  ('extras-e-acessorios', 'Extras e acessórios', 1),
  ('pecas-e-manutencao', 'Peças e manutenção', 3),
  ('jantes-e-pneus', 'Jantes e pneus', 4)
ON CONFLICT (slug) DO NOTHING;


-- ============================================================================
-- 2. PRODUTOS DE TESTE (marcados com "(Teste)", slug com prefixo "teste-")
-- ============================================================================

-- 2.1 Jantes com 2 VARIANTES e stock → aparece no configurador, comprável
--     normalmente no carrinho e com compatibilidade declarada (BMW).
INSERT INTO public.products (id, slug, category_id, brand_id, name, short_description, description, price, weight_grams, sku, status, stock_mode, is_featured, is_new)
SELECT 'd0000000-0000-4000-8000-000000000001', 'teste-momo-jantes-20-forjadas', c.id, b.id,
       'Jantes 20" Forjadas (Teste)',
       'Jantes forjadas de 20" com 2 acabamentos — artigo de teste.',
       'Jantes forjadas em alumínio 20" — serve em BMW série 2 (2019 em diante). Dados de teste: apagar com a limpeza.',
       2490, 12000, 'TESTE-JANTES-20', 'active', 'managed', true, true
FROM (SELECT id FROM public.product_categories WHERE slug = 'jantes-e-pneus') c
LEFT JOIN (SELECT id FROM public.brands WHERE slug = 'momo') b ON true
ON CONFLICT DO NOTHING;

INSERT INTO public.product_variants (id, product_id, name, option1_name, option1_value, sku, price_delta, stock_quantity, position, is_active)
SELECT v.id, p.id, v.name, 'Acabamento', v.name, v.sku, v.delta, v.stock, v.pos, true
FROM (VALUES
  ('d0000000-0000-4000-8000-000000000101'::uuid, 'Satin Black', 'TESTE-JANTES-SB', 0::numeric, 4, 1),
  ('d0000000-0000-4000-8000-000000000102'::uuid, 'Diamant Cut', 'TESTE-JANTES-DC', 250::numeric, 2, 2)
) AS v(id, name, sku, delta, stock, pos)
JOIN (SELECT id FROM public.products WHERE id = 'd0000000-0000-4000-8000-000000000001') p ON true
ON CONFLICT DO NOTHING;

-- 2.2 Kit Lip POR ENCOMENDA (stock_mode on_request) → tag "Só por encomenda"
--     + botão "Pedir por encomenda" + compatibilidade declarada com modelo.
INSERT INTO public.products (id, slug, category_id, brand_id, name, short_description, description, price, weight_grams, sku, status, stock_mode, is_featured, is_new)
SELECT 'd0000000-0000-4000-8000-000000000002', 'teste-kit-lip-carbono', c.id, NULL,
       'Kit Lip Frontal em Carbono (Teste)',
       'Lip frontal em fibra de carbono — fornecido por encomenda.',
       'Artigo de teste do fluxo "só por encomenda": sem stock imediato, o cliente envia pedido de compra e a equipa confirma prazo e custos.',
       890, 3500, 'TESTE-LIP-CARBONO', 'active', 'on_request', false, true
FROM (SELECT id FROM public.product_categories WHERE slug = 'extras-e-acessorios') c
ON CONFLICT DO NOTHING;

INSERT INTO public.product_variants (id, product_id, name, sku, price_delta, stock_quantity, position, is_active)
SELECT 'd0000000-0000-4000-8000-000000000103'::uuid, p.id, 'Único', 'TESTE-LIP-UNICO', 0, 0, 1, true
FROM (SELECT id FROM public.products WHERE id = 'd0000000-0000-4000-8000-000000000002') p
ON CONFLICT DO NOTHING;

-- 2.3 Pastilhas de travão com stock 8 → carrinho + checkout normal
INSERT INTO public.products (id, slug, category_id, brand_id, name, short_description, description, price, weight_grams, sku, status, stock_mode, is_featured, is_new)
SELECT 'd0000000-0000-4000-8000-000000000003', 'teste-pastilhas-travao', c.id, b.id,
       'Pastilhas de Travão Performance (Teste)',
       'Pastilhas de alto desempenho — artigo de teste com stock.',
       'Pastilhas de travão para testar o fluxo normal de carrinho e checkout. Stock de teste: 8 unidades.',
       145, 2400, 'TESTE-PASTILHAS', 'active', 'managed', false, false
FROM (SELECT id FROM public.product_categories WHERE slug = 'pecas-e-manutencao') c
LEFT JOIN (SELECT id FROM public.brands WHERE slug = 'bosch') b ON true
ON CONFLICT DO NOTHING;

INSERT INTO public.product_variants (id, product_id, name, option1_name, option1_value, sku, price_delta, stock_quantity, position, is_active)
SELECT 'd0000000-0000-4000-8000-000000000104'::uuid, p.id, 'Eixo dianteiro', 'Posição', 'Eixo dianteiro', 'TESTE-PASTILHAS-ED', 0, 8, 1, true
FROM (SELECT id FROM public.products WHERE id = 'd0000000-0000-4000-8000-000000000003') p
ON CONFLICT DO NOTHING;

-- 2.4 Escape com stock 0 → demonstra o estado "Esgotado"
INSERT INTO public.products (id, slug, category_id, brand_id, name, short_description, description, price, weight_grams, sku, status, stock_mode, is_featured, is_new)
SELECT 'd0000000-0000-4000-8000-000000000004', 'teste-escape-esportivo', c.id, NULL,
       'Escape Esportivo em Aço (Teste)',
       'Escape esportivo em aço inox — esgotado de propósito (artigo de teste).',
       'Artigo de teste para verificar o estado "Esgotado" na loja e a lista de aviso de disponibilidade.',
       1750, 9000, 'TESTE-ESCAPE', 'active', 'managed', false, false
FROM (SELECT id FROM public.product_categories WHERE slug = 'extras-e-acessorios') c
ON CONFLICT DO NOTHING;

INSERT INTO public.product_variants (id, product_id, name, sku, price_delta, stock_quantity, position, is_active)
SELECT 'd0000000-0000-4000-8000-000000000105'::uuid, p.id, 'Único', 'TESTE-ESCAPE-UNICO', 0, 0, 1, true
FROM (SELECT id FROM public.products WHERE id = 'd0000000-0000-4000-8000-000000000004') p
ON CONFLICT DO NOTHING;

-- 2.5 Compatibilidade declarada (é isto que o painel admin mostra no form da
--     viatura e o que faz o artigo pontuar no configurador/ficha pública)
INSERT INTO public.product_compatibility (product_id, brand, model, year_from, year_to, notes)
SELECT p.id, v.brand, v.model, v.year_from, v.year_to, 'Dados de teste'
FROM (VALUES
  ('d0000000-0000-4000-8000-000000000001'::uuid, 'BMW', '', 2019, NULL::int),
  ('d0000000-0000-4000-8000-000000000001'::uuid, 'BMW', 'M240i xDrive Coupé', 2019, NULL::int),
  ('d0000000-0000-4000-8000-000000000002'::uuid, 'BMW', 'M240i xDrive Coupé', 2021, 2027),
  ('d0000000-0000-4000-8000-000000000003'::uuid, 'BMW', '', NULL::int, NULL::int)
) AS v(product_id, brand, model, year_from, year_to)
JOIN public.products p ON p.id = v.product_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_compatibility x
  WHERE x.product_id = v.product_id AND x.brand = v.brand AND x.model = v.model
);


-- ============================================================================
-- 3. VIATURA NOVA 0 KM DE TESTE
--     Aparece no catálogo, na página "Viaturas novas" e no configurador.
-- ============================================================================
INSERT INTO public.vehicles (id, slug, reference_code, brand, model, trim,
  registration_year, registration_month, status, condition, sale_type,
  engine, power_hp, torque_nm, transmission, drivetrain, body_style, fuel_type,
  combined_consumption, co2_emissions, exterior_color, interior_color, mileage_km,
  price, financing_available, warranty_months, trade_in_accepted, delivery_estimate_days,
  cover_image_url, description, config_summary, is_featured)
SELECT
  'd0000000-0000-4000-8000-000000000010', 'teste-bmw-m240i-xdrive-0km', 'TESTE-001',
  'BMW', 'M240i xDrive Coupé', 'Pack M Sport (Teste)',
  2026, 1, 'available', 'new', 'stock',
  '2.0 Biturbo', 374, 500, 'automatic', 'awd', 'Cupé', 'gasoline',
  7.4, 169, 'Preto Safira Metálico', 'Couro Vermelho', 0,
  62500, true, 60, true, 45,
  COALESCE((SELECT cover_image_url FROM public.vehicles
            WHERE cover_image_url <> '' AND id <> 'd0000000-0000-4000-8000-000000000010'
            ORDER BY created_at DESC LIMIT 1), ''),
  'Viatura de teste para percorrer o fluxo novo: ficha → configurador → pedido de encomenda → acompanhamento. Apagar com a limpeza de dados de teste.',
  '2.0 Biturbo 374 cv, caixa automática de 8 velocidades, tracção integral xDrive, Pack M Sport.',
  false
ON CONFLICT DO NOTHING;

-- Equipamento da viatura (aparece na ficha)
INSERT INTO public.vehicle_features (vehicle_id, label)
SELECT v.id, f.label
FROM (VALUES
  ('Jantes 19" M Performance'),
  ('Bancos aquecidos em pele'),
  ('Head-up display')
) AS f(label)
JOIN (SELECT id FROM public.vehicles WHERE id = 'd0000000-0000-4000-8000-000000000010') v ON true
WHERE NOT EXISTS (
  SELECT 1 FROM public.vehicle_features x WHERE x.vehicle_id = v.id AND x.label = f.label
);


-- ============================================================================
-- 4. PEDIDO DE ENCOMENDA DE TESTE (sem pagamento online)
--     /encomenda/teste-acompanhar-2026 → mostra o percurso já em "preparação"
--     Backoffice › Loja › Encomendas → "TESTE-0001"
-- ============================================================================
INSERT INTO public.orders (id, order_number, access_token, customer_name,
  customer_email, customer_phone, customer_note, billing_same_as_shipping,
  subtotal, vat_total, total, payment_method, payment_status, status)
VALUES (
  'd0000000-0000-4000-8000-000000000020', 'TESTE-0001', 'teste-acompanhar-2026',
  'Cliente de Teste', 'teste@exemplo.pt', '910000000',
  'Pedido criado manualmente para testar o acompanhamento no site (dados de teste).',
  true, 64990, ROUND((64990 - 64990 / 1.23)::numeric, 2), 64990,
  -- payment_method NULL (= encomenda sem pagamento online, como no fluxo de
  -- pedido) e payment_status 'paid' = coerente com o passo "paid" do histórico.
  NULL, 'paid', 'preparing'
)
ON CONFLICT DO NOTHING;

-- Linhas da encomenda: a viatura + as jantes escolhidas no configurador
INSERT INTO public.order_items (order_id, product_id, variant_id, product_name,
  variant_name, sku, unit_price, quantity, vat_rate, line_total, weight_grams)
SELECT o.id, NULL, NULL, 'Viatura nova: BMW M240i xDrive Coupé',
  'Configuração por encomenda', 'VH-teste-bmw-m240i-xdrive-0km', 62500, 1, 23, 62500, 0
FROM (SELECT id FROM public.orders WHERE id = 'd0000000-0000-4000-8000-000000000020') o
WHERE NOT EXISTS (SELECT 1 FROM public.order_items x WHERE x.order_id = o.id AND x.sku = 'VH-teste-bmw-m240i-xdrive-0km');

INSERT INTO public.order_items (order_id, product_id, variant_id, product_name,
  variant_name, sku, unit_price, quantity, vat_rate, line_total, weight_grams)
SELECT o.id, p.id, v.id, p.name, v.name, 'TESTE-JANTES-SB', 2490, 1, 23, 2490, 12000
FROM (SELECT id FROM public.orders WHERE id = 'd0000000-0000-4000-8000-000000000020') o
JOIN (SELECT id, name FROM public.products WHERE id = 'd0000000-0000-4000-8000-000000000001') p ON true
JOIN (SELECT id, name FROM public.product_variants WHERE id = 'd0000000-0000-4000-8000-000000000101') v ON true
WHERE NOT EXISTS (SELECT 1 FROM public.order_items x WHERE x.order_id = o.id AND x.sku = 'TESTE-JANTES-SB');

-- Histórico do percurso (3 passos com datas desfasadas)
INSERT INTO public.order_status_history (order_id, status, note, created_at)
SELECT o.id, h.status, h.note, h.when_at
FROM (SELECT id FROM public.orders WHERE id = 'd0000000-0000-4000-8000-000000000020') o
CROSS JOIN (VALUES
  ('pending_payment', 'Pedido de encomenda recebido (dados de teste) — a equipa contacta o cliente.', NOW() - INTERVAL '3 days'),
  ('paid', 'Cliente contactado; configuração, prazo e condições confirmados.', NOW() - INTERVAL '2 days'),
  ('preparing', 'Encomenda enviada para preparação e instalação dos acessórios.', NOW() - INTERVAL '1 day')
) AS h(status, note, when_at)
WHERE NOT EXISTS (
  SELECT 1 FROM public.order_status_history x WHERE x.order_id = o.id AND x.status = h.status
);


-- ============================================================================
-- 5. CUPÃO DE TESTE (10% no checkout de artigos)
-- ============================================================================
INSERT INTO public.coupons (id, code, description, discount_type, discount_value,
  min_order_total, max_uses_per_customer, is_active)
VALUES ('d0000000-0000-4000-8000-000000000030', 'TESTE10',
  'Cupão de teste (10%) — apagar com os dados de teste.', 'percent', 10, 0, 100, true)
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 6. VERIFICAÇÃO — corre estas consultas e confirma que está tudo lá
-- ============================================================================
-- SELECT slug, name, price, stock_mode, status FROM public.products
--   WHERE slug LIKE 'teste-%' ORDER BY slug;
-- SELECT v.brand, v.model, v.condition, v.status, v.price, v.slug
--   FROM public.vehicles v WHERE v.slug LIKE 'teste-%';
-- SELECT o.order_number, o.status, o.payment_method, o.total,
--        (SELECT count(*) FROM public.order_items i WHERE i.order_id = o.id) AS linhas
--   FROM public.orders o WHERE o.order_number LIKE 'TESTE-%';
-- SELECT h.status, h.note, h.created_at FROM public.order_status_history h
--   WHERE h.order_id = 'd0000000-0000-4000-8000-000000000020' ORDER BY h.created_at;


-- ============================================================================
-- 7. LIMPEZA — quando quiseres apagar tudo isto do site
--     Descomenta o bloco abaixo (tira os "-- " do início de cada linha) e
--     corre SÓ esse bloco no SQL Editor. Não toca em mais nada.
-- ============================================================================
-- DELETE FROM public.order_status_history
--   WHERE order_id = 'd0000000-0000-4000-8000-000000000020';
-- DELETE FROM public.order_items
--   WHERE order_id = 'd0000000-0000-4000-8000-000000000020';
-- DELETE FROM public.orders
--   WHERE id = 'd0000000-0000-4000-8000-000000000020';
-- DELETE FROM public.coupons WHERE id = 'd0000000-0000-4000-8000-000000000030';
-- DELETE FROM public.product_compatibility WHERE product_id IN (
--   'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002',
--   'd0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000004');
-- DELETE FROM public.product_variants WHERE product_id IN (
--   'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002',
--   'd0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000004');
-- DELETE FROM public.products WHERE id IN (
--   'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002',
--   'd0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000004');
-- DELETE FROM public.vehicle_features
--   WHERE vehicle_id = 'd0000000-0000-4000-8000-000000000010';
-- DELETE FROM public.vehicles
--   WHERE id = 'd0000000-0000-4000-8000-000000000010';
