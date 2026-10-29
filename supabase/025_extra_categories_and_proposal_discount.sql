-- ============================================================
-- MIGRAÇÃO 025: CATEGORIA NOS EXTRAS E DESCONTO NAS PROPOSTAS
-- ============================================================
-- 1. Cada extra do catálogo passa a ter uma categoria. Na página
--    /comprar/<slug> os extras aparecem agrupados por categoria e
--    dentro de cada categoria só se escolhe uma opção. Extras sem
--    categoria continuam a poder ser escolhidos em conjunto.
-- 2. As propostas passam a guardar o desconto aplicado pelo
--    backoffice e o preço final da proposta.
-- Idempotente: pode ser re-executado sem efeitos secundários.
-- ============================================================

-- ------------------------------------------------------------
-- 1. CATEGORIA NO CATÁLOGO DE EXTRAS
-- ------------------------------------------------------------
ALTER TABLE public.vehicle_extra_catalog
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT '';

-- Agrupamento por categoria na página de compra.
CREATE INDEX IF NOT EXISTS idx_vehicle_extra_catalog_category
  ON public.vehicle_extra_catalog(category, position);

-- ------------------------------------------------------------
-- 2. DESCONTO E PREÇO FINAL DAS PROPOSTAS
-- ------------------------------------------------------------
-- discount     — valor do desconto em euros, definido no backoffice
-- final_price  — total a apresentar ao cliente (total - desconto);
--                NULL enquanto o backoffice não fechar o valor
ALTER TABLE public.sale_proposals
  ADD COLUMN IF NOT EXISTS discount NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.sale_proposals
  ADD COLUMN IF NOT EXISTS final_price NUMERIC(12,2);

-- ------------------------------------------------------------
-- 3. RECARREGAR O ESQUEMA
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

SELECT '✅ MIGRAÇÃO 025 CONCLUÍDA - categoria nos extras e desconto nas propostas' AS resultado;
