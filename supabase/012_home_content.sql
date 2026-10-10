-- ============================================================
-- CHIKANE GARAGE — 012: Conteúdo do Home (textos novos)
-- - Garante as linhas canónicas do hero com as chaves usadas
--   pelo home (hero.tagline / hero.slogan / hero.intro)
-- - O home lê a coluna body: os textos vão em BODY, o título é
--   apenas uma etiqueta de identificação no CMS
-- Executa no SQL Editor do Supabase. Idempotente.
-- ============================================================

INSERT INTO public.site_content (section_key, title, subtitle, body, link_url, link_text, sort_order) VALUES
  ('hero.tagline', 'Frase de destaque (hero)', '', 'Seleção rigorosa · Garantia garantida', '', '', 1),
  ('hero.slogan', 'Slogan (hero)', '', 'Precision. Perfected. Passion Delivered.', '', '', 2),
  ('hero.intro', 'Introdução do hero', '', 'Uma garagem privada de performance. Cada unidade escolhida à mão, inspecionada ao detalhe e entregue com garantia Chikane — para quem vive a estrada com paixão.', '', '', 3)
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  body = EXCLUDED.body;