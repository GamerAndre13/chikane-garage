-- ============================================================
-- CHIKANE GARAGE — 014: Corrige a cópia da newsletter (C1)
-- - "Receba primeiro" → "Recebe primeiro" (imperativo correto em
--   pt-PT, consistente com o texto exibido na home)
-- Executa no SQL Editor do Supabase. Idempotente.
-- ============================================================

-- O texto da newsletter vive em site_content (section_key 'newsletter_heading')
UPDATE public.site_content
SET body = 'Recebe primeiro cada unidade que entra na garagem. Com fotografias e preço, 48 horas antes de ser publicada.'
WHERE section_key = 'newsletter_heading'
  AND body ILIKE 'Receba primeiro%';

-- Por garantia, corrige também uma eventual cópia em site_settings
UPDATE public.site_settings
SET value = 'Recebe primeiro cada unidade que entra na garagem. Com fotografias e preço, 48 horas antes de ser publicada.'
WHERE key = 'newsletter_heading'
  AND value ILIKE 'Receba primeiro%';