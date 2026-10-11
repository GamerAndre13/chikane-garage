-- ============================================================
-- CHIKANE GARAGE — 017: Vendas com data (sold_at)
-- - Garante a coluna vehicles.sold_at: só aparecem publicamente
--   as viaturas vendidas há menos de 7 dias
-- - A data é preenchida no back office (formulário "Data de venda")
--   e também ao marcar "Vendida" na lista de viaturas
-- Executa no SQL Editor do Supabase. Idempotente.
-- ============================================================

ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS sold_at TIMESTAMPTZ;

SELECT '✅ 017: Venda com data (sold_at) garantido.' AS resultado;