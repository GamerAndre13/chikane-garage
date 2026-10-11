-- ============================================================
-- CHIKANE GARAGE — 015: Cópia da home (hero e história)
-- - Remove o "Delivered." do slogan do hero: fica
--   "Precision. Perfected. Passion." (ponto final incluído)
-- - A história da home passa a falar na 1.ª pessoa (nós), como
--   o resto do site, em vez de falar da equipa na 3.ª pessoa
-- Executa no SQL Editor do Supabase. Idempotente.
-- ============================================================

-- 1) Slogan do hero sem "Delivered." (aceita ambas as convenções de chave)
UPDATE public.site_content
SET body = TRIM(REGEXP_REPLACE(body, '(?i)\s*Delivered\.?$', ''))
WHERE section_key IN ('hero.slogan', 'hero_slogan')
  AND body ILIKE '%delivered%';

-- 2) Texto da história na home (chave usada pelo home: garage.text)
INSERT INTO public.site_content (section_key, title, subtitle, body, link_url, link_text) VALUES
  ('garage.text', 'A História (texto da home)', '', 'Compramos cada viatura como se fosse para a nossa própria coleção: histórico verificado, mecânica e estética inspecionadas ao detalhe, sempre com a garantia Chikane. Fala connosco para confirmar a disponibilidade e as condições.', '', '')
ON CONFLICT (section_key) DO UPDATE SET
  subtitle = EXCLUDED.subtitle,
  body = EXCLUDED.body;

-- 3) Mesmo texto com a chave alternativa (garage_text)
INSERT INTO public.site_content (section_key, title, subtitle, body, link_url, link_text) VALUES
  ('garage_text', 'A História (texto da home)', '', 'Compramos cada viatura como se fosse para a nossa própria coleção: histórico verificado, mecânica e estética inspecionadas ao detalhe, sempre com a garantia Chikane. Fala connosco para confirmar a disponibilidade e as condições.', '', '')
ON CONFLICT (section_key) DO UPDATE SET
  subtitle = EXCLUDED.subtitle,
  body = EXCLUDED.body;