-- Dados de teste do configurador de viatura (/catalogo/[slug]/configurar).
-- Executar no SQL Editor do Supabase, depois de supabase/setup.sql.
-- Seguro para repetir: todos os registos usam slugs fixos e verificações de
-- existência. As fotografias são de banco de imagens (Wikimedia/Unsplash) e
-- servem só para pré-visualizar o layout — substituir por fotografias reais.
--
-- Cria:
--   · 1 viatura nova de demonstração (BMW 520d, 2025, 72 900 €);
--   · 4 jantes na categoria «Jantes e pneus» com variantes = tamanhos;
--   · 6 extras na categoria «Extras e acessórios» (seleção múltipla);
--   · compatibilidade declarada com a BMW 520d para tudo aparecer no configurador.

BEGIN;

INSERT INTO public.vehicles (
  slug, brand, model, trim, registration_year, status, engine, transmission,
  fuel_type, body_style, mileage_km, origin, origin_country, price,
  cover_image_url, description, is_featured, condition, sale_type,
  brand_warranty_months, delivery_estimate_days, config_summary
)
VALUES (
  'demo-bmw-520d-configurador', 'BMW', '520d', 'M Sport Pro', 2025,
  'available', '2.0 diesel', 'automatic', 'diesel', 'sedan', 15, 'imported', 'DE', 72900,
  'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1200&q=80',
  'Registo de demonstração para pré-visualizar a compra online de viatura. Não representa uma viatura disponível para venda — apagar ou substituir por uma viatura real.',
  false, 'new', 'stock', 24, NULL,
  'Exemplo de configuração BMW 520d M Sport Pro. Confirmar versão, equipamento, garantia e preço com a Chikane Garage.'
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.products (
  slug, category_id, brand_id, name, short_description, description,
  price, vat_rate, weight_grams, sku, status, stock_mode, is_featured, is_new
)
SELECT v.slug, c.id, b.id, v.name, v.short_description, v.description,
       v.price, 23, v.weight_grams, v.sku, 'active', 'managed', true, true
FROM (VALUES
  -- Jantes: cada modelo tem variantes = tamanhos (18", 19", 20").
  (
    'demo-config-jantes-fx', 'Jantes forjadas 19" Chikane FX',
    'Jante forjada leve, acabamento prateado escovado.',
    'Artigo de demonstração para pré-visualizar o configurador. Escolhe o tamanho (18", 19" ou 20") depois de selecionar o modelo. Substituir pela ficha real do artigo.',
    2890::numeric, 12000, 'CG-DEMO-JANTE-FX', 'jantes-e-pneus'
  ),
  (
    'demo-config-jantes-795m', 'Jantes M 795M',
    'Jante M de duplo raio, acabamento em preto brilhante.',
    'Artigo de demonstração para pré-visualizar o configurador. Escolhe o tamanho (18", 19" ou 20") depois de selecionar o modelo. Substituir pela ficha real do artigo.',
    2190::numeric, 11500, 'CG-DEMO-JANTE-795', 'jantes-e-pneus'
  ),
  (
    'demo-config-jantes-826m', 'Jantes M Double Spoke 826M',
    'Jante M forjada em preto mate, desenho de duplo raio.',
    'Artigo de demonstração para pré-visualizar o configurador. Escolhe o tamanho (18", 19" ou 20") depois de selecionar o modelo. Substituir pela ficha real do artigo.',
    2490::numeric, 11800, 'CG-DEMO-JANTE-826', 'jantes-e-pneus'
  ),
  (
    'demo-config-jantes-963m', 'Jantes M Y-Spoke 963M',
    'Jante M em raio em Y, acabamento bicolor.',
    'Artigo de demonstração para pré-visualizar o configurador. Escolhe o tamanho (18", 19" ou 20") depois de selecionar o modelo. Substituir pela ficha real do artigo.',
    3290::numeric, 12200, 'CG-DEMO-JANTE-963', 'jantes-e-pneus'
  ),
  -- Extras: seleção múltipla no configurador.
  (
    'demo-config-tapetes', 'Tapetes à medida Chikane',
    'Conjunto de 4 tapetes em veludo com rebordo.',
    'Artigo de demonstração para pré-visualizar o configurador. Substituir pela ficha real do artigo.',
    149::numeric, 3200, 'CG-DEMO-EXTRA-TAPETES', 'extras-e-acessorios'
  ),
  (
    'demo-config-bagageira', 'Proteção de bagageira',
    'Bandeja lavável que protege o piso da bagageira.',
    'Artigo de demonstração para pré-visualizar o configurador. Substituir pela ficha real do artigo.',
    89::numeric, 1800, 'CG-DEMO-EXTRA-BAGAGEIRA', 'extras-e-acessorios'
  ),
  (
    'demo-config-splitter', 'Splitter dianteiro em carbono',
    'Splitter em fibra de carbono com fixação original.',
    'Artigo de demonstração para pré-visualizar o configurador. Substituir pela ficha real do artigo.',
    890::numeric, 2600, 'CG-DEMO-EXTRA-SPLITTER', 'extras-e-acessorios'
  ),
  (
    'demo-config-escape', 'Escape performance em titânio',
    'Linha de escape em titânio com som desportivo.',
    'Artigo de demonstração para pré-visualizar o configurador. Substituir pela ficha real do artigo.',
    2450::numeric, 8900, 'CG-DEMO-EXTRA-ESCAPE', 'extras-e-acessorios'
  ),
  (
    'demo-config-iluminacao', 'Iluminação ambiente interior',
    'Kit de iluminação LED para o habitáculo.',
    'Artigo de demonstração para pré-visualizar o configurador. Substituir pela ficha real do artigo.',
    179::numeric, 700, 'CG-DEMO-EXTRA-LUZ', 'extras-e-acessorios'
  ),
  (
    'demo-config-capas', 'Capas de proteção dos bancos',
    'Capas impermeáveis para os bancos dianteiros.',
    'Artigo de demonstração para pré-visualizar o configurador. Substituir pela ficha real do artigo.',
    219::numeric, 1500, 'CG-DEMO-EXTRA-CAPAS', 'extras-e-acessorios'
  )
) AS v(slug, name, short_description, description, price, weight_grams, sku, category_slug)
JOIN public.product_categories c ON c.slug = v.category_slug
JOIN public.brands b ON b.slug = 'chikane'
ON CONFLICT (slug) DO NOTHING;

-- Variantes: jantes com tamanhos 18/19/20 polegadas; extras com entrada única.
INSERT INTO public.product_variants (product_id, name, sku, price_delta, stock_quantity, position, is_active)
SELECT p.id, v.name, v.sku, v.price_delta, 8, v.position, true
FROM (VALUES
  ('demo-config-jantes-fx',    '18"', 'CG-DEMO-JANTE-FX-18',  0::numeric,   1),
  ('demo-config-jantes-fx',    '19"', 'CG-DEMO-JANTE-FX-19',  300::numeric, 2),
  ('demo-config-jantes-fx',    '20"', 'CG-DEMO-JANTE-FX-20',  600::numeric, 3),
  ('demo-config-jantes-795m',  '18"', 'CG-DEMO-JANTE-795-18', 0::numeric,   1),
  ('demo-config-jantes-795m',  '19"', 'CG-DEMO-JANTE-795-19', 300::numeric, 2),
  ('demo-config-jantes-795m',  '20"', 'CG-DEMO-JANTE-795-20', 600::numeric, 3),
  ('demo-config-jantes-826m',  '18"', 'CG-DEMO-JANTE-826-18', 0::numeric,   1),
  ('demo-config-jantes-826m',  '19"', 'CG-DEMO-JANTE-826-19', 300::numeric, 2),
  ('demo-config-jantes-826m',  '20"', 'CG-DEMO-JANTE-826-20', 600::numeric, 3),
  ('demo-config-jantes-963m',  '18"', 'CG-DEMO-JANTE-963-18', 0::numeric,   1),
  ('demo-config-jantes-963m',  '19"', 'CG-DEMO-JANTE-963-19', 300::numeric, 2),
  ('demo-config-jantes-963m',  '20"', 'CG-DEMO-JANTE-963-20', 600::numeric, 3),
  ('demo-config-tapetes',      'Único', 'CG-DEMO-EXTRA-TAPETES',  0::numeric, 1),
  ('demo-config-bagageira',    'Único', 'CG-DEMO-EXTRA-BAGAGEIRA', 0::numeric, 1),
  ('demo-config-splitter',     'Único', 'CG-DEMO-EXTRA-SPLITTER',  0::numeric, 1),
  ('demo-config-escape',       'Único', 'CG-DEMO-EXTRA-ESCAPE',    0::numeric, 1),
  ('demo-config-iluminacao',   'Único', 'CG-DEMO-EXTRA-LUZ',       0::numeric, 1),
  ('demo-config-capas',        'Único', 'CG-DEMO-EXTRA-CAPAS',     0::numeric, 1)
) AS v(slug, name, sku, price_delta, position)
JOIN public.products p ON p.slug = v.slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_variants pv
  WHERE pv.product_id = p.id AND pv.name = v.name
);

-- Fotografias de teste (Wikimedia Commons / Unsplash).
INSERT INTO public.product_images (product_id, url, position, alt_text)
SELECT p.id, v.url, 1, v.alt_text
FROM (VALUES
  ('demo-config-jantes-fx',   'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Ferrari_599_HY_KERS_wheel.jpg/960px-Ferrari_599_HY_KERS_wheel.jpg', 'Jante de demonstração'),
  ('demo-config-jantes-795m', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Mini_Wheels_Close_Up_%282337994172%29.jpg/960px-Mini_Wheels_Close_Up_%282337994172%29.jpg', 'Jante de demonstração'),
  ('demo-config-jantes-826m', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Dirty_Porsche_Tire.jpg/960px-Dirty_Porsche_Tire.jpg', 'Jante de demonstração'),
  ('demo-config-jantes-963m', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/BMW_mule%2C_Berlin_%28P1032429%29.jpg/960px-BMW_mule%2C_Berlin_%28P1032429%29.jpg', 'Jante de demonstração'),
  ('demo-config-tapetes',     'https://images.unsplash.com/photo-1542362567-b07e54358753?w=900&q=80', 'Interior de demonstração'),
  ('demo-config-bagageira',   'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=900&q=80', 'Bagageira de demonstração'),
  ('demo-config-splitter',    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=900&q=80', 'Frente de viatura de demonstração'),
  ('demo-config-escape',      'https://images.unsplash.com/photo-1523983388277-336a66bf9bcd?w=900&q=80', 'Motor de demonstração'),
  ('demo-config-iluminacao',  'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=900&q=80', 'Iluminação de demonstração'),
  ('demo-config-capas',       'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=900&q=80', 'Bancos de demonstração')
) AS v(slug, url, alt_text)
JOIN public.products p ON p.slug = v.slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_images i
  WHERE i.product_id = p.id AND i.url = v.url
);

-- Compatibilidade ilustrativa com a BMW 520d do registo de demonstração.
INSERT INTO public.product_compatibility (product_id, brand, model, year_from, year_to, notes)
SELECT p.id, 'BMW', '520d', 2021, 2026, 'Compatibilidade ilustrativa (dados de demonstração); confirmar antes de publicar.'
FROM public.products p
WHERE p.slug LIKE 'demo-config-%'
  AND NOT EXISTS (
    SELECT 1 FROM public.product_compatibility pc
    WHERE pc.product_id = p.id AND pc.brand = 'BMW' AND pc.model = '520d'
  );

COMMIT;

-- Limpeza, quando já não precisares dos registos de teste (descomentar):
-- DELETE FROM public.vehicles WHERE slug = 'demo-bmw-520d-configurador';
-- DELETE FROM public.products WHERE slug LIKE 'demo-config-%';
