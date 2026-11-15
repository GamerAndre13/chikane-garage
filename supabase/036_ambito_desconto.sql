-- ------------------------------------------------------------
-- 036 — Âmbito do desconto na proposta
-- ------------------------------------------------------------
-- Até aqui o desconto abatia sempre ao total (viatura + extras). O backoffice
-- passa a poder escolher onde incide:
--   total   — abate ao total da proposta (comportamento anterior, omissão);
--   extras  — abate apenas ao valor dos extras;
--   vehicle — abate apenas ao preço da viatura.
--
-- O valor do desconto continua em sale_proposals.discount e o total final em
-- final_price (recalculado no backoffice). Idempotente: pode ser executado
-- mais do que uma vez.

ALTER TABLE public.sale_proposals
  ADD COLUMN IF NOT EXISTS discount_scope TEXT NOT NULL DEFAULT 'total';

ALTER TABLE public.sale_proposals DROP CONSTRAINT IF EXISTS sale_proposals_discount_scope_check;
ALTER TABLE public.sale_proposals
  ADD CONSTRAINT sale_proposals_discount_scope_check
  CHECK (discount_scope IN ('total', 'extras', 'vehicle'));

NOTIFY pgrst, 'reload schema';

SELECT '✅ MIGRAÇÃO 036 CONCLUÍDA - âmbito do desconto na proposta' AS resultado;
