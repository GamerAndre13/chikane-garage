-- ------------------------------------------------------------
-- 034 — Proposta final: extras editáveis, legalização e envio
-- ------------------------------------------------------------
-- Na ficha da proposta, o backoffice passa a poder:
--   1. acrescentar ou remover extras;
--   2. indicar o valor da legalização;
--   3. enviar a proposta final ao cliente, já com todos os valores
--      (base + extras − desconto + legalização).
--
-- Idempotente: pode ser executado mais do que uma vez.

-- ------------------------------------------------------------
-- 1. Valores da proposta final
-- ------------------------------------------------------------
ALTER TABLE public.sale_proposals
  ADD COLUMN IF NOT EXISTS legalization_fee NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Data/hora do último envio da proposta final ao cliente.
ALTER TABLE public.sale_proposals
  ADD COLUMN IF NOT EXISTS final_sent_at TIMESTAMPTZ;

-- ------------------------------------------------------------
-- 2. Novo estado: proposta final enviada
-- ------------------------------------------------------------
ALTER TABLE public.sale_proposals DROP CONSTRAINT IF EXISTS sale_proposals_status_check;
ALTER TABLE public.sale_proposals
  ADD CONSTRAINT sale_proposals_status_check
  CHECK (status IN ('pending', 'contacted', 'in_progress', 'proposal_sent', 'closed_won', 'closed_lost'));

-- ------------------------------------------------------------
-- 3. Recarregar o esquema
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

SELECT '✅ MIGRAÇÃO 034 CONCLUÍDA - proposta final com legalização e envio' AS resultado;
