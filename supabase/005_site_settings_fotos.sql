-- ============================================================
-- CHIKANE GARAGE — 005: Fotos das páginas editáveis no backoffice
-- 4 colunas novas em site_settings (home + sobre), lidas pelo site
-- quando não estão vazias (vazio = imagem por omissão atual).
-- Executa no SQL Editor do Supabase. Idempotente (pode correr 2×).
-- ============================================================

ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS photo_home_hero TEXT DEFAULT '';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS photo_home_history TEXT DEFAULT '';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS photo_about_hero TEXT DEFAULT '';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS photo_about_garage TEXT DEFAULT '';

SELECT '✅ Fotos do site prontas para o backoffice.' AS resultado;
