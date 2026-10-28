-- ============================================================
-- MIGRAÇÃO 024: FOTOGRAFIA EM CADA EXTRA DO CATÁLOGO
-- ============================================================
-- Os extras configuráveis passam a poder ter uma fotografia, mostrada
-- no configurador da viatura nova e na lista de extras do backoffice.
-- Idempotente: pode ser re-executado sem efeitos secundários.
-- ============================================================

ALTER TABLE public.vehicle_extra_catalog
  ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT '';

-- As políticas de RLS da tabela (criadas na migração 022) cobrem
-- automaticamente a nova coluna — não é preciso mexer em permissões.
