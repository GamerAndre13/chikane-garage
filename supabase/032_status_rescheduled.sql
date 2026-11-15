-- ------------------------------------------------------------
-- 032 — Estado "rescheduled" nos test drives
-- ------------------------------------------------------------
-- A migração 031 acrescentou proposed_date/respond_token/responded_at, mas a
-- constraint test_drives_status_check continuava a aceitar apenas
-- pending/confirmed/completed/cancelled/rejected. Sem "rescheduled", o botão
-- «Propor data» do back office falhava com um erro de constraint.
--
-- Idempotente: pode ser executado mais do que uma vez.

ALTER TABLE public.test_drives DROP CONSTRAINT IF EXISTS test_drives_status_check;
ALTER TABLE public.test_drives
  ADD CONSTRAINT test_drives_status_check
  CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'rejected', 'rescheduled'));
