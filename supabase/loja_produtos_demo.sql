-- Produtos temporários para pré-visualizar a loja.
-- Executar depois de supabase/setup.sql no SQL Editor do Supabase.
-- São visíveis no catálogo, mas têm stock zero para não permitirem compras.

BEGIN;

INSERT INTO public.products (
  slug, category_id, brand_id, name, short_description, description,
  price, vat_rate, weight_grams, sku, status, stock_mode, is_featured, is_new
)
SELECT v.slug, c.id, b.id, v.name, v.short_description, v.description,
       v.price, 23, v.weight_grams, v.sku, 'active', 'managed', v.is_featured, true
FROM (VALUES
  (
    'demo-kit-detailing', 'Kit de Detailing (Demonstração)', 'Um exemplo de artigo para veres a apresentação da loja.',
    E'Artigo de demonstração. Substitui o nome, a descrição, as fotografias e o preço antes de abrir a loja.\n\nEste artigo está sem stock e não pode ser comprado.',
    39.90::numeric, 1200, 'CG-DEMO-001', 'detailing-e-limpeza', true, '/loja/kit-detailing.svg', 'Kit de Detailing Chikane Garage — demonstração'
  ),
  (
    'demo-pano-microfibra', 'Pano de Microfibra (Demonstração)', 'Um exemplo de artigo para veres a apresentação da loja.',
    E'Artigo de demonstração. Substitui o nome, a descrição, as fotografias e o preço antes de abrir a loja.\n\nEste artigo está sem stock e não pode ser comprado.',
    9.90::numeric, 200, 'CG-DEMO-002', 'detailing-e-limpeza', false, '/loja/pano-microfibra.svg', 'Pano de Microfibra Chikane Garage — demonstração'
  ),
  (
    'demo-porta-chaves', 'Porta-chaves (Demonstração)', 'Um exemplo de artigo para veres a apresentação da loja.',
    E'Artigo de demonstração. Substitui o nome, a descrição, as fotografias e o preço antes de abrir a loja.\n\nEste artigo está sem stock e não pode ser comprado.',
    6.90::numeric, 80, 'CG-DEMO-003', 'merch-e-presentes', false, '/loja/porta-chaves.svg', 'Porta-chaves Chikane Garage — demonstração'
  )
) AS v(slug, name, short_description, description, price, weight_grams, sku, category_slug, is_featured, image_url, image_alt)
JOIN public.product_categories c ON c.slug = v.category_slug
JOIN public.brands b ON b.slug = 'chikane'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.product_variants (product_id, name, sku, stock_quantity, position, is_active)
SELECT p.id, 'Único', p.sku, 0, 1, true
FROM public.products p
WHERE p.slug IN ('demo-kit-detailing', 'demo-pano-microfibra', 'demo-porta-chaves')
  AND NOT EXISTS (
    SELECT 1 FROM public.product_variants pv
    WHERE pv.product_id = p.id AND pv.name = 'Único'
  );

INSERT INTO public.product_images (product_id, url, position, alt_text)
SELECT p.id, v.image_url, 1, v.image_alt
FROM (VALUES
  ('demo-kit-detailing', '/loja/kit-detailing.svg', 'Kit de Detailing Chikane Garage — demonstração'),
  ('demo-pano-microfibra', '/loja/pano-microfibra.svg', 'Pano de Microfibra Chikane Garage — demonstração'),
  ('demo-porta-chaves', '/loja/porta-chaves.svg', 'Porta-chaves Chikane Garage — demonstração')
) AS v(slug, image_url, image_alt)
JOIN public.products p ON p.slug = v.slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_images i
  WHERE i.product_id = p.id AND i.url = v.image_url
);

COMMIT;
