-- Dados de demonstração para o catálogo de viaturas novas e acessórios.
-- Executar no SQL Editor depois de supabase/setup.sql.
-- Seguro para repetir: os registos usam slugs fixos e verificações de existência.

BEGIN;

INSERT INTO public.vehicles (
  slug, brand, model, trim, registration_year, status, engine, transmission,
  fuel_type, body_style, mileage_km, origin, origin_country, price,
  cover_image_url, description, is_featured, condition, sale_type,
  brand_warranty_months, delivery_estimate_days, config_summary
)
VALUES
  (
    'demo-bmw-m3-touring-novo', 'BMW', 'M3 Touring', 'Configuração de demonstração', 2026,
    'available', '', 'automatic', 'gasoline', 'touring', 0, 'imported', 'DE', NULL,
    '', 'Registo de demonstração para pré-visualizar o catálogo. Não representa uma viatura disponível para venda. Substituir por uma viatura real antes de anunciar.',
    false, 'new', 'stock', 24, NULL, 'Exemplo de configuração BMW M3 Touring. Confirmar versão, equipamento, garantia e preço com a Chikane Garage.'
  ),
  (
    'demo-audi-rs6-avant-novo', 'Audi', 'RS6 Avant', 'Configuração de demonstração', 2026,
    'available', '', 'automatic', 'gasoline', 'touring', 0, 'imported', 'DE', NULL,
    '', 'Registo de demonstração para pré-visualizar o catálogo. Não representa uma viatura disponível para venda. Substituir por uma viatura real antes de anunciar.',
    false, 'new', 'on_order', 24, 90, 'Exemplo de configuração Audi RS6 Avant por encomenda. Confirmar versão, equipamento, garantia e prazo com a Chikane Garage.'
  )
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.products (
  slug, category_id, brand_id, name, short_description, description,
  price, vat_rate, weight_grams, sku, status, stock_mode, is_featured, is_new
)
SELECT v.slug, c.id, b.id, v.name, v.short_description, v.description,
       v.price, 23, v.weight_grams, v.sku, 'active', 'managed', false, true
FROM (VALUES
  (
    'demo-tapetes-bmw-m3', 'Tapetes à medida BMW M3 Touring (Demonstração)',
    'Exemplo de acessório associado à viatura BMW M3 Touring.',
    'Artigo de demonstração para apresentar a compatibilidade entre acessórios e viaturas. Compatibilidade a confirmar pelo fabricante. Sem stock e indisponível para compra até ser substituído por um artigo real.',
    89.90::numeric, 5200, 'CG-DEMO-BMW-001'
  ),
  (
    'demo-protecao-bagageira-audi-rs6', 'Proteção de bagageira Audi RS6 Avant (Demonstração)',
    'Exemplo de acessório associado à viatura Audi RS6 Avant.',
    'Artigo de demonstração para apresentar a compatibilidade entre acessórios e viaturas. Compatibilidade a confirmar pelo fabricante. Sem stock e indisponível para compra até ser substituído por um artigo real.',
    74.90::numeric, 3100, 'CG-DEMO-AUDI-001'
  )
) AS v(slug, name, short_description, description, price, weight_grams, sku)
JOIN public.product_categories c ON c.slug = 'extras-e-acessorios'
JOIN public.brands b ON b.slug = 'chikane'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.product_variants (product_id, name, sku, stock_quantity, position, is_active)
SELECT p.id, 'Único', p.sku, 0, 1, true
FROM public.products p
WHERE p.slug IN ('demo-tapetes-bmw-m3', 'demo-protecao-bagageira-audi-rs6')
  AND NOT EXISTS (
    SELECT 1 FROM public.product_variants pv
    WHERE pv.product_id = p.id AND pv.name = 'Único'
  );

INSERT INTO public.product_images (product_id, url, position, alt_text)
SELECT p.id, v.url, 1, v.alt_text
FROM (VALUES
  ('demo-tapetes-bmw-m3', '/loja/acessorio-bmw.svg', 'Tapetes BMW M3 Touring — imagem ilustrativa de demonstração'),
  ('demo-protecao-bagageira-audi-rs6', '/loja/acessorio-audi.svg', 'Proteção de bagageira Audi RS6 Avant — imagem ilustrativa de demonstração')
) AS v(slug, url, alt_text)
JOIN public.products p ON p.slug = v.slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_images i WHERE i.product_id = p.id AND i.url = v.url
);

INSERT INTO public.product_compatibility (product_id, brand, model, year_from, year_to, notes)
SELECT p.id, v.brand, v.model, v.year_from, v.year_to, v.notes
FROM (VALUES
  ('demo-tapetes-bmw-m3', 'BMW', 'M3 Touring', 2025, 2026, 'Compatibilidade ilustrativa; confirmar a geração e as medidas antes de publicar o artigo.'),
  ('demo-protecao-bagageira-audi-rs6', 'Audi', 'RS6 Avant', 2025, 2026, 'Compatibilidade ilustrativa; confirmar a geração e as medidas antes de publicar o artigo.')
) AS v(slug, brand, model, year_from, year_to, notes)
JOIN public.products p ON p.slug = v.slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_compatibility pc
  WHERE pc.product_id = p.id AND pc.brand = v.brand AND pc.model = v.model
    AND pc.year_from = v.year_from AND pc.year_to = v.year_to
);

COMMIT;
