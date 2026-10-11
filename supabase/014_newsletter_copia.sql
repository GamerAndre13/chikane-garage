-- ============================================================
-- CHIKANE GARAGE — 014: Corrige a cópia da newsletter (C1)
-- - "Receba primeiro" → "Recebe primeiro" (imperativo correto em pt-PT)
-- Executa no SQL Editor do Supabase. Idempotente.
-- ============================================================

-- O texto da newsletter vive em site_content (section_key 'newsletter_heading').
-- (Uma versão anterior tentava também atualizar site_settings com a coluna
-- "key", que não existe — o texto da newsletter só vive em site_content.)
UPDATE public.site_content
SET body = 'Recebe primeiro cada unidade que entra na garagem. Com fotografias e preço, 48 horas antes de ser publicada.'
WHERE section_key = 'newsletter_heading'
  AND body ILIKE 'Receba primeiro%';

SELECT '✅ 014: Cópia da newsletter corrigida.' AS resultado;